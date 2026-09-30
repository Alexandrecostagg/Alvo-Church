# Marca colorida no painel e capturas da LP — 30/09/2026

## Entrega

A variante escolhida pelo usuário para a marca do Esdras — livro claro, pena
cobre e fundo verde — é agora a marca padrão do painel web. Login, cadastro,
barra lateral e páginas públicas internas usam o novo arquivo
`/brand/esdras-icon-cobre.png`. Logos próprios configurados pelas instituições
continuam com prioridade sobre esse padrão. A marca clara do cabeçalho da LP
foi mantida para conservar o contraste no fundo escuro.

As cinco capturas reais de produto das duas LPs foram refeitas no navegador,
usando apenas o emulador `demo-alvo-qa` e dados fictícios. O cabeçalho da
demonstração agora diz **Plataforma Esdras**, em vez de Comunidade Esperança, e
mostra a pena cobre. Arquivos antigos sem referências foram removidos; os
novos nomes terminam em `-cobre.webp` para evitar cache de versões anteriores.
O [manifesto de integridade](evidencias-lp-2026-09-30-cobre/capturas.json)
registra dimensões e hashes. A conversão para WebP foi sem perdas, com pixels
decodificados iguais aos das capturas do navegador.

## Verificação e publicação

- Build de produção da LP e build Cloudflare do painel aprovados.
- LP local verificada no desktop e a 390 px, sem rolagem horizontal. As cinco
  imagens carregaram com 1433 × 1000 px.
- LP publicada em <https://plataformaesdras.com.br/#modulos>, versão
  Cloudflare `974763fe-e195-47ef-a9d1-b158e8c39d23`. As cinco abas serviram
  as imagens novas com as dimensões esperadas.
- Painel publicado em <https://alvo-church-web.alexandrecostagg.workers.dev/login>,
  versão `5ba73be1-3a73-4bba-844d-df3e7722f382`. O login público carregou o
  novo arquivo de marca, 512 × 512 px, e a variante cobre foi conferida
  visualmente.
- O deploy do painel exigiu Node 22 no `PATH`; uma tentativa inicial falhou
  porque o `pnpm exec` escolheu Node 20. A publicação final terminou com êxito.

## Progresso

Identidade visual corrigida, sem nova funcionalidade: sistema **96,40%**,
mobile **97%** e LP **100% do escopo atual**. O plano gratuito continua com
**50 membros**. Ícone nativo, splash e ficha do Google Play seguem reservados
ao [próximo AAB](marca-proximo-aab-2026-09-28.md), conforme a decisão anterior.
