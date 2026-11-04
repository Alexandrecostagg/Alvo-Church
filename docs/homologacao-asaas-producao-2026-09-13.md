# Asaas em produção — validação em 13–14/09/2026

Estado: **pagamento real recebido e plano Comunidade ativado automaticamente**.
Esta etapa complementa a [homologação Sandbox da entrega 27](entrega-ampliada-27-asaas-sandbox-2026-09-13.md).

## Resultado verificado em 14/09

- Checkout e geração de boleto verificados no fluxo da instituição exclusiva
  de teste. O pagamento foi realizado pelo titular.
- Após sincronização do token pelo titular e remoção da penalização pela
  interface normal do Asaas, o evento original `PAYMENT_RECEIVED` foi entregue
  com **HTTP 200**. O webhook Esdras está ativo, com **zero eventos penalizados**.
- Consulta somente leitura ao Firestore confirmou plano `comunidade`, cobrança
  `active`, estado do provedor `RECEIVED`, pedido `ready` e assinatura
  correspondente ao recurso do pedido. O evento foi persistido sem ser ignorado.
- A ativação ocorreu pelo processamento do pagamento. Não houve concessão manual
  de plano, evento simulado, nova cobrança ou novo pagamento para resolver a falha.
- Dados financeiros específicos, identificadores da fatura, CPF, códigos de
  pagamento, credenciais e links de acesso foram omitidos deste registro.

## Causa e correção

As tentativas anteriores retornavam HTTP 401 por divergência entre o token
configurado no Asaas e o esperado pelo receptor. O diagnóstico restrito ao
formato confirmou essa diferença, sem registrar valores, hashes, demais
cabeçalhos ou dados de pagamento. A resposta pública de autenticação permanece
inalterada. A credencial correta foi copiada e salva pelo titular no Asaas.

O arquivo canônico privado permanece ignorado pelo Git, com permissão 0600.
A cópia auxiliar usada para facilitar o preenchimento foi removida após a
confirmação do sucesso. O Sandbox permanece separado, com fila pausada após
encerramento do receptor temporário da entrega 27.

## Validação técnica e publicação

Cinco testes direcionados passaram, incluindo recusa sem processamento do
pagamento, ausência de segredos no log e caminho autenticado. TypeScript e build
OpenNext com 82 páginas concluídos. Em 14/09, a suíte completa passou:
**403 testes em 38 arquivos**.

O diagnóstico autenticado sem referência financeira retornou 200 sem escrita
no banco; a requisição sem token retornou 401; a página de login retornou 200.
Essas verificações foram complementadas pela entrega real e ativação acima.
Versão web ativa: `4f332bf6-770d-43d3-9ae0-e0ab26a21c22`.
Este fechamento documental não exige novo deploy da aplicação.

## Limites e pendências

- Replay e cancelamento foram homologados no Sandbox. Não foram repetidos em
  produção nesta conclusão; cancelamento da recorrência e eventual estorno são
  operações financeiras separadas.
- Demais cenários financeiros, migrações legadas e processamento assíncrono do
  webhook permanecem no backlog.
- Revisar persistência da instituição selecionada após recarregamento e estado
  do plano durante a troca. Confirmar o cabeçalho antes de iniciar um checkout.

## Progresso

Sistema **96,35%**, LP **99%**, limite gratuito **50 membros** preservado.
SaaS já estava em 100 na matriz funcional: esta validação fecha uma pendência
operacional real, sem contar a mesma funcionalidade duas vezes.
