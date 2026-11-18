export const INTEGRATION_STAGES = [
  "new_visitor",
  "welcomed",
  "invited_to_group",
  "attending_class",
  "ready_for_membership",
  "completed",
] as const;
export type IntegrationStage = (typeof INTEGRATION_STAGES)[number];
export const INTEGRATION_LABELS: Record<IntegrationStage, string> = {
  new_visitor: "Chegada",
  welcomed: "Acolhimento",
  invited_to_group: "Convite para célula",
  attending_class: "Classe de integração",
  ready_for_membership: "Decisão de membresia",
  completed: "Integração concluída",
};
export const CARE_TASKS = {
  welcome_message: "Enviar boas-vindas",
  first_contact: "Realizar primeiro contato",
  invite_to_group: "Convidar para célula",
  invite_to_class: "Convidar para classe de integração",
  pastoral_contact: "Realizar contato pastoral",
} as const;
export type CareTask = {
  id: string;
  personId: string;
  title: string;
  type: string;
  status: string;
  dueAt?: string;
  assignedToUserId?: string;
  revision?: number;
};
export function isCarePending(task: { status?: string }) {
  return task.status === "open" || task.status === "in_progress";
}
export function hasCompletedContact(
  tasks: Array<{ type: string; status: string }>,
) {
  return tasks.some(
    (t) =>
      t.status === "completed" &&
      ["welcome_message", "first_contact", "pastoral_contact"].includes(t.type),
  );
}
export type IntegrationPerson = {
  id: string;
  name: string;
  memberStatus: string;
  phone: string;
  email: string;
  stage: IntegrationStage | null;
  journeyId: string | null;
  revision: number;
  cells: Array<{ id: string; name: string }>;
  tasks: CareTask[];
  needsContact: boolean;
  overdue: boolean;
  openTasks: number;
};
export type IntegrationSummary = {
  total: number;
  needsContact: number;
  withoutCell: number;
  ready: number;
  pending: number;
  stages: Array<{ key: string; label: string; value: number }>;
  weeks: Array<{ date: string; transitions: number; completed: number }>;
  historySince: string | null;
  partial: boolean;
};
export type IntegrationSnapshot = {
  people: IntegrationPerson[];
  totalFiltered: number;
  page: number;
  hasMore: boolean;
  partial: boolean;
  summary: IntegrationSummary;
  canManage: boolean;
  timezone: string;
  cells: Array<{ id: string; name: string }>;
  assignees: Array<{ id: string; name: string }>;
};
export type PersonalIntegration = {
  stage: IntegrationStage | null;
  label: string;
  cells: Array<{ id: string; name: string }>;
  updatedAt: string | null;
  notice: string | null;
};
