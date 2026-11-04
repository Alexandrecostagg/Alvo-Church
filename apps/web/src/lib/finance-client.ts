export async function financeRequest(
  user: { getIdToken(): Promise<string> },
  body: Record<string, unknown>,
) {
  const response = await fetch("/api/finance", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await user.getIdToken()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Operação financeira indisponível.");
  return result;
}
