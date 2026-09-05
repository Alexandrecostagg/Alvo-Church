# Encerramento operacional do Jules e retomada local

Conferência em 05/09/2026 pela interface do Jules aberta no Safari e pelo Git
local. Escopo: somente `Alexandrecostagg/Alvo-Church`.

## Trabalho interrompido

As sete sessões em andamento foram pausadas individualmente. A interface
confirmou `Session is paused` ou `Resume session` em cada uma. Sessões pausadas
ainda aparecem na categoria **In progress**; isso não significa execução ativa.

| Sessão | O que ficou pendente | Destino local |
| --- | --- | --- |
| [Consultas de membros de grupos](https://jules.google.com/session/8332497008097087167) | Refatoração por `collectionGroup`, regras e índices; aguardava decisão sobre consultas sem limite. | Revisar limites e isolamento antes de aproveitar o diff; não aplicar regras recursivas genéricas de `members`. |
| [Testes do questionário de tribos](https://jules.google.com/session/5836012633939210714) | Testes concluídos; aguardava resposta sobre correções de CI fora do escopo. | Testes e correção OpenNext já integrados localmente. |
| [PIX mobile](https://jules.google.com/session/5353897712255173594) | O TODO descrito não existia mais; integração `/api/giving/pix` já presente. | Solicitação obsoleta, sem patch novo a integrar. |
| [Map do CareRadar](https://jules.google.com/session/13830506844453142156) | Otimização pronta; aguardava resposta sobre alterações adicionais de build. | Otimização e build já tratados na consolidação local. |
| [Log da worker-api](https://jules.google.com/session/17936752911051189053) | Trecho indicado no pedido não encontrado. | Solicitação obsoleta; preservar logs operacionais úteis. |
| [Comentários do App.tsx](https://jules.google.com/session/3925232027688075621) | Comentários indicados já estavam ausentes. | Solicitação obsoleta. |
| [Consultas da visão da plataforma](https://jules.google.com/session/6241454784228865443) | Refatoração e benchmark ainda dentro da sessão; revisão/precommit pendentes. | Revisar contadores, índices, autorização e diff com muita formatação antes de integrar. |

Também foram desligados **CI Auto-Fixer** e **Suggestions** do repositório.
As páginas foram reabertas e confirmaram os controles desmarcados. A aba
**Scheduled** não tinha tarefas agendadas. A janela dedicada ao Jules foi fechada.
Histórico, branches e trabalhos para revisão foram preservados. Outros projetos
e a conta Google não foram alterados.

## Esdras Passe: plano encontrado na conversa

Na [sessão aberta originalmente](https://jules.google.com/session/13564739735121763111),
intitulada “Add Unit Tests for createDashboardSnapshot”, havia uma mensagem de
04/09 propondo colocar a carteirinha em `MeuPerfilScreen`, com nome e QR via API,
condicionada a `partnerBenefitsEnabled`. A sessão estava inativa e a mensagem
aguardava autorização para implementar. Portanto, **era um plano, não um patch
funcional publicado**. Isso complementa a auditoria anterior das branches.

O `git fetch origin` desta conferência não trouxe alterações novas. A base local
de implementação continua no commit `2d48806`, na branch
`codex/consolidacao-local-2026-09-05`. Não houve merge indiscriminado nem push.

## Retomada e sequência técnica

O ambiente `demo-alvo-qa` foi reiniciado, com Auth/Firestore emulados, contas
fictícias recriadas por `qa:seed` e painel em `http://localhost:3001`.
As verificações HTTP/emuladores de `qa:registration` foram repetidas com sucesso:
acesso Kids por responsável/operador, autorização, CPF concorrente, idempotência,
Passe com consentimento, escrita direta bloqueada, rollback e limite de pessoas.

A emissão criptográfica do Passe já está no backend. Para exibi-lo no mobile,
o próximo trabalho precisa completar o vínculo confiável conta → pessoa:

- `AuthUser` prevê `personId`, mas `fetchTenantUser` não o devolve e
  `MeuPerfilScreen` só carrega os campos ministeriais do usuário.
- As regras de atualização do próprio usuário protegem papéis, organização e
  ativação, mas ainda não protegem `personId`. Não usá-lo como prova de identidade
  sem fechar essa escrita e definir o provisionamento do vínculo.
- A carteirinha deve usar o cadastro vinculado, consentimento e benefício ativo,
  sem buscar a identidade por simples coincidência de nome/e-mail.
- QR Kids em URL/cache, fotos privadas e fluxo responsável/operador continuam
  na fila de segurança; as otimizações do Jules ficam depois desse fechamento.

Esta retomada registra o estado e valida a base existente; não implementa a
carteirinha mobile nem publica painel, aplicativo ou regras em produção.
