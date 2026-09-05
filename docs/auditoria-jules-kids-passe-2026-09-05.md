# Conferência Jules: Kids e Esdras Passe

Revisão por conteúdo após `git fetch origin` em 05/09/2026 UTC. As 26 branches
remotas continuam disponíveis; não houve novas alterações nesse fetch.

| Área | Evidência Jules | Estado encontrado |
| --- | --- | --- |
| Kids web — token e ID | `c052124`, `eaa3e74` e variantes | Integrado em `b03396c`: UUID criptográfico completo. |
| Kids web — código de retirada | mesmos patches | Integrado com `generateSecureCode(4)`, Web Crypto e alfabeto de 32 símbolos. |
| Kids mobile — token | `d3f152f` e variantes `7e39843`/`0e82e1c` | **Faltava integrar**: `newKidsToken` ainda usava `Math.random()`. Corrigido nesta revisão. |
| Convites de rede | `abfba07` e variantes | Integrado com `generateSecureCode(6)`. É convite de afiliação, não Esdras Passe. |
| Esdras Passe | histórico de arquivos de membros, perfil, marketplace e repositórios | Não encontrado patch funcional específico do Jules nas branches remotas disponíveis. Alterações nesses arquivos eram formatação e ajustes de build. |

O relato anterior de que os tokens Kids estavam corrigidos era incompleto:
valia para o web, mas não para o mobile. A tabela da consolidação anterior
agrupava as branches sem registrar essa diferença; esta revisão corrige o registro.

## Correção mobile

Adicionada `expo-crypto` na versão compatível com o Expo 57 instalado. O token
passa a usar **todo o UUID**, sem o corte de cinco caracteres do patch original
do Jules. Tokens já emitidos continuam sendo consultados pelo mesmo campo.
É necessário reconstruir o aplicativo nativo para incorporar o módulo; uma
verificação de tipos não substitui o teste de câmera/retirada em aparelho.

Referência: [Expo Crypto](https://docs.expo.dev/versions/latest/sdk/crypto/).

## Pendências distintas da integração Jules

- QR Kids ainda é enviado em parâmetro de URL para `/api/kids/qr`, cuja resposta
  permite cache público. Isso já estava pendente no plano de segurança.
- Foto de criança ainda pode estar em base64 no documento; armazenamento privado
  e acesso temporário seguem pendentes.
- O fluxo mobile permite iniciar check-in pelo responsável, enquanto as regras
  exigem operador Kids para escrita; precisa de decisão de fluxo e homologação
  dos papéis. A correção de aleatoriedade não resolve essa incompatibilidade.
- O Esdras Passe no cadastro ainda era gerado por nome e relógio no cliente.
  A continuação do cadastro no backend deve emitir um código criptográfico e
  exigir consentimento, preservando as identificações antigas existentes.

## Continuação realizada

A emissão do Passe foi movida para o servidor, com código criptográfico de
24 símbolos e exigência de consentimento. Foram testados cadastro, concorrência,
escrita direta indevida e leitura Kids por responsável/operador. Consulte
`cadastro-transacional-2026-09-05.md` para resultados e limites do escopo.
O bundle iOS com Expo Crypto e o typecheck passaram; não houve teste em aparelho.

Não foram publicados app, painel ou regras durante esta conferência.
