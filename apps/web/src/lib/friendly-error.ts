// Converte erros técnicos (Firebase/rede, em inglês) em mensagens que o
// usuário final consegue entender e agir. O erro original vai pro console
// pra continuar diagnosticável — nunca pra tela.
export function friendlyError(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    console.error(error);
    const msg = error.message.toLowerCase();
    if (msg.includes("permission") || msg.includes("insufficient")) {
      return "Você não tem permissão para esta ação. Fale com o administrador da sua igreja.";
    }
    if (msg.includes("network") || msg.includes("offline") || msg.includes("failed to fetch") || msg.includes("unavailable")) {
      return "Sem conexão com o servidor. Verifique sua internet e tente novamente.";
    }
    if (msg.includes("quota") || msg.includes("resource-exhausted")) {
      return "Limite de uso atingido. Tente novamente mais tarde.";
    }
    if (msg.includes("not-found") || msg.includes("no document")) {
      return "Registro não encontrado. Ele pode ter sido removido.";
    }
    if (msg.includes("already-exists")) {
      return "Já existe um registro igual a este.";
    }
    if (msg.includes("unauthenticated") || msg.includes("token")) {
      return "Sua sessão expirou. Saia e entre de novo.";
    }
  }
  return fallback;
}
