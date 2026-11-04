# Marca no painel e nas capturas da LP — 30/09/2026

## Resultado

O painel ainda desenhava um quadrado colorido com a letra **E** quando a
instituição não tinha marca própria. O padrão agora usa o livro com pena já
aprovado; `logoLightUrl` e `iconUrl` específicos de uma instituição continuam
com prioridade. A landing interna e as páginas públicas de privacidade e
exclusão de conta também deixaram de usar o **E** antigo.

As cinco imagens de demonstração foram recapturadas no navegador a partir da
instituição fictícia `org_lp_capturas`, no emulador local `demo-alvo-qa`:
Pessoas, Células, Sabedoria Pastoral, Escalas e Finanças. As mesmas imagens
estão nas duas LPs. O aviso de emulador continua visível; nenhuma captura
recebeu composição, retoque de pixels ou dados de uma igreja real. A imagem de
Sabedoria Pastoral, antes JPEG com extensão `.png`, passou a WebP real.

O [manifesto de integridade](evidencias-lp-2026-09-30/capturas.json) registra
dimensões, hashes dos arquivos e hashes dos pixels. A conversão para WebP foi
sem perdas e os pixels decodificados foram comparados às capturas do navegador.
O `esdrasapp-icon.png` solto na pasta pública da LP, sem referências no código,
foi removido para não manter uma cópia da identidade antiga.

## Verificação

- Painel local com a nova marca e preservação do nome da instituição fictícia.
- LP desktop e celular 390 px verificadas no navegador; cinco imagens carregadas
  com 1433 × 1000 px, sem rolagem horizontal da página no celular.
- Build de produção da LP e build Cloudflare do painel aprovados nesta entrega.
- As dez imagens remotas (cinco em cada aplicação) retornaram HTTP 200 e bytes
  idênticos aos arquivos locais. A marca nova também foi conferida no login
  publicado e na seção de demonstração do domínio oficial da LP.
- Plano gratuito de **50 membros** preservado.

## Publicação

- LP: versão Cloudflare `a50298b9-bd4d-4254-9f03-20a713128010`, em
  <https://plataformaesdras.com.br/#modulos>.
- Painel: versão Cloudflare `d160fa66-cbc6-48af-97a3-0e6f341f7da3`, em
  <https://alvo-church-web.alexandrecostagg.workers.dev/login>.

## Progresso e limite

Correção de identidade e atualização de prova visual, sem nova funcionalidade:
sistema **96,40%**, mobile **97%** e LP **100% do escopo atual**. O ícone nativo,
o splash e a ficha do Google Play continuam no plano do [próximo AAB](marca-proximo-aab-2026-09-28.md),
conforme a decisão anterior do usuário.
