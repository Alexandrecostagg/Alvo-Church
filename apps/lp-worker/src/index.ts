const LP_URL = "https://plataformaesdras-lp.alexandrecostagg.workers.dev";
const PLATFORM_URL = "https://alvo-church-web.alexandrecostagg.workers.dev";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();

    // Se for plataformaesdras.com.br ou www.plataformaesdras.com.br → mostra a LP
    if (host === "plataformaesdras.com.br" || host === "www.plataformaesdras.com.br") {
      // Redirecionar assets para a LP
      if (url.pathname.startsWith("/_next/") || url.pathname.endsWith(".css") || url.pathname.endsWith(".js")) {
        return Response.redirect(LP_URL + url.pathname + url.search, 301);
      }
      
      const lpRequest = new Request(LP_URL + url.pathname + url.search, request);
      const response = await fetch(lpRequest);
      
      // Se for HTML, substituir URLs relativas pelas absolutas
      if (response.headers.get("content-type")?.includes("text/html")) {
        const html = await response.text();
        const fixedHtml = html
          .replace(/href="\/_next\//g, `href="/_next/`)
          .replace(/src="\/_next\//g, `src="/_next/`);
        return new Response(fixedHtml, {
          ...response,
          headers: {
            ...Object.fromEntries(response.headers.entries()),
            "content-type": "text/html; charset=utf-8",
          },
        });
      }
      
      return response;
    }

    // Se for alvo-church-web.alexandrecostagg.workers.dev → mostra a plataforma
    if (host === "alvo-church-web.alexandrecostagg.workers.dev") {
      const platformRequest = new Request(PLATFORM_URL + url.pathname + url.search, request);
      return await fetch(platformRequest);
    }

    // Qualquer outro host → 404
    return new Response("Domínio não configurado", { status: 404 });
  },
};
