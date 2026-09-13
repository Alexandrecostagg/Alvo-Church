# Homologação Asaas Sandbox — 13/09/2026

## Estado verificado

O webhook Sandbox `Plataforma Esdras - Billing` estava ativo, com fila ligada,
API v3, envio sequencial e token mascarado. Apontava para o receptor de produção
`https://alvo-church-web.alexandrecostagg.workers.dev/api/billing/webhook`.
Somente PAYMENT_CONFIRMED e PAYMENT_RECEIVED estavam selecionados na categoria
de cobranças. Na consulta de todos os webhooks dos últimos 14 dias, o único
registro pertencia ao Alvorecer Studio; nenhum registro do Esdras foi encontrado.

A fila Sandbox do Esdras foi pausada, com confirmação `Webhook salvo com sucesso!`
e situação final **Interrompido**, zero penalizados. Essa pausa é intencional até
a troca do destino. Os outros três webhooks Sandbox continuaram ativos.
O webhook da conta Asaas de produção não foi alterado.

## Preparação local concluída

- O inicializador carrega somente `.env.asaas-sandbox.local`, remove credenciais
  Asaas/Google/Firebase herdadas e fixa API Sandbox e projeto `demo-alvo-qa`,
  com emuladores loopback.
- O receptor aceita apenas POST em `/api/billing/webhook`, token válido, corpo
  até 64 KB e referência exata `order:qa_asaas_sandbox:subscription`. Outros
  vínculos são ignorados sem consultar o gateway ou alterar o banco.
- Usa o handler de webhook real da aplicação. Não publica painel ou emuladores.
  Após receber credenciais, escuta apenas `127.0.0.1:3012`.
- Arquivo privado criado com permissão 0600, chave API vazia e token aleatório
  próprio, ignorado pelo Git. Nenhum segredo foi incluído nos commits.

## Validação executada

`PATH=/opt/homebrew/bin:$PATH corepack pnpm qa:asaas:verify`

**32 verificações passaram**, usando Firestore local real e respostas do gateway
**simuladas**, com bloqueio de acesso de rede fora de loopback. Incluem rejeição
de configuração de produção, token ausente/incorreto, rotas indevidas, JSON
inválido, corpo excessivo, referência de outra instituição, ativação do plano,
repetição idempotente, evento divergente, estorno, evento antigo, cancelamento
e evento posterior ao cancelamento. Os documentos da verificação foram removidos;
nenhum membro foi criado. O verificador recusa sobrescrever dados QA existentes.

Isso **não comprova** autenticação na API externa nem entrega real pelo Asaas.
Nenhuma cobrança externa foi criada. Não há túnel ou receptor público ativo.

## Continuação dependente da credencial

1. No Sandbox, usar uma chave existente cujo valor esteja guardado ou criar uma
   chave dedicada `Esdras QA Sandbox`. Não reutilizar chaves de outros apps.
   O painel não revela novamente o valor das chaves existentes.
2. Salvar o valor em `ASAAS_SANDBOX_API_KEY` no arquivo privado da raiz.
   O titular conclui a criação/confirmação da nova credencial no navegador.
3. Executar `corepack pnpm qa:asaas:status` (consulta apenas o banco local).
   Validar também a chave com consulta de leitura à API Sandbox.
4. Preparar cliente fictício e pedido vinculados a `qa_asaas_sandbox`, sem dados
   reais de terceiros nem notificações não autorizadas.
5. Iniciar `corepack pnpm qa:asaas:serve`. Publicar somente a porta 3012 por
   túnel temporário: `cloudflared tunnel --url http://127.0.0.1:3012`.
   Nunca apontar o túnel para 3001, 8080, 9099 ou 9199.
6. Validar externamente 404 nas demais rotas e 401 sem token. Ajustar o webhook
   Sandbox ao novo endereço, seu token exclusivo e os nove eventos de produção.
   O titular conclui a entrada do novo token no navegador. Só então religar a fila.
7. Simular pagamento e cancelamento e conferir logs Asaas e documentos locais.
   Ao encerrar, pausar a fila antes de fechar o túnel. A URL temporária muda ao
   reiniciar. Não alterar a conta nem o ambiente de produção para esse QA.

## Progresso

Sistema **96,35%**, LP **99%**, sem incremento até a homologação externa.
Gratuito preservado em **50 membros**. Ferramentas locais; não exigem novo deploy
do painel/LP. A configuração de produção permanece como na entrega 26.

Referências: [Sandbox Asaas](https://docs.asaas.com/docs/sandbox) e
[túneis temporários Cloudflare](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/).
