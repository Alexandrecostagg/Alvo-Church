export async function kidsOperation(
  user: { getIdToken: () => Promise<string> } | null,
  organizationId: string,
  body: object,
) {
  if (!user) throw new Error("Entre na sua conta.");
  const response = await fetch("/api/kids/operations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${await user.getIdToken()}`,
    },
    body: JSON.stringify({ ...body, organizationId }),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Operação Kids indisponível.");
  return data;
}
