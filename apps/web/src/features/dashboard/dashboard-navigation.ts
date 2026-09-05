import { UsersRound, ClipboardList, Trophy, Waypoints, Handshake, MessageSquareText, Landmark, Target, LayoutDashboard, Map as MapIcon, UserPlus } from "lucide-react";
import type { ModuleKey } from "@alvo/domain";

export function getModuleHighlights(isEnabled: (key: ModuleKey) => boolean, isPlatformAdmin: boolean) {
  return [
  {
    label: "Pessoas e familias",
    description: "Base unica com dados cadastrais, casas, lideres, visitantes e vinculos familiares.",
    href: "/members",
    icon: UsersRound,
    enabled: isEnabled("core"),
    action: "Ver base"
  },
  {
    label: "Recepção",
    description: "Entrada do visitante que cria pessoa, jornada, comunicacao e roteiro de acolhimento.",
    href: "/reception",
    icon: ClipboardList,
    enabled: isEnabled("visitors"),
    action: "Capturar visitante"
  },
  {
    label: "Jornadas",
    description: "Proximos passos, missoes e progresso para cada pessoa acompanhada.",
    href: "/journeys",
    icon: Trophy,
    enabled: isEnabled("journeys"),
    action: "Ver progresso"
  },
  {
    label: "Celulas e eventos",
    description: "Convites, presencas, check-ins e integracao pratica na agenda da igreja.",
    href: "/groups",
    icon: Waypoints,
    enabled:
      isEnabled("groups") &&
      isEnabled("events"),
    action: "Organizar agenda"
  },
  {
    label: "Escalas e equipes",
    description: "Voluntarios, ministerios, confirmacoes, justificativas e funcionarios contratados.",
    href: "/serving",
    icon: Handshake,
    enabled: isEnabled("volunteers"),
    action: "Montar escala"
  },
  {
    label: "Comunicacao",
    description: "Fila viva para WhatsApp, convites, lembretes e retorno pastoral.",
    href: "#actions",
    icon: MessageSquareText,
    enabled: isEnabled("communication"),
    action: "Ver fila"
  },
  {
    label: "Transparencia",
    description: "Prestacao de contas, arrecadacoes e demonstrativos publicaveis para a igreja.",
    href: "#transparency",
    icon: Landmark,
    enabled: isEnabled("finance"),
    action: "Publicar contas"
  },
  {
    label: "SaaS e contratos",
    description: "Onboarding de instituicoes contratantes com tenant, plano, marca e modulos.",
    href: "/saas/organizations/new",
    icon: Target,
    enabled: isPlatformAdmin,
    action: "Cadastrar instituicao"
  }
];
}

export const operationalShortcuts = [
  {
    label: "Painel geral",
    title: "Visao completa",
    description: "Volte para o resumo executivo com indicadores, filas e modulos.",
    href: "#overview",
    icon: LayoutDashboard,
    meta: "Home do projeto"
  },
  {
    label: "Recepção",
    title: "Recepcao dedicada",
    description: "Tela rapida para tablet ou notebook na entrada da celebracao.",
    href: "/reception",
    icon: ClipboardList,
    meta: "Modulo dedicado"
  },
  {
    label: "Membros",
    title: "Base pastoral",
    description: "Lista de pessoas, familias, filtros e fichas completas.",
    href: "/members",
    icon: UsersRound,
    meta: "Cadastros"
  },
  {
    label: "Jornadas",
    title: "Funil vivo",
    description: "Acompanhe convidado, aspirante, membro e integracao em celula.",
    href: "/journeys",
    icon: MapIcon,
    meta: "Fluxo completo"
  },
  {
    label: "Celulas",
    title: "Comunidade pequena",
    description: "Veja grupos, participantes, presencas e pessoas ainda sem celula.",
    href: "/groups",
    icon: Waypoints,
    meta: "Grupos"
  },
  {
    label: "Escalas",
    title: "Servidores e equipes",
    description: "Monte escalas, confirme presencas e acompanhe justificativas.",
    href: "/serving",
    icon: Handshake,
    meta: "Voluntarios"
  },
  {
    label: "Novo cadastro",
    title: "Cadastrar membro",
    description: "Crie pessoa, familia, LGPD e Esdras Passe em uma ficha.",
    href: "/members/new",
    icon: UserPlus,
    meta: "Secretaria"
  }
];
