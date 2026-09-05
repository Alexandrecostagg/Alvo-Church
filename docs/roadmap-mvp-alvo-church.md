# Roadmap do MVP - Alvo Church

Criado em 17/03/2026. Estado de execução atualizado em **05/09/2026**.

## Execução atual

As ondas abaixo continuam sendo a visão de produto; não são uma lista de
entregas concluídas. Implementações de ondas avançadas surgiram antes do
fechamento da fundação. A prioridade agora é estabilizar a base existente.

| Onda | Situação em 05/09 | Próximo marco |
| --- | --- | --- |
| 1 — Fundação operacional | Cadastro completo e isolamento básico homologados; recepção, grupos, eventos e app parciais. | Fechar segurança, cadastros legados e QA por papel. |
| 2 — Engajamento e serviço | Jornadas, repertório, escalas e trocas têm implementação parcial. | Validar vínculo do usuário e fluxo completo no web/mobile. |
| 3 — Tribos | Scoring testado; telas, trilhas e histórico ainda precisam homologação integral. | Validar avaliação, revisão pastoral e reflexo na jornada. |
| 4 — IA e backoffice | APIs e cota principal presentes; automações/inteligência e backoffice não estão fechados. | Cota uniforme, dados reais, auditoria e recorte executável. |
| 5 — Rede/capacitação | Base de rede/EAD presente, com demos e expansão ainda planejada. | Não antecipar novos módulos antes de estabilizar o núcleo. |

A estimativa do escopo operacional avaliado é **cerca de 63%**, calculada no
[diagnóstico de implementação](status-implementacao-2026-09-05.md). Não mede toda
a visão futura do PRD nem prontidão para produção.

Próxima sequência: dependências → identidade/Passe → QR/fotos/fluxo Kids →
cadastros/limites → dados reais e homologação mobile. Consolidar a LP como
aplicação independente de publicação; manter o app no monorepo nesta fase.
Histórias e critérios de aceite ficam no [backlog ativo](backlog-mvp-implementacao-v2.md).

## 1. Objetivo

Definir um roadmap claro para construir o `Alvo Church` como:

- plataforma web administrativa
- app mobile para iOS e Android
- base preparada para IA

O objetivo do roadmap é:

- priorizar o que gera valor mais rápido
- evitar escopo excessivo no início
- alinhar produto, arquitetura e implementação

## 2. Princípio do roadmap

O Alvo Church é um sistema grande.

Por isso, o MVP não deve tentar entregar tudo ao mesmo tempo.

Minha recomendação é construir em 4 ondas:

1. fundação operacional
2. pertencimento e serviço
3. tribos, jornadas e engajamento
4. IA e inteligência pastoral-operacional

## 3. Definição do MVP

Para mim, o MVP do Alvo Church deve responder a esta pergunta:

`Uma igreja consegue usar o sistema no dia a dia para cadastrar pessoas, acolher visitantes, organizar células, iniciar serviço e acompanhar a jornada do membro pelo app?`

Se a resposta for sim, o MVP está correto.

## 4. Plataformas do MVP

O MVP deve nascer com:

- `web admin`
- `app mobile iOS`
- `app mobile Android`

No começo, o foco de cada canal deve ser:

### Web admin

- secretaria
- liderança
- operação da igreja
- cadastros
- células
- eventos
- visão administrativa

### App mobile

- membro
- visitante
- líder de célula
- voluntário

## 4.1 Direção estratégica do app

O app mobile deve ser planejado desde o início como uma extensão nativa da plataforma, não como um produto separado.

No curto prazo, ele deve resolver ações simples e frequentes:

- perfil do membro ou visitante
- próximas ações da jornada
- célula ou grupo
- eventos e inscrições
- notificações básicas
- pedidos de oração
- disponibilidade para servir

No médio prazo, o app deve evoluir para:

- carteirinha de membro
- conteúdos, vídeos, áudios e downloads
- planos de leitura e devocionais
- check-in em eventos
- agenda personalizada
- comunicação segmentada
- registro de estado atual da pessoa, como "como está se sentindo hoje?"
- recursos de líder de célula, voluntário e ministério

Regra de produto: tudo que acontecer no app precisa alimentar a mesma base do painel web. O app é a porta de relacionamento; o web admin é a mesa de operação e decisão.

## 5. Escopo do MVP fase 1

### Núcleo institucional

- autenticação
- multi-tenant
- organizações
- campi
- papéis e permissões

### Pessoas e famílias

- cadastro de pessoas
- cadastro de famílias
- relacionamento familiar
- perfil básico
- timeline inicial

### Visitantes e acolhimento

- cadastro de visitante
- origem do visitante
- follow-up inicial
- tarefas básicas de acompanhamento

### Células e grupos

- cadastro de grupos
- vínculo de membros
- presença
- líderes e co-líderes

### Eventos

- cadastro de eventos
- inscrições simples
- presença ou check-in básico

### App do membro

- login
- perfil
- jornada inicial
- visualização de célula
- eventos
- notificações básicas

## 6. O que fica fora da fase 1

Para proteger o foco, eu deixaria fora da fase 1:

- financeiro profundo
- check-in infantil completo
- voluntariado avançado
- módulo completo de jovens
- IA conversacional ampla
- analytics avançado
- automações sofisticadas

## 7. Fase 2 - Pertencimento e serviço

Depois da base operacional entrar, a fase 2 deve focar em:

- onboarding do membro
- jornadas básicas
- disponibilidade para servir
- ministérios recomendados
- voluntariado inicial
- badges de onboarding e serviço
- trilhas básicas de formação

## Entregas da fase 2

- módulo inicial de jornadas
- sistema básico de missões
- badges iniciais
- jornadas de visitante e pertencimento
- jornadas de serviço
- perfil expandido do membro

## 8. Fase 3 - Tribos e direcionamento

Essa fase é o diferencial estratégico do produto.

Entregas:

- catálogo de tribos
- questionário de tribos
- recomendação de tribo principal e secundária
- validação pastoral
- revisão e reclassificação
- trilhas por tribo
- recomendação de ministérios por tribo

## Resultado esperado

O membro começa a viver um app mais inteligente, mais pessoal e mais alinhado com sua caminhada.

## 9. Fase 4 - IA aplicada

Com base estruturada, entra a IA.

Entregas recomendadas:

- resumo inteligente de perfil do membro
- sugestão de follow-up para visitante
- recomendação explicada de tribo e ministério
- assistente do líder
- alertas de desalinhamento e desengajamento

## Resultado esperado

- menos esquecimento pastoral
- melhor priorização de acompanhamento
- experiência mais inteligente no app e no admin

## 10. Roadmap resumido por ondas

## Onda 1. Fundação operacional

Produto:

- auth
- pessoas e famílias
- visitantes
- grupos
- eventos
- app inicial
- validação de concorrência e conflitos de horários em escalas de voluntários

Técnico:

- monorepo
- Firebase base
- Cloudflare base
- design system inicial
- deploy inicial web e mobile
- regras de negócio de escalas de domínio

## Onda 2. Engajamento inicial

Produto:

- jornadas básicas
- missões básicas
- badges de onboarding
- serviço inicial (escalas e solicitações de trocas assistidas no app)
- módulo de louvor e repertório (Worship) para gestão de cifras, setlists e mídias

Técnico:

- estruturas de jornada
- notificações
- permissões refinadas
- repositório Firestore para `ScheduleSwapRequest`, `WorshipSong` e `WorshipSetlist`

## Onda 3. Tribos

Produto:

- questionário
- classificação
- trilhas por tribo
- reclassificação
- planos de leitura bíblica diários e devocionais no app do membro integrados à jornada

Técnico:

- módulo de tribos
- scoring engine
- histórico e auditoria
- controle devocional no banco de dados

## Onda 4. IA & Backoffice

Produto:

- copiloto de liderança
- resumos
- recomendações inteligentes
- controle de patrimônio físico e inventário de bens por campus

Técnico:

- camada de orquestração de IA
- fallback entre provedores
- logs e guardrails
- esquema Firestore para `PatrimonyItem`

## 11. Prioridade por persona

## Prioridade 1

- secretaria
- pastor ou administrador
- visitante
- membro comum

## Prioridade 2

- líder de célula
- voluntário

## Prioridade 3

- líder ministerial
- supervisor

## 12. Sequência recomendada de construção

### Etapa 1

- fundação técnica
- autenticação
- multi-tenant
- modelo de pessoas e famílias

### Etapa 2

- visitantes
- tarefas
- células
- presença

### Etapa 3

- app do membro
- eventos
- notificações

### Etapa 4

- jornadas
- badges
- serviço inicial (escalas, prevenção de conflitos e trocas assistidas)
- repertório de louvor básico (Worship)

### Etapa 5

- módulo de tribos
- questionário
- reclassificação
- devocionais e planos de leitura no app

### Etapa 6

- IA inicial
- resumos
- recomendações
- controle patrimonial e inventário de bens

## 13. MVP técnico recomendado

Se eu fosse definir o recorte exato do MVP para primeira entrega real, seria:

- login e permissões
- cadastro de pessoas e famílias
- cadastro de visitantes com follow-up
- grupos e presença
- eventos simples
- app do membro com perfil e próximas ações
- jornada básica de onboarding

Isso já colocaria o produto em uso real.

## 14. Indicadores para saber se o MVP funcionou

- número de pessoas cadastradas por igreja
- taxa de visitantes acompanhados
- número de grupos ativos
- presenças lançadas
- membros ativos no app
- taxa de conclusão da jornada inicial

## 15. O que pode esperar para depois

Pode entrar depois, sem prejudicar o MVP:

- check-in infantil avançado
- módulo financeiro robusto
- analytics profundo
- IA avançada
- automações complexas
- gestão de jovens mais rica
- capacitação em rede (cursos/trilhas criados pela sede e distribuídos às igrejas afiliadas, diagnóstico periódico por igreja, certificação de liderança em rede — ver Módulo 15 do PRD)

## 16. Minha recomendação prática

Se quisermos manter o Alvo Church sólido e executável, eu seguiria exatamente esta ordem:

1. base operacional da igreja
2. app com jornada inicial
3. serviço e engajamento
4. tribos
5. IA

## 17. Próximos passos de execução

Arquitetura, backlog e interfaces já existem. Executar a fila P0/P1 do backlog
ativo, registrar validação por entrega e atualizar a medição. Não reiniciar
wireframes ou scaffolding como se o projeto ainda estivesse na fase de desenho.

## 18. Onda 5 (pós-MVP). Rede e capacitação

Depois que o tier `Denominação`/`Rede de Igrejas` estiver validado comercialmente (ver `modelo-saas-modularizacao-comercial-alvo-church.md`), a onda seguinte conecta o módulo de Network já existente ao módulo de Academia/LMS já existente:

Produto:

- curso/trilha de escopo `network`, criado pela organização-sede e propagado às igrejas afiliadas ativas
- card de capacitação no dashboard da rede (líderes certificados, trilhas concluídas por igreja), ao lado dos KPIs financeiros e de membros já existentes
- diagnóstico periódico de saúde por igreja afiliada (inspirado no modelo de pesquisa do NCD), sinalizando o principal ponto de vazamento de membros
- evento-âncora replicável da rede, com inscrição e presença por igreja afiliada

Técnico:

- `Course` ganha `scope: "organization" | "network"` e `ownerOrganizationId`
- resolução de cursos visíveis por igreja passa a considerar cursos próprios + cursos de rede herdados via `NetworkAffiliate`
- agregação de progresso/certificação por igreja no `network-view.tsx`
- novo repositório Firestore para `NetworkHealthDiagnostic` e `LeadershipCertification`
