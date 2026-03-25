# Arquitetura técnica do monorepo - Alvo Church

Data: 17 de março de 2026

## 1. Objetivo

Definir a arquitetura técnica inicial do `Alvo Church` para suportar:

- painel web administrativo
- app mobile iOS e Android
- backend serverless
- Firebase
- Cloudflare
- integrações de IA

O objetivo é criar uma base:

- escalável
- organizada
- rápida de desenvolver
- adequada para um SaaS multi-tenant

## 2. Decisão principal

Minha recomendação é usar um `monorepo`.

Motivos:

- web e mobile compartilham domínio e regras de negócio
- design system pode ser reutilizado
- tipos e contratos podem ser centralizados
- integrações com Firebase e IA podem ser padronizadas
- reduz duplicação e divergência entre apps

## 3. Stack recomendada

### Frontend web

- `Next.js`
- `TypeScript`
- `Tailwind CSS`

### Mobile

- `React Native`
- `Expo`
- `TypeScript`

### Backend

- `Firebase Auth`
- `Firestore`
- `Firebase Storage`
- `Firebase Cloud Messaging`
- `Cloudflare Workers`

### Infra auxiliar

- `GitHub Actions`
- `Cloudflare DNS / WAF / Cache`

### IA

- `Groq`
- `Llama`
- `Gemini` como fallback

## 4. Estrutura recomendada do monorepo

Minha sugestão é esta:

```text
alvo-church/
  apps/
    web/
    mobile/
    worker-api/
  packages/
    ui/
    config/
    types/
    domain/
    firebase/
    ai/
    analytics/
    utils/
  docs/
  scripts/
  .github/
```

## 5. Papel de cada app

## 5.1 `apps/web`

Painel administrativo e portal web.

Responsabilidades:

- login administrativo
- gestão de pessoas e famílias
- visitantes e follow-up
- grupos e células
- eventos
- voluntariado
- visualização de jornadas
- administração do módulo de tribos
- dashboards básicos

Também pode incluir páginas públicas como:

- formulário de visitante
- landing de eventos
- formulário de integração

## 5.2 `apps/mobile`

Aplicativo para iOS e Android.

Responsabilidades:

- login do membro
- perfil
- jornada atual
- células e grupos
- eventos
- badges e progresso
- questionário de tribos
- notificações push
- recomendações e próximos passos

Usuários principais:

- visitante
- membro
- voluntário
- líder de célula

## 5.3 `apps/worker-api`

Camada pública e orquestradora usando Cloudflare Workers.

Responsabilidades:

- APIs públicas
- roteamento seguro
- proteção de endpoints
- webhooks
- mediação com serviços externos
- orquestração de IA
- fallback de provedores

## 6. Papel dos packages

## 6.1 `packages/ui`

Design system compartilhado.

Conteúdo:

- componentes base
- tokens visuais
- componentes de formulário
- cards de jornada
- badges
- elementos de navegação

## 6.2 `packages/config`

Configurações compartilhadas.

Conteúdo:

- eslint
- typescript
- prettier
- tailwind presets
- configs de build

## 6.3 `packages/types`

Tipos compartilhados.

Conteúdo:

- entidades principais
- enums
- contratos de API
- payloads de eventos

## 6.4 `packages/domain`

Regras de negócio puras.

Conteúdo:

- modelos de pessoa e família
- regras de jornada
- regras de tribos
- cálculo de progresso
- políticas de revisão

Importante:

- este pacote deve conter lógica sem depender de UI

## 6.5 `packages/firebase`

Camada compartilhada de integração com Firebase.

Conteúdo:

- clientes
- helpers de auth
- acesso a Firestore
- storage helpers
- abstrações de collections

## 6.6 `packages/ai`

Camada de IA.

Conteúdo:

- roteador de provedores
- prompts versionados
- tasks de IA
- guardrails
- logs de chamadas

## 6.7 `packages/analytics`

Camada para eventos e métricas.

Conteúdo:

- eventos de produto
- tracking de jornada
- eventos de app e web
- medição de conversão

## 6.8 `packages/utils`

Utilitários comuns.

Conteúdo:

- datas
- formatação
- validação
- parsing

## 7. Modelo de arquitetura por camadas

Eu recomendo esta separação:

### Camada de apresentação

- `apps/web`
- `apps/mobile`

### Camada de aplicação

- fluxos e use cases
- formulários
- controle de navegação
- ações do usuário

### Camada de domínio

- regras de negócio
- entidades
- jornadas
- tribos
- permissões

### Camada de infraestrutura

- Firebase
- Cloudflare
- IA
- storage
- notificações

## 8. Organização por domínio

Mesmo dentro dos apps, vale organizar por domínio funcional.

Domínios iniciais sugeridos:

- auth
- organizations
- people
- families
- visitors
- groups
- events
- tribes
- journeys
- badges
- notifications
- ai

## 9. Modelo de dados e persistência

## Banco principal

Minha recomendação inicial, dado o stack escolhido:

- `Firestore`

Uso:

- dados transacionais do MVP
- perfis
- jornadas
- avaliações de tribos
- grupos
- eventos

## Cuidados importantes com Firestore

Firestore funciona bem no início, mas exige desenho cuidadoso.

Precisamos cuidar de:

- estrutura multi-tenant
- limites de consulta
- subcollections bem pensadas
- índices compostos
- auditoria

## Estratégia recomendada

Usar:

- documentos centrais por domínio
- subcollections só quando fizer sentido claro
- IDs estáveis
- duplicação controlada para leitura rápida

## 9.1. Observacao comercial e de marca

A arquitetura multi-tenant deve considerar desde a base:

- planos por organizacao
- modulos habilitados por organizacao
- branding por organizacao
- suporte futuro a co-branding e white-label

## 10. Estratégia multi-tenant

O sistema deve nascer multi-tenant.

Sugestão de estrutura lógica:

- `organizations/{organizationId}`
- `organizations/{organizationId}/people/{personId}`
- `organizations/{organizationId}/families/{familyId}`
- `organizations/{organizationId}/groups/{groupId}`
- `organizations/{organizationId}/events/{eventId}`
- `organizations/{organizationId}/tribes/{tribeId}`

## Regra importante

Toda consulta da aplicação deve nascer contextualizada por:

- `organizationId`

## 11. Autenticação e autorização

## Autenticação

Minha recomendação:

- `Firebase Auth`

Métodos possíveis:

- email e senha
- link mágico no futuro
- social login opcional depois

## Autorização

A autorização não deve ficar só no frontend.

Sugestão:

- claims básicas no auth
- papéis detalhados em Firestore
- regras em backend e Cloudflare Worker

Papéis iniciais:

- super_admin
- church_admin
- pastor
- secretary
- group_leader
- ministry_leader
- member

## 12. Cloudflare na arquitetura

Cloudflare deve funcionar como:

- camada de borda
- segurança
- roteador de APIs públicas
- mediação com IA

## Usos recomendados

- WAF
- rate limiting
- cache para páginas públicas
- Workers para endpoints públicos
- proteção contra abuso em formulários
- proxy seguro para chamadas de IA

## 13. Estratégia de IA na arquitetura

A camada de IA não deve ficar espalhada no app.

Ela deve passar por um orquestrador.

Fluxo recomendado:

1. web ou mobile dispara ação
2. backend valida contexto e permissões
3. `packages/ai` monta tarefa
4. `apps/worker-api` escolhe provedor
5. resposta é devolvida com log e metadados

## Tipos iniciais de tasks

- `summarize_member_profile`
- `suggest_visitor_followup`
- `explain_tribe_result`
- `suggest_ministry_match`
- `leader_weekly_digest`

## 14. Estratégia de notificações

Minha recomendação:

- `Firebase Cloud Messaging`

Usos:

- lembrete de evento
- próxima missão da jornada
- reengajamento
- revisão de tribo
- tarefa para líder

## 15. Estratégia de uploads

Minha recomendação:

- `Firebase Storage`

Usos:

- foto de perfil
- anexos de eventos
- documentos internos quando permitido

## 16. Observabilidade e logs

Desde o início, precisamos registrar:

- erros de app
- erros de backend
- eventos críticos
- chamadas de IA
- validações pastorais
- reclassificações de tribo

Mesmo no MVP, isso precisa existir pelo menos de forma básica.

## 17. CI/CD recomendado

Usaria:

- `GitHub Actions`

Pipelines iniciais:

- lint
- typecheck
- testes
- build web
- build mobile
- validação de configs

## 18. Organização inicial de branches

Sugestão:

- `main`
- branches curtas por feature com prefixo `codex/`

## 19. Módulos prioritários do domínio

## Primeira camada

- auth
- people
- families
- visitors
- groups
- events

## Segunda camada

- journeys
- badges
- ministries
- volunteering

## Terceira camada

- tribes
- ai
- analytics

## 20. Estrutura sugerida dentro de `apps/web`

```text
apps/web/src/
  app/
  components/
  features/
    auth/
    people/
    families/
    visitors/
    groups/
    events/
    tribes/
    journeys/
  lib/
  providers/
```

## 21. Estrutura sugerida dentro de `apps/mobile`

```text
apps/mobile/src/
  app/
  screens/
  features/
    auth/
    profile/
    journeys/
    groups/
    events/
    tribes/
    notifications/
  lib/
  providers/
```

## 22. Estrutura sugerida do `packages/domain`

```text
packages/domain/src/
  auth/
  people/
  families/
  visitors/
  groups/
  events/
  tribes/
  journeys/
  badges/
  permissions/
```

## 23. Decisões técnicas importantes

### Decisão 1

Centralizar regra de negócio em `packages/domain`.

### Decisão 2

Não deixar regra crítica só no app mobile ou só no web.

### Decisão 3

Passar IA por camada própria.

### Decisão 4

Modelar multi-tenant desde o começo.

### Decisão 5

Separar bem:

- classificação automática
- validação pastoral
- histórico

## 24. Sequência ideal de implementação técnica

1. criar monorepo
2. configurar web e mobile
3. configurar Firebase base
4. configurar Cloudflare Worker
5. criar packages compartilhados
6. implementar auth
7. implementar domínio de pessoas e famílias
8. implementar visitantes e grupos
9. implementar jornadas
10. implementar tribos
11. integrar IA

## 25. Minha recomendação final

Se eu fosse fechar a tese técnica do Alvo Church em uma frase:

`Um monorepo TypeScript com Next.js, Expo, Firebase e Cloudflare, organizado por domínio, com regras compartilhadas, multi-tenant desde a base e uma camada própria de IA.`

## 26. Próximo passo ideal

Depois desta arquitetura, os próximos passos mais fortes são:

1. backlog do MVP com épicos e histórias
2. estrutura inicial do monorepo no repositório
3. wireframes principais do web admin e do app
