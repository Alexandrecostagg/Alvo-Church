# WhatsApp / Meta — pendente de constituição da empresa

Atualizado em 24/10/2026. Pausado a pedido do responsável: a empresa que será responsável pelo AlvorecerApp ainda será constituída. Não preencher dados presumidos nem enviar a verificação até existir entidade legítima e documentação correspondente.

## Ponto de parada

Cadastro de Provedor de Tecnologia independente iniciado. Verificação empresarial aberta em **“Selecione o tipo da sua empresa”**, sem tipo selecionado e sem solicitação de verificação enviada. O formulário pode precisar ser reaberto; não depender de abas ou de rascunho da Meta para retomar.

## Identificadores para recuperar o processo

- Portfólio Meta: **AlvorecerApp**, ID `1674603930543377`.
- Aplicativo: **Alvo Church Atendimento**, ID `1794941321731669`.
- Conta do aplicativo WhatsApp Business vinculada: ID `115721361131080`, apresentada pela Meta como **Alexandre Gomes**, propriedade de AlvorecerApp. Não confundir esse identificador com o Phone Number ID necessário à Cloud API.
- Instituição piloto no produto: **1ª Igreja Alvorecer de Marabá**, organização `org_1-igreja-alvorecer-de-maraba_ZrVlO6` (referência existente no repositório; conferir o cadastro de produção antes de provisionar).
- Aplicativo Meta: https://developers.facebook.com/apps/1794941321731669/
- Integração do provedor: https://developers.facebook.com/apps/1794941321731669/use_cases/customize/onboard-v2/?product_route=whatsapp-business&business_id=1674603930543377&use_case_enum=WHATSAPP_BUSINESS_MESSAGING&selected_tab=onboard-v2

## Etapas já realizadas

- Número indicado pelo responsável verificado e vinculado ao portfólio pelo fluxo do aplicativo WhatsApp Business.
- Aplicativo Meta criado com caso de uso WhatsApp.
- Termos da Plataforma, API de Nuvem e Provedor de Tecnologia aceitos com autorização específica do responsável.
- Cadastro como Provedor de Tecnologia independente iniciado. Isso não significa aprovação como provedor nem publicação do aplicativo.
- Código do produto publicado; envios potencialmente pagos bloqueados por padrão no commit `734d76e`.

## O que ainda NÃO está concluído

- Empresa verificada, análise do app, vídeo demonstrativo e publicação na Meta.
- Cadastro incorporado/coexistência: manter uso do WhatsApp Business no celular ainda precisa ser validado e configurado. A vinculação ao Business Suite não conclui isso.
- Registro do número na Cloud API, Phone Number ID e credenciais de produção.
- Webhook validado, assinatura dos eventos e provisionamento seguro dos segredos na hospedagem.
- Atendimento automático com mensagens reais. Não anunciar o bot como ativo.

## Retomada quando a empresa existir

1. Abrir este registro e acessar o aplicativo existente na Meta; não criar outro aplicativo ou outro portfólio por padrão.
2. Confirmar com o responsável qual entidade será titular da plataforma e conferir razão social, CNPJ, tipo jurídico, endereço, contatos e site. Usar dados coerentes com os documentos e com a entidade responsável pelo portfólio.
3. Reabrir “Torne-se um Provedor de Tecnologia” → “Verificação da empresa” → “Iniciar verificação”. Confirmar requisitos atuais na própria Meta; não presumir que o formulário ou rascunho foi preservado.
4. Preparar e enviar a verificação com dados/documentos aprovados pelo responsável. Não inferir tipo jurídico nem enviar documentos de outra empresa.
5. Concluir os requisitos de análise do app e a demonstração em vídeo exigidos pela Meta.
6. Validar e implementar o fluxo de coexistência/cadastro incorporado antes de registrar o número atual. Não excluir a conta do WhatsApp Business nem migrar o número silenciosamente.
7. Configurar credenciais, webhook e vínculo da organização conforme `whatsapp-sem-app-2026-10-16.md`; manter `paidMessagesEnabled` desativado até autorização de orçamento.
8. Fazer teste com consentimento, conferir recebimento e resposta reais, isolamento da igreja e continuidade do aplicativo no celular.

Frase para retomar: **“Retome a integração WhatsApp da Meta pelo arquivo docs/whatsapp-meta-retomada.md; a empresa já está constituída.”**

Este arquivo não contém senhas, tokens nem códigos de verificação. O registro local e o aplicativo já criado permitem recuperar o contexto mesmo que a sessão do navegador expire. A disponibilidade e os requisitos futuros dependem da Meta.
