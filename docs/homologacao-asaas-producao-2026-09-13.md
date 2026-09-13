# Asaas em produção — teste em 13/09/2026

Estado: checkout verificado; autenticação corrigida no receptor de produção.
Falta o titular salvar o mesmo token no Asaas e validar o evento original.
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
  do provedor. A homologação da ativação automática continua
  pendente. Dados financeiros específicos, identificadores da fatura, CPF,
  códigos de pagamento e links de acesso foram omitidos deste registro técnico.
- O evento de confirmação chegou ao receptor de produção, que respondeu
  HTTP 401 com `Token de webhook inválido.`. A fila recebeu penalização.
  URL e seleção de eventos estão corretas; a autenticação compartilhada precisa
  ser sincronizada antes de reprocessar o evento original.
- Consulta somente leitura à instituição de teste confirmou pedido `ready`,
  assinatura vinculada e nenhum evento persistido naquele momento. Não houve
  ativação manual nem alteração direta do plano para encobrir a falha.

## Próxima ação

Não gerar outro pedido nem solicitar novo pagamento para resolver o erro de
autenticação. Corrigir o token, reprocessar o evento original e verificar a
mudança automática do plano gratuito para Comunidade e a idempotência.
O cancelamento da recorrência e eventual estorno são operações separadas.

Um novo token foi preparado em `.env.asaas-production.local`, ignorado pelo Git,
com permissão 0600. Seu valor não deve entrar em logs nem nesta documentação.
Após autorização explícita do titular, o artefato verificado foi republicado.
Como a atualização direta do segredo encontrou uma versão enviada ainda não
publicada, foi utilizada a operação versionada de segredo, seguida da publicação
integral dessa versão. O novo token está aplicado no receptor Esdras.

Validação após publicação: requisição sem token retornou 401; diagnóstico com
o novo token retornou 200 e `unbound_reference`, sem referência financeira nem
escrita no banco. A página de login retornou 200, e os demais nomes de segredos
continuam presentes. Isso verifica autenticação, não a ativação do plano.

O formulário do webhook no Asaas foi aberto em edição. A entrada e o salvamento
do token no navegador devem ser realizados pelo titular. Após salvar, reprocessar
o evento original e conferir o plano e os registros de evento no banco.

## Problemas observados e cuidados para retomar

- O Safari apresentou páginas em branco durante o carregamento; a interface
  voltou após navegação/recarregamento. A causa não foi conclusivamente isolada.
- Ao recarregar a página, a instituição selecionada voltou para Getro Church.
  A seleção do teste foi refeita na própria tela de faturamento antes de abrir
  o campo de CPF/CNPJ. Não gerar pedidos enquanto o cabeçalho estiver em outra
  instituição. Revisar a persistência da seleção e o estado de plano durante
  a troca de instituição em uma próxima correção.
- Nenhum plano de igreja existente foi alterado. Apenas o token do receptor
  Esdras foi atualizado; o agente não alterou a configuração nem a fila no Asaas.
- O Sandbox permanece separado, com a fila intencionalmente pausada após
  encerrar o receptor temporário da entrega 27.

## Progresso e publicação

Sistema **96,35%**, LP **99%**, limite gratuito **50 membros**: sem incremento
enquanto a ativação via webhook não for comprovada.
Correção de autenticação publicada em 100% do tráfego.
Versão web ativa: `411e7bf9-995e-4797-a055-393ed41617c1`.
