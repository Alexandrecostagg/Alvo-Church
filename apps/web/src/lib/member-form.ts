export function daysInMonth(year: string, month: string) {
  if (!year || !month) return 31;
  return new Date(Number(year), Number(month), 0).getDate();
}

export function birthDateError(day: string, month: string, year: string, today = new Date()): string | null {
  if (!day && !month && !year) return null;
  if (!day || !month || !year) return "Informe dia, mês e ano de nascimento ou deixe a data em branco.";
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day)) {
    return "A data de nascimento é inválida. Confira dia, mês e ano.";
  }
  if (date > today) return "A data de nascimento não pode estar no futuro.";
  return null;
}

export function formatCalendarDate(value: string) {
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    ...(isDateOnly ? { timeZone: "UTC" } : {}),
  }).format(new Date(isDateOnly ? `${value}T00:00:00Z` : value));
}

export async function lookupCep(cep: string, signal?: AbortSignal) {
  const urls = [`https://viacep.com.br/ws/${cep}/json/`, `https://brasilapi.com.br/api/cep/v2/${cep}`];
  for (const url of urls) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    signal?.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(abort, 5000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error("CEP não encontrado");
      const data = await response.json();
      if (data.erro) throw new Error("CEP não encontrado");
      const city = data.localidade ?? data.city;
      const state = data.uf ?? data.state;
      if (!city || !state) throw new Error("Endereço incompleto");
      return { street: data.logradouro ?? data.street ?? "", district: data.bairro ?? data.neighborhood ?? "", city, state };
    } catch (error) {
      if (signal?.aborted) throw error;
      // Network errors and timeouts on the first provider also use the fallback.
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
    }
  }
  throw new Error("Não foi possível consultar o CEP");
}
