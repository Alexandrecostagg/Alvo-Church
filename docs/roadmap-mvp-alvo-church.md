# Roadmap do MVP - Alvo Church

Data: 17 de março de 2026

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

Técnico:

- monorepo
- Firebase base
- Cloudflare base
- design system inicial
- deploy inicial web e mobile

## Onda 2. Engajamento inicial

Produto:

- jornadas básicas
- missões básicas
- badges de onboarding
- serviço inicial

Técnico:

- estruturas de jornada
- notificações
- permissões refinadas

## Onda 3. Tribos

Produto:

- questionário
- classificação
- trilhas por tribo
- reclassificação

Técnico:

- módulo de tribos
- scoring engine
- histórico e auditoria

## Onda 4. IA

Produto:

- copiloto de liderança
- resumos
- recomendações inteligentes

Técnico:

- camada de orquestração de IA
- fallback entre provedores
- logs e guardrails

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
- serviço inicial

### Etapa 5

- módulo de tribos
- questionário
- reclassificação

### Etapa 6

- IA inicial
- resumos
- recomendações

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

## 16. Minha recomendação prática

Se quisermos manter o Alvo Church sólido e executável, eu seguiria exatamente esta ordem:

1. base operacional da igreja
2. app com jornada inicial
3. serviço e engajamento
4. tribos
5. IA

## 17. Próximos passos ideais

Depois deste roadmap, eu recomendo fazer nesta ordem:

1. arquitetura técnica do monorepo
2. backlog do MVP com épicos e histórias
3. wireframes do web admin e app mobile
