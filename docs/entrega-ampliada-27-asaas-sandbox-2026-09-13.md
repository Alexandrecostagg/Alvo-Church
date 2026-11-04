# Entrega 27 — Asaas Sandbox com eventos reais

## Resultado

A homologação real identificou e corrigiu uma incompatibilidade que as simulações
anteriores não cobriam. O Asaas envia IDs de evento como `evt_...&19713993`, mas
a validação genérica de documentos rejeitava `&`, retornando HTTP 400 antes da
conciliação. A nova validação é específica para eventos financeiros: preserva
o identificador original para idempotência e continua rejeitando caminhos,
espaços, caracteres de controle e valores maiores que 128 caracteres.
A validação de IDs de instituições e recursos não foi flexibilizada.

## Evidência ponta a ponta

Ambiente Asaas: **Sandbox**, com chave exclusiva salva pelo titular.
Banco: emulador local, projeto `demo-alvo-qa`, instituição `qa_asaas_sandbox`.
O receptor aceita somente o webhook autenticado dessa instituição. O túnel
temporário apontou apenas para 127.0.0.1:3012; páginas administrativas e APIs
do emulador não foram publicadas.

1. API Sandbox aceitou a chave (HTTP 200). Receptor externo respondeu 404 para
   `/members`, 401 sem token e 200/ignorado para evento sem vínculo QA.
2. O webhook existente `Plataforma Esdras - Billing` foi configurado por API
   para o receptor temporário, token próprio, envio sequencial e nove eventos.
   As configurações da conta Asaas de produção não foram modificadas.
3. `startBilling` criou cliente e assinatura usando o gateway real Sandbox.
   O adaptador QA apenas suprimiu o e-mail e adicionou `notificationDisabled`;
   o documento de exemplo veio da referência oficial de criação de clientes.
   Nenhum contato real de terceiros foi enviado e notificações ficaram desligadas.
4. Cobrança de R$ 79 fictícios ficou PENDING; plano local continuou `free`.
5. O endpoint exclusivo Sandbox confirmou o pagamento como RECEIVED.
   Os primeiros envios retornaram 400, permitindo identificar o formato do ID.
6. Após a correção, o Asaas reenviou automaticamente PAYMENT_RECEIVED, com
   HTTP 200, persistência do evento e plano local `comunidade`.
7. A assinatura fictícia foi cancelada na API Sandbox. SUBSCRIPTION_DELETED
   chegou com HTTP 200 e mudou o plano para `free`, com `cancelled: true`.
8. Pelo painel Asaas, o pagamento antigo foi reenviado após o cancelamento.
   A resposta foi **HTTP 200, `{"ok":true,"replayed":true}`**. O plano ficou
   `free` e continuaram existindo apenas dois eventos no banco.

Identificadores de QA para conferência no provedor:

- Cliente: `cus_000009097145`.
- Assinatura: `sub_o5njjb5jyyzf7dek` (cancelada).
- Cobrança: `pay_w3sel9l8myxhz5xp`.
- Evento recebido: `evt_d26e303b238e509335ac9ba210e51b0f&19713993`.
- Cancelamento: `evt_5dbdd3e48f06e3fd744ba0e8e6abd53a&19714036`.
- Log de replay no Asaas: `22784251`, 13/09 às 17:23, resposta `replayed: true`.
- Histórico de falha mantido: log `22784188`, anterior à correção.

Os registros fictícios ficam no Sandbox e no emulador para conferência; nenhuma
organização de produção nem contagem de membros real foi alterada.

## Validação e encerramento

- **401 testes em 37 arquivos passaram**, incluindo três regressões do ID.
- **32 verificações HTTP/Firestore locais passaram**, agora usando IDs com `&`.
  Cada execução cria uma instituição QA exclusiva e remove somente seus dados.
- Build OpenNext passou, com TypeScript e geração das 82 páginas/rotas estáticas.
- Após o teste, a fila Sandbox foi pausada antes de encerrar o túnel/receptor.
  A pausa é intencional: não religar para uma URL temporária já encerrada.

Comandos de operação: `node scripts/with-asaas-sandbox.mjs`
com modos `connect <origem-do-túnel>`, `checkout`, `confirm`, `cancel`, `inspect`
e `pause`. Credenciais são lidas somente do arquivo privado Sandbox. Esses modos
recusam a configuração de produção; a ferramenta não permite escolher uma
instituição real. O checkout preserva a proteção contra recriação após incerteza
ou cancelamento. Para um novo ciclo, revisar os registros de QA existentes antes
de preparar outra instituição/pedido; não reenviar criações indiscriminadamente.

## Limites e progresso

Publicação do painel concluída na versão
`e97e2b56-a074-4afa-90ee-c02db3b8add0`. A configuração publicada manteve
`ASAAS_API_BASE_URL=https://api.asaas.com/v3` e o projeto Firebase de produção.
O deploy não recebeu a chave nem o token Sandbox. LP e aplicativo não exigiram
nova publicação nesta entrega.
Após publicar, `/login` respondeu 200 e POST sem token em
`/api/billing/webhook` respondeu 401. A lista de nomes dos segredos remotos
confirmou Asaas, Google e Turnstile preservados, sem leitura de seus valores.
O aviso de Turnstile ausente no ambiente local do deploy não corresponde à
ausência do segredo remoto. As portas 3012 e 20241 ficaram sem listener após
o encerramento dos processos temporários.

Concluído o cenário Sandbox de assinatura: criação → pagamento → webhook →
ativação → cancelamento → gratuito → replay. Isso não comprova uma cobrança em
produção, todos os nove tipos de evento nem todos os meios de pagamento.
Estorno/atraso/chargeback continuam cobertos parcialmente por testes locais;
migração legada e processamento assíncrono do webhook permanecem no backlog.

Sistema **96,35%**, LP **99%**, Gratuito **50 membros**. A nota SaaS já estava em
100 na matriz funcional; esta entrega fecha uma pendência de homologação e
corrige um defeito, sem contar novamente a funcionalidade nem alterar os pesos.

Fontes: [cliente Sandbox](https://docs.asaas.com/reference/criar-novo-cliente),
[confirmação simulada](https://docs.asaas.com/reference/confirmar-pagamento),
[cancelamento](https://docs.asaas.com/reference/remover-assinatura) e
[logs do provedor](https://docs.asaas.com/docs/logs-de-webhooks).
