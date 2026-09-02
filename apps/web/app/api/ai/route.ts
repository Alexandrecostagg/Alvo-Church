import { NextRequest, NextResponse } from "next/server";
import {
  generateCellScript,
  generateCellDynamic,
  generateCellMeetingSummary,
  generateAbsenceMessage,
  generateCareReply,
  generatePastoralSuggestion,
  classifyTribe,
  type CellScriptInput,
  type CellDynamicInput,
  type CellMeetingSummaryInput,
  type AbsenceMessageInput,
  type CareReplyInput,
  type PastoralSuggestionInput,
  type TribeClassifyInput
} from "@alvo/ai";
import { PLAN_LIMITS, planTierToPlanId, type PlanId } from "@alvo/firebase";
import { verifyFirebaseIdToken } from "../_lib/verify-auth";

type AiTask =
  | "cell_script"
  | "cell_dynamic"
  | "cell_meeting_summary"
  | "absence_message"
  | "care_reply"
  | "pastoral_suggestion"
  | "tribe_classify";

function projectId() {
  return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "alvo-church";
}

function firestoreDocUrl(path: string) {
  return `https://firestore.googleapis.com/v1/projects/${projectId()}/databases/(default)/documents/${path}`;
}

function currentAiMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Tarefas restritas a liderança pastoral — mesmo em org no plano certo,
// um membro comum não deve conseguir chamar isso direto pela API (a tela
// já tem RoleGuard, mas a API precisa aplicar a mesma regra por conta própria,
// já que quem chama pode ser o app mobile ou uma chamada manual).
const PASTORAL_ONLY_TASKS = new Set<AiTask>(["pastoral_suggestion"]);
const PASTORAL_ROLES = ["super_admin", "church_admin", "pastor"];

async function hasPastoralRole(idToken: string, organizationId: string, uid: string): Promise<boolean> {
  const res = await fetch(
    firestoreDocUrl(`organizations/${organizationId}/users/${uid}`),
    { headers: { Authorization: `Bearer ${idToken}` }, signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) return false;
  const data = (await res.json()) as {
    fields?: { roles?: { arrayValue?: { values?: Array<{ stringValue?: string }> } }; isActive?: { booleanValue?: boolean } };
  };
  const roles = data.fields?.roles?.arrayValue?.values?.map((v) => v.stringValue) ?? [];
  const isActive = data.fields?.isActive?.booleanValue ?? false;
  return isActive && roles.some((r) => PASTORAL_ROLES.includes(r ?? ""));
}

// Cota de IA é por organização, avaliada com o próprio ID token de quem
// chamou — respeita as Firestore rules normais (settings/aiUsage exigem
// isTenantMember), sem precisar de service account aqui.
//
// As duas leituras (subscription e aiUsage) são independentes e rodam em
// paralelo. O incremento NÃO acontece aqui: quem chama recebe `consume()`
// e dispara o registro em paralelo com a geração do LLM, tirando a escrita
// do caminho crítico da resposta.
async function checkAiQuota(
  idToken: string,
  organizationId: string
): Promise<{ allowed: boolean; plan: PlanId; used: number; limit: number; consume: () => Promise<void> }> {
  const headers = { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" };
  const month = currentAiMonth();

  const [subRes, usageRes] = await Promise.all([
    fetch(firestoreDocUrl(`organizations/${organizationId}/settings/subscription`), {
      headers,
      signal: AbortSignal.timeout(8000)
    }),
    fetch(firestoreDocUrl(`organizations/${organizationId}/aiUsage/${month}`), {
      headers,
      signal: AbortSignal.timeout(8000)
    })
  ]);

  let plan: PlanId = "free";
  if (subRes.ok) {
    const subData = (await subRes.json()) as {
      fields?: { plan?: { stringValue?: string }; planTier?: { stringValue?: string } };
    };
    const explicitPlan = subData.fields?.plan?.stringValue as PlanId | undefined;
    plan = explicitPlan ?? planTierToPlanId(subData.fields?.planTier?.stringValue as any);
  }

  const limit = PLAN_LIMITS[plan].aiQueriesPerMonth;
  const used = usageRes.ok
    ? Number((((await usageRes.json()) as { fields?: { count?: { integerValue?: string } } }).fields?.count?.integerValue) ?? 0)
    : 0;

  if (used >= limit) {
    return { allowed: false, plan, used, limit, consume: async () => {} };
  }

  // Incrementa de forma otimista (lê + grava; não é uma transação atômica,
  // mas o volume de chamadas simultâneas por organização é baixo o
  // suficiente pra essa margem de erro ser aceitável aqui).
  const consume = async () => {
    await fetch(`${firestoreDocUrl(`organizations/${organizationId}/aiUsage/${month}`)}?updateMask.fieldPaths=count&updateMask.fieldPaths=updatedAt`, {
      method: "PATCH",
      headers,
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        fields: {
          count: { integerValue: String(used + 1) },
          updatedAt: { stringValue: new Date().toISOString() }
        }
      })
    }).catch(() => {
      // Falha ao registrar o uso não deve impedir a resposta já gerada —
      // na pior hipótese a cota fica levemente subcontada neste mês.
    });
  };

  return { allowed: true, plan, used: used + 1, limit, consume };
}

export async function POST(req: NextRequest) {
  const authorization = req.headers.get("authorization") ?? "";
  const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const uid = await verifyFirebaseIdToken(req);
  if (!uid || !idToken) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // Cascata de provedores: DeepSeek (principal) → Groq (fallback). Basta uma
  // das chaves estar configurada. A troca de provedor acontece no @alvo/ai.
  const keys = {
    deepseekApiKey: process.env.DEEPSEEK_API_KEY,
    groqApiKey: process.env.GROQ_API_KEY
  };
  if (!keys.deepseekApiKey && !keys.groqApiKey) {
    return NextResponse.json({ error: "Nenhuma API de IA configurada (DEEPSEEK_API_KEY/GROQ_API_KEY)." }, { status: 500 });
  }

  let body: { task: AiTask; input: unknown; organizationId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { task, input, organizationId } = body;
  if (!organizationId) {
    return NextResponse.json({ error: "organizationId é obrigatório" }, { status: 400 });
  }

  // O organizationId fornecido pelo cliente pode ser inventado — o usuário
  // autenticado pode tentar acessar IA de outra organização. Verifica, via
  // Firestore Rules (mesmo idToken), que o uid é membro ativo da org.
  async function isOrgMember(orgId: string, uid: string): Promise<boolean> {
    const res = await fetch(
      firestoreDocUrl(`organizations/${orgId}/users/${uid}`),
      { headers: { Authorization: `Bearer ${idToken}` }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return false;
    const data = (await res.json()) as {
      fields?: { isActive?: { booleanValue?: boolean } };
    };
    return data.fields?.isActive?.booleanValue === true;
  }

  const orgMember = await isOrgMember(organizationId, uid);
  if (!orgMember) {
    return NextResponse.json(
      { error: "Usuário não é membro desta organização." },
      { status: 403 }
    );
  }

  // Checagem de role (só para tarefas pastorais) e leituras de cota são
  // independentes — rodam em paralelo. Nenhuma tem efeito colateral, então
  // é seguro dispará-las juntas mesmo que uma delas negue o acesso.
  const [pastoralAllowed, quota] = await Promise.all([
    PASTORAL_ONLY_TASKS.has(task) ? hasPastoralRole(idToken, organizationId, uid) : Promise.resolve(true),
    checkAiQuota(idToken, organizationId)
  ]);

  if (!pastoralAllowed) {
    return NextResponse.json(
      { error: "Este recurso é restrito à liderança pastoral da organização." },
      { status: 403 }
    );
  }

  if (!quota.allowed) {
    return NextResponse.json(
      { error: `Cota de IA do mês esgotada (${quota.used}/${quota.limit} consultas no plano atual). Faça upgrade em Configurações → Plano.` },
      { status: 429 }
    );
  }

  try {
    // O registro de consumo roda em paralelo com a geração — a escrita no
    // Firestore não bloqueia o início da chamada ao LLM nem a resposta.
    const consumePromise = quota.consume();

    let result;

    switch (task) {
      case "cell_script":
        result = await generateCellScript(keys, input as CellScriptInput);
        break;
      case "cell_dynamic":
        result = await generateCellDynamic(keys, input as CellDynamicInput);
        break;
      case "cell_meeting_summary":
        result = await generateCellMeetingSummary(keys, input as CellMeetingSummaryInput);
        break;
      case "absence_message":
        result = await generateAbsenceMessage(keys, input as AbsenceMessageInput);
        break;
      case "care_reply":
        result = await generateCareReply(keys, input as CareReplyInput);
        break;
      case "pastoral_suggestion":
        result = await generatePastoralSuggestion(keys, input as PastoralSuggestionInput);
        break;
      case "tribe_classify":
        result = await classifyTribe(keys, input as TribeClassifyInput);
        break;
      default:
        await consumePromise;
        return NextResponse.json({ error: `Tarefa desconhecida: ${task}` }, { status: 400 });
    }

    await consumePromise;
    return NextResponse.json({ ok: true, content: result.content, model: result.model });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
export const runtime = 'edge';
