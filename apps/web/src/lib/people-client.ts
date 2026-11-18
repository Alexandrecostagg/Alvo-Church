export async function peopleRequest(
  user: { getIdToken(): Promise<string> },
  body: Record<string, unknown>,
) {
  const response = await fetch("/api/members/directory", {
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
    throw new Error(result.error || "Consulta de pessoas indisponível.");
  return result;
}
