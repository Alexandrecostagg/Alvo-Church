import { NextRequest, NextResponse } from "next/server";
import { callChatWithFallback, callGroq, type AiMessage } from "@alvo/ai";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";
import {
  AccountError,
  accountTransaction,
} from "../../_lib/member-account-store";
import { boundedJson, privateHeaders } from "../../_lib/kids-media";
import { financeActor, textField } from "../../_lib/finance-operations";
import { assertModuleEnabled } from "../../_lib/module-access";
import { aiGate, completeAi } from "../../_lib/ai-quota";
import {
  CAMPAIGN_TONES,
  campaignCopyFeedback,
  campaignCopyMessages,
  parseCampaignCopy,
  type CampaignCopyInput,
} from "../../../../src/features/campaigns/campaign-copy-contract";
import { documentId } from "../../_lib/member-account";
export async function POST(req: NextRequest) {
  let ticket: { auditId: string; used: number } | undefined,
    org = "";
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    const body = await boundedJson(req, 4096);
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new AccountError(400, "Solicitação inválida.");
    org = documentId(body.organizationId, "Instituição");
    await accountTransaction(async (tx) => {
      const { root } = await financeActor(tx, org, uid, true, null);
      await assertModuleEnabled(tx, root, "events");
    });
    const keys = {
      geminiApiKey: process.env.GEMINI_API_KEY,
      geminiModel: process.env.GEMINI_MODEL,
      groqApiKey: process.env.GROQ_API_KEY,
    };
    if (body.action === "status") {
      try {
        const q = await aiGate(org, uid, "campaign_sequence", false);
        return NextResponse.json(
          {
            available: !!(keys.geminiApiKey || keys.groqApiKey),
            used: q.used,
            limit: q.limit,
            reason:
              keys.geminiApiKey || keys.groqApiKey
                ? ""
                : "A Sabedoria Pastoral ainda não está configurada.",
          },
          { headers: privateHeaders },
        );
      } catch (e) {
        if (e instanceof AccountError)
          return NextResponse.json(
            { available: false, reason: e.message },
            { headers: privateHeaders },
          );
        throw e;
      }
    }
    if (body.action !== "generate")
      throw new AccountError(400, "Ação inválida.");
    const objective = textField(body.objective, "Objetivo da sequência", 1000);
    if (
      !CAMPAIGN_TONES.includes(body.tone) ||
      !Array.isArray(body.offsets) ||
      body.offsets.length < 1 ||
      body.offsets.length > 15 ||
      body.offsets.some(
        (n: any, i: number) =>
          !Number.isInteger(n) ||
          n < 1 ||
          n > 90 ||
          (i > 0 && n >= body.offsets[i - 1]),
      )
    )
      throw new AccountError(400, "Confira o tom e o calendário.");
    const input: CampaignCopyInput = {
      objective,
      tone: body.tone,
      offsets: body.offsets,
    };
    await aiGate(org, uid, "campaign_sequence", false);
    if (!keys.geminiApiKey && !keys.groqApiKey)
      throw new AccountError(
        503,
        "A Sabedoria Pastoral ainda não está configurada. Você pode editar as sugestões manuais.",
      );
    ticket = await aiGate(org, uid, "campaign_sequence");
    let steps;
    let phase = "provider";
    try {
      const messages = campaignCopyMessages(input);
      const options = {
        jsonMode: true,
        temperature: 0.65,
        maxTokens: Math.min(6500, 650 + input.offsets.length * 400),
      };
      let result = await callChatWithFallback(keys, messages, options);
      phase = "validation";
      try {
        steps = parseCampaignCopy(result.content, input);
      } catch (validationError) {
        phase = "provider";
        const repairMessages: AiMessage[] = [
          ...messages,
          { role: "assistant", content: result.content },
          {
            role: "user",
            content: `Problema detectado: ${campaignCopyFeedback(validationError)} Revise o JSON anterior uma única vez: siga exatamente a quantidade, a ordem e os assuntos de outline. Cada texto central deve ser diferente, com até 450 caracteres. Não repita a confirmação nas versões de quem já vai: escreva sobre o foco específico. Não inclua saudações, nomes nem SAIR; o aplicativo acrescenta. Remova qualquer referência a QR, escaneamento, impressão ou reenvio: o aplicativo acrescentará a orientação operacional. Não invente informação. Retorne apenas o objeto JSON completo corrigido.`,
          },
        ];
        // A single repair uses the existing larger model when configured;
        // repeating the small model produced the same duplicate texts in QA.
        result = keys.groqApiKey
          ? await callGroq(keys.groqApiKey, repairMessages, {
              ...options,
              temperature: 0.35,
              model: "llama-3.3-70b-versatile",
            })
          : await callChatWithFallback(keys, repairMessages, {
              ...options,
              temperature: 0.35,
            });
        phase = "validation";
        steps = parseCampaignCopy(result.content, input);
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : "";
      console.warn(
        `[campaign-copy] ${phase}: ${/^(Groq|Gemini) HTTP \d{3}$/.test(reason) ? reason : campaignCopyFeedback(error)}`,
      );
      throw new AccountError(
        502,
        "A IA não entregou uma sequência válida e variada. Seus textos foram preservados. Revise manualmente ou tente novamente; a tentativa iniciada permanece na cota.",
      );
    }
    await completeAi(org, ticket.auditId, "completed");
    return NextResponse.json(
      { steps, used: ticket.used, requiresReview: true },
      { headers: privateHeaders },
    );
  } catch (e) {
    if (ticket) await completeAi(org, ticket.auditId, "failed").catch(() => {});
    return NextResponse.json(
      {
        error:
          e instanceof AccountError
            ? e.message
            : "Não foi possível gerar a sequência. Seus textos foram preservados.",
      },
      {
        status: e instanceof AccountError ? e.status : 503,
        headers: privateHeaders,
      },
    );
  }
}
