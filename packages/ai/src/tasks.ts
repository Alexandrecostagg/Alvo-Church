import { callChatWithFallback, type AiKeys, type AiResponse } from "./fallback";

const SYSTEM_BASE = `Você é um assistente pastoral da plataforma Plataforma Esdras.
Responda sempre em português brasileiro.
Seja prático, acolhedor e alinhado com valores cristãos evangélicos.
Nunca invente dados. Quando não souber, diga claramente.`;

// ─── 1. Roteiro de Célula ──────────────────────────────────────────────────

export interface CellScriptInput {
  theme: string;
  bibleVerse?: string;
  groupProfile?: string; // ex: "jovens adultos, 18-30 anos, grupo misto"
  duration?: number; // minutos, padrão 90
}

export async function generateCellScript(
  keys: AiKeys,
  input: CellScriptInput,
): Promise<AiResponse> {
  const duration = input.duration ?? 90;
  const messages = [
    { role: "system" as const, content: SYSTEM_BASE },
    {
      role: "user" as const,
      content: `Crie um roteiro completo para um encontro de célula com os seguintes dados:

Tema: ${input.theme}
${input.bibleVerse ? `Passagem bíblica: ${input.bibleVerse}` : ""}
${input.groupProfile ? `Perfil do grupo: ${input.groupProfile}` : ""}
Duração: ${duration} minutos

O roteiro deve ter exatamente estas seções:
1. ACOLHIMENTO (${Math.round(duration * 0.1)} min) — boas-vindas e oração de abertura
2. QUEBRA-GELO (${Math.round(duration * 0.1)} min) — dinâmica rápida e descontraída
3. PALAVRA (${Math.round(duration * 0.35)} min) — estudo bíblico com perguntas de discussão (mínimo 3 perguntas)
4. APLICAÇÃO (${Math.round(duration * 0.25)} min) — como aplicar na semana
5. ORAÇÃO E COMUNHÃO (${Math.round(duration * 0.2)} min) — partilha de pedidos e encerramento

Seja específico e prático. O líder deve conseguir conduzir sem improviso.`,
    },
  ];

  return callChatWithFallback(keys, messages, {
    maxTokens: 1500,
    temperature: 0.75,
  });
}

// ─── 2. Dinâmica do Encontro ───────────────────────────────────────────────

export interface CellDynamicInput {
  theme: string;
  groupProfile?: string;
  dynamicType?: "quebra-gelo" | "reflexão" | "comunhão" | "louvor" | "missão";
}

export async function generateCellDynamic(
  keys: AiKeys,
  input: CellDynamicInput,
): Promise<AiResponse> {
  const messages = [
    { role: "system" as const, content: SYSTEM_BASE },
    {
      role: "user" as const,
      content: `Crie uma dinâmica criativa para um encontro de célula.

Tema do encontro: ${input.theme}
${input.groupProfile ? `Perfil do grupo: ${input.groupProfile}` : ""}
${input.dynamicType ? `Tipo de dinâmica: ${input.dynamicType}` : ""}

Estruture assim:
NOME DA DINÂMICA:
OBJETIVO:
MATERIAIS NECESSÁRIOS:
PASSO A PASSO: (numere cada etapa)
COMO CONECTAR COM O TEMA:
DICA PARA O LÍDER:

Seja criativo, prático e adequado para um ambiente cristão.`,
    },
  ];

  return callChatWithFallback(keys, messages, {
    maxTokens: 800,
    temperature: 0.85,
  });
}

// ─── 3. Resumo Pós-Encontro ────────────────────────────────────────────────

export interface CellMeetingSummaryInput {
  groupName: string;
  date: string;
  theme: string;
  presentCount: number;
  absentMembers?: string[];
  visitors?: string[];
  prayerRequests?: string[];
  leaderNotes?: string;
}

export async function generateCellMeetingSummary(
  keys: AiKeys,
  input: CellMeetingSummaryInput,
): Promise<AiResponse> {
  const messages = [
    { role: "system" as const, content: SYSTEM_BASE },
    {
      role: "user" as const,
      content: `Gere um relatório pastoral conciso do encontro de célula abaixo para enviar ao pastor/supervisor.

Grupo: ${input.groupName}
Data: ${input.date}
Tema: ${input.theme}
Presentes: ${input.presentCount} pessoas
${input.absentMembers?.length ? `Ausentes: ${input.absentMembers.join(", ")}` : ""}
${input.visitors?.length ? `Visitantes: ${input.visitors.join(", ")}` : ""}
${input.prayerRequests?.length ? `Pedidos de oração: ${input.prayerRequests.join("; ")}` : ""}
${input.leaderNotes ? `Observações do líder: ${input.leaderNotes}` : ""}

O relatório deve ter:
- Resumo geral do encontro (2-3 linhas)
- Destaques e pontos de atenção
- Próximos passos sugeridos
- Pedidos de oração para o pastor acompanhar

Seja objetivo. Máximo 200 palavras.`,
    },
  ];

  return callChatWithFallback(keys, messages, {
    maxTokens: 600,
    temperature: 0.5,
  });
}

// ─── 4. Sugestão de Mensagem para Membro Ausente ──────────────────────────

export interface AbsenceMessageInput {
  memberName: string;
  groupName: string;
  weeksAbsent: number;
  lastSeenContext?: string;
}

export async function generateAbsenceMessage(
  keys: AiKeys,
  input: AbsenceMessageInput,
): Promise<AiResponse> {
  const messages = [
    { role: "system" as const, content: SYSTEM_BASE },
    {
      role: "user" as const,
      content: `Escreva uma mensagem de WhatsApp para um líder de célula enviar a um membro ausente.

Nome do membro: ${input.memberName}
Grupo: ${input.groupName}
Semanas sem aparecer: ${input.weeksAbsent}
${input.lastSeenContext ? `Contexto do último contato: ${input.lastSeenContext}` : ""}

A mensagem deve:
- Ser calorosa, não cobrativa
- Demonstrar que o membro foi notado e sentiu falta
- Abrir espaço para conversa sem pressionar
- Ter entre 3-5 linhas
- Ser natural, como de um amigo, não corporativa

Gere apenas o texto da mensagem, sem explicações adicionais.`,
    },
  ];

  return callChatWithFallback(keys, messages, {
    maxTokens: 300,
    temperature: 0.8,
  });
}

// ─── 4b. Resposta a Pedido de Cuidado/Oração ──────────────────────────────

export interface CareReplyInput {
  personName: string;
  request: string; // o pedido/mensagem que a pessoa enviou
  category?: string; // ex.: "oração", "aconselhamento", "visita"
}

export async function generateCareReply(
  keys: AiKeys,
  input: CareReplyInput,
): Promise<AiResponse> {
  const messages = [
    { role: "system" as const, content: SYSTEM_BASE },
    {
      role: "user" as const,
      content: `Escreva uma resposta de WhatsApp para a equipe pastoral enviar a alguém que pediu cuidado/oração.

Nome: ${input.personName}
${input.category ? `Tipo: ${input.category}` : ""}
Pedido: ${input.request}

A resposta deve:
- Ser acolhedora, empática e pessoal (use o primeiro nome)
- Reconhecer o pedido específico sem repeti-lo mecanicamente
- Transmitir que a igreja recebeu e vai acompanhar
- Ter entre 3-5 linhas, tom de amigo/pastor, não corporativo
- Não prometer o que não foi dito; nunca inventar dados

Gere apenas o texto da mensagem, sem explicações.`,
    },
  ];

  return callChatWithFallback(keys, messages, {
    maxTokens: 300,
    temperature: 0.8,
  });
}

// ─── 5. Sugestão de Ação Pastoral (Score baixo) ───────────────────────────

export interface PastoralSuggestionInput {
  memberName: string;
  engagementScore: number; // 0-100
  lastAttendance?: string;
  prayerRequests?: string[];
  notes?: string;
}

export async function generatePastoralSuggestion(
  keys: AiKeys,
  input: PastoralSuggestionInput,
): Promise<AiResponse> {
  const messages = [
    { role: "system" as const, content: SYSTEM_BASE },
    {
      role: "user" as const,
      content: `Analise o perfil de engajamento deste membro e sugira uma ação pastoral prioritária.

Membro: ${input.memberName}
Score de engajamento: ${input.engagementScore}/100
${input.lastAttendance ? `Última presença: ${input.lastAttendance}` : ""}
${input.prayerRequests?.length ? `Pedidos de oração recentes: ${input.prayerRequests.join("; ")}` : ""}
${input.notes ? `Observações: ${input.notes}` : ""}

Responda com:
DIAGNÓSTICO: (1 linha — o que o score indica)
AÇÃO SUGERIDA: (seja específico: ligação, visita, mensagem, célula especial?)
URGÊNCIA: (alta / média / baixa)
ABORDAGEM: (2-3 linhas sobre como o pastor deve conduzir o contato)`,
    },
  ];

  return callChatWithFallback(keys, messages, {
    maxTokens: 500,
    temperature: 0.6,
  });
}

// ─── 6. Classificação de Tribo ─────────────────────────────────────────────

export interface TribeClassifyInput {
  memberName: string;
  ministerialInterests?: string[];
  servingProfile?: string;
  availability?: string[];
  memberStatus?: string;
  notes?: string;
}

export async function classifyTribe(
  keys: AiKeys,
  input: TribeClassifyInput,
): Promise<AiResponse> {
  const messages = [
    { role: "system" as const, content: SYSTEM_BASE },
    {
      role: "user" as const,
      content: `Classifique este membro em uma das 12 tribos ministeriais com base no perfil dele.

TRIBOS DISPONÍVEIS (código — vocação):
LEVI — Adoração e Culto (músicos, vocalistas, técnica de som)
JUDAH — Liderança (liderar pessoas, discipular, pastorear)
ASHER — Acolhimento (recepção, hospitalidade, integração de visitantes)
ISSACHAR — Estratégia (planejamento, visão, análise)
JOSEPH — Administração (gestão, finanças, processos, organização)
NAPHTALI — Artes (dança, teatro, design, fotografia, mídia)
ZEBULUN — Missões (evangelismo, ação social, plantação)
GAD — Intercessão (oração, vigília, guerra espiritual)
MANASSEH — Cura (aconselhamento, restauração, cuidado emocional)
EPHRAIM — Ensino (professores, EBD, treinamento)
BENJAMIN — Jovens (ministério com adolescentes e jovens)
REUBEN — Família (casais, crianças, ministério familiar)

PERFIL DO MEMBRO:
Nome: ${input.memberName}
${input.ministerialInterests?.length ? `Interesses ministeriais: ${input.ministerialInterests.join(", ")}` : ""}
${input.servingProfile ? `Perfil de atuação: ${input.servingProfile}` : ""}
${input.availability?.length ? `Disponibilidade: ${input.availability.join(", ")}` : ""}
${input.notes ? `Observações: ${input.notes}` : ""}

Responda SOMENTE com JSON válido, sem markdown, neste formato exato:
{"primary":"CODIGO","secondary":"CODIGO","reason":"1 frase explicando"}

"secondary" pode ser null se não houver segunda vocação clara. Use apenas os códigos listados.`,
    },
  ];

  return callChatWithFallback(keys, messages, {
    maxTokens: 200,
    temperature: 0.2,
  });
}
