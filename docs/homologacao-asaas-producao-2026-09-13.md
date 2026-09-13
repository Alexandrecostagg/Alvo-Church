# Asaas em produção — teste em 13/09/2026

Estado: boleto emitido em produção; pagamento e ativação automática pendentes.
Esta etapa complementa a [homologação Sandbox da entrega 27](entrega-ampliada-27-asaas-sandbox-2026-09-13.md).

## Verificado

- A sessão do usuário no Safari acessou normalmente a administração da plataforma.
  Não houve alteração de papéis de contas existentes nem de titularidade.
- Criada pelo formulário normal uma instituição exclusiva para o teste:
  **Esdras - Teste de Faturamento**, ID `org_esdrastestefaturamento20260913`.
  Tipo Instituição, plano Base (`free`), ciclo mensal, sem cadastro de membros.
  A confirmação de criação foi exibida pela interface.
- Selecionada a instituição no seletor do faturamento. O cabeçalho confirmou
  `org_esdrastestefaturamento20260913` antes da abertura do formulário do Comunidade.
- A interface de faturamento exibiu **Asaas conectado · produção**,
  **Webhook ativo para 9 eventos** e ausência de assinatura vinculada.
  Isso confirma o acesso da aplicação à API; não comprova ainda o recebimento
  autenticado de um evento real de produção nem a ativação do plano.
- Aberto o campo de CPF/CNPJ no plano Comunidade, de **R$ 79 por mês**.
  O campo estava vazio e o botão de continuar estava desabilitado.
  Nenhum checkout foi enviado pelo agente nessa preparação inicial.
- Continuação: a geração de boleto pelo checkout foi verificada na interface
  do provedor. A confirmação de pagamento e a ativação automática continuam
  pendentes. Dados financeiros específicos, identificadores da fatura, CPF,
  códigos de pagamento e links de acesso foram omitidos deste registro técnico.

## Próxima ação

O pedido já foi emitido e conferido; não gerar outro para o mesmo teste.
O pagamento será realizado manualmente pelo usuário. Somente após a confirmação
real verificar o webhook e a mudança do plano gratuito para Comunidade.
Emissão de boleto não comprova liquidação nem ativação. Os registros internos
do pedido e do evento em produção devem ser consultados na verificação final.
O cancelamento da recorrência e eventual estorno são operações separadas.

## Problemas observados e cuidados para retomar

- O Safari apresentou páginas em branco durante o carregamento; a interface
  voltou após navegação/recarregamento. A causa não foi conclusivamente isolada.
- Ao recarregar a página, a instituição selecionada voltou para Getro Church.
  A seleção do teste foi refeita na própria tela de faturamento antes de abrir
  o campo de CPF/CNPJ. Não gerar pedidos enquanto o cabeçalho estiver em outra
  instituição. Revisar a persistência da seleção e o estado de plano durante
  a troca de instituição em uma próxima correção.
- Nenhum plano de igreja existente foi alterado. Nenhuma chave, token,
  fila de webhook ou configuração Asaas foi modificada nesta preparação.
- O Sandbox permanece separado, com a fila intencionalmente pausada após
  encerrar o receptor temporário da entrega 27.

## Progresso e publicação

Sistema **96,35%**, LP **99%**, limite gratuito **50 membros**: sem incremento
por emissão de um boleto cujo ciclo de pagamento ainda não foi concluído.
Esta etapa altera apenas a documentação; não requer novo deploy de código.
Versão web de referência: `e97e2b56-a074-4afa-90ee-c02db3b8add0`.
