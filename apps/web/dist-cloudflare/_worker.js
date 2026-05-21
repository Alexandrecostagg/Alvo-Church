export default {
  async fetch(request, env) {
    return new Response("Teste de Inicialização: OK. Se você vê isso, o problema 1101 é no carregamento do handler do Next.js.");
  }
};
