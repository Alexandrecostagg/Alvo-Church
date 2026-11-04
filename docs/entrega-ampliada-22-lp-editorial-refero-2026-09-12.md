# Entrega ampliada 22 — LP editorial inspirada pelo Refero

Data: **12/09/2026**  
Base: `b135336`  
Branch: `codex/consolidacao-local-2026-09-05`

## Sintoma confirmado

A LP transmitia a oferta, mas reunia vários padrões associados a templates
genéricos de SaaS: gradientes radiais, glassmorphism, blobs, cartões flutuantes,
emojis, sombras fortes, animações decorativas e métricas inventadas em um painel
rotulado como ilustrativo. Quase todas as seções repetiam a mesma composição de
cartões. A folha de estilos também continha mais de 11 mil linhas copiadas do
painel interno, embora a aplicação pública use somente a landing page.

## Referência e decisão

O catálogo [Refero Styles](https://styles.refero.design/) foi consultado porque
organiza sistemas visuais reais em tokens e regras. A referência mais coerente
foi [Arva — pastoral editorial magazine spread](https://styles.refero.design/style/15846be3-8df8-42e4-a05c-d9395dcec369):
campo marfim, verde profundo, tensão entre serif editorial e sans neutra, faixas
de cor e profundidade construída sem sombras.

A referência foi traduzida para a marca Esdras como **caderno pastoral
contemporâneo**. Não foram copiados texto, marca, fotografia ou componentes. A
paleta preserva o laranja do Esdras como cor de ação, e o ícone oficial do app
substitui o símbolo improvisado da LP.

## Alterações

- Hero assimétrico com promessa voltada à realidade da liderança.
- Fluxo “receber, organizar, cuidar” sem números ilustrativos.
- CTA principal consistente: `Criar conta grátis`.
- Marfim, verde profundo, sálvia, azul névoa e pêssego, sem gradientes.
- Newsreader para títulos e DM Sans para leitura/interface, auto-hospedadas pelo
  build do Next.
- Recursos apresentados como capítulos numerados, com benefício e plano.
- Demonstrações, planos, FAQ, contato e fechamento passaram a variar composição
  e fundo conforme o argumento.
- Ícone oficial copiado para os ativos da LP.
- `NavActive`, que não envolvia os links e portanto não podia marcar a seção
  ativa, foi removido.
- `globals.css` caiu de **11.331 para 265 linhas**, mantendo somente estilos da LP.
- `apps/lp/DESIGN.md` registra conceito, tokens e limites para impedir regressão
  à estética genérica.

## Verificação

- TypeScript da LP: aprovado.
- Export estático de `/` e `/landing`: aprovado.
- CI integral [34699383607](https://github.com/Alexandrecostagg/Alvo-Church/actions/runs/34699383607):
  qualidade, autorização e builds web, mobile e LP aprovados.
- Revisão visual: hero, narrativa completa, planos e largura estreita/desktop.
- Responsividade: CTA, tipografia, grids e tabs reorganizados em telas pequenas.
- Acessibilidade: landmarks preservados, heading único no hero, foco visível,
  controles com nomes e `prefers-reduced-motion` mantido.
- Oferta gratuita preservada em **50 membros**.
- Cloudflare Worker `plataformaesdras-lp`, versão
  `0a86d984-a172-4200-9b8c-1ae677a21706`, publicado em
  `https://plataformaesdras-lp.alexandrecostagg.workers.dev` e verificado com HTTP 200.
- Commit funcional: `1a53fcf`.

## Limites

Esta entrega melhora direção, clareza e consistência, mas não comprova aumento de
conversão. A LP ainda precisa de capturas reais e sanitizadas do produto, domínio
definitivo, analytics com consentimento e acompanhamento do funil. Esses itens
impedem considerar aquisição concluída.

## Percentual

LP e aquisição: **89% → 92%**. Como a frente pesa 5%, o ganho global é
`(5 × 3) / 100 = 0,15` ponto. O total passa de **95,85% para 96,00%**.
