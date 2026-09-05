type User = { getIdToken: () => Promise<string> };
import { invalidateOrgDataCache } from "./org-data-cache";

export async function registerPerson(
  user: User,
  input: Record<string, unknown> & { organizationId: string },
) {
  const response = await fetch("/api/members", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${await user.getIdToken()}`,
    },
    body: JSON.stringify(input),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Não foi possível concluir o cadastro.");
  invalidateOrgDataCache(input.organizationId);
  return data as {
    personId: string;
    intakeId?: string;
    journeyId?: string;
    assignmentId?: string;
    replayed?: boolean;
  };
}
