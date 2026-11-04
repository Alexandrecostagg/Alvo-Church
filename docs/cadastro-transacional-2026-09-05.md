# Cadastro de membros pelo servidor

O formulário `/members/new` agora chama `POST /api/members` com Firebase ID
token e uma chave de pedido estável. O servidor valida a pessoa, CPF, data,
organização, usuário ativo, cargo e assinatura; nomes de campos privilegiados
enviados pelo cliente não definem IDs, plano, consentimento datado ou código do Passe.

Uma transação grava pessoa, família, vínculo familiar, reserva do CPF, recibo
idempotente e contador da organização. A leitura do usuário e da assinatura
acontece nessa mesma transação. A contagem considera os registros existentes,
inclusive quando o contador antigo está desatualizado. O limite vem do plano
armazenado no servidor, sem confiar no plano do navegador.

O CPF é consultado também em registros anteriores (formato numérico ou máscara
usual). Novos cadastros reservam um documento privado identificado pelo hash
do CPF. Duas tentativas simultâneas não podem reservar o mesmo CPF na igreja.
O recibo permite repetir uma requisição cuja resposta foi perdida sem duplicar
pessoa ou família; reutilizar a chave com outro conteúdo é recusado.

Novos Esdras Passes exigem consentimento booleano explícito e recebem
`ESDRAS-` seguido de 24 símbolos criptográficos. O timestamp do consentimento é
definido pelo servidor. Identificações antigas não foram reemitidas. A prévia
do formulário informa “GERADO AO SALVAR”. Isso melhora a emissão; não representa
a conclusão do fluxo de validação de benefícios por estabelecimentos parceiros.

## Regras e compatibilidade

- CPF, organização, código do Passe, habilitação e consentimento não podem ser
  alterados diretamente no documento `people` pelo cliente.
- Recibos e reservas de CPF não têm leitura nem escrita por clientes.
- A recepção e as escalas legadas ainda podem criar pessoas sem CPF/Passe.
  A garantia transacional de limite cobre a nova API; esses fluxos legados
  ainda precisam migrar para o mesmo mecanismo para fechar o limite global.
- Alteração de CPF/Passe e remoção/reutilização de um CPF reservado exigem uma
  operação administrativa futura no backend. A reserva permanece após apagar
  diretamente uma pessoa; não é liberada automaticamente pelo cliente.
- O formulário exige sessão e confirmação do servidor; não informa sucesso
  local quando a gravação não foi confirmada.

O endpoint usa REST e Web Crypto, compatíveis com o Worker OpenNext. Em
produção precisa de `GOOGLE_SERVICE_ACCOUNT_JSON`, como as outras operações
administrativas existentes. O bypass dos emuladores aceita somente o projeto
`demo-alvo-qa`, hosts locais fixos e ambiente diferente de produção.

Referências do protocolo: [transações e agregações Firestore](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/runAggregationQuery)
e [leitura transacional de documentos](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/batchGet).

## Validação

Com os emuladores, `qa:seed` e `qa:web` ativos:

```bash
corepack pnpm qa:registration
corepack pnpm test
corepack pnpm typecheck
```

O teste de integração cria duas igrejas temporárias únicas e remove somente
essas igrejas ao terminar. Executa a API HTTP real e verifica o banco:

- sem autenticação: 401; membro sem cargo e administrador de outra igreja: 403;
- duas requisições para um CPF: uma gravação, uma resposta 409;
- repetição do pedido: mesmo ID e nenhum registro adicional;
- chave reaproveitada com outro conteúdo: 409;
- Passe sem consentimento: 400; com consentimento: código aleatório persistido;
- CPF/Passe forjados por escrita direta: 403;
- conflito na família: nenhuma pessoa, recibo ou incremento parcial;
- duas requisições sobre uma base gratuita de 49 pessoas: total final 50;
- Kids: responsável lê o próprio check-in, não lê o de outra criança nem lista
  a sala toda; não faz checkout diretamente; operador pode listar a sala.

Também executado no navegador: bloqueio do Passe sem consentimento, cadastro
com consentimento e família, confirmação e abertura da ficha com o mesmo código.
167 testes unitários, typecheck do monorepo e build OpenNext passaram. O bundle iOS foi exportado
com Expo Crypto para `/tmp/alvo-qa-mobile-export`; câmera e retirada ainda
precisam de homologação em aparelho.

Não houve deploy. Painel e regras devem ser publicados de forma coordenada:
o formulário antigo com CPF deixa de funcionar quando as regras novas entram.
