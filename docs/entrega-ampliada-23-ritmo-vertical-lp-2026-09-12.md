# Entrega ampliada 23 — ritmo vertical compacto na LP

Data: **12/09/2026**  
Base: `91e01c8`  
Branch: `codex/consolidacao-local-2026-09-05`

## Sintoma confirmado

As seções da LP acumulavam espaçamento inferior e superior de até **260 px** na
mesma transição. Os cartões de recursos também mantinham 270 px de altura mínima,
mesmo quando o conteúdo ocupava uma área menor. Na passagem dos cartões 05/06
para “Veja como funciona na prática”, a soma criava uma grande faixa vazia e
quebrava a continuidade da leitura.

## Alterações

- Espaçamento vertical comum centralizado nos tokens responsivos
  `--section-space` e `--section-space-compact`.
- Transição máxima do trecho apontado reduzida de 260 px para 124 px no desktop,
  uma redução de aproximadamente **52%**.
- Altura mínima dos cartões editoriais reduzida de 270 px para 218 px.
- Cabeçalhos, abas, faixa de confiança, hero, contato e CTA final compactados.
- No celular, seções usam 40–48 px e cartões usam 24 px de respiro vertical.
- O limite foi registrado em `apps/lp/DESIGN.md` para orientar novas páginas e
  impedir a repetição do problema.

## Verificação

- Build de produção da LP e TypeScript: aprovados.
- Revisão visual integral em 1440 px: aprovada.
- Revisão visual em 390 px: aprovada, sem corte ou overflow horizontal.
- Passagem entre os cartões 05/06 e a seção de módulos revisada isoladamente.
- Oferta gratuita preservada em **50 membros**.

## Percentual

LP e aquisição: **92% → 93%**. Como a frente pesa 5%, o ganho global é
`(5 × 1) / 100 = 0,05` ponto. O total passa de **96,00% para 96,05%**.
