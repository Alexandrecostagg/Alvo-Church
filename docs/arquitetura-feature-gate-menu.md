# Arquitetura do feature gate e menu progressivo - Alvo Church

Data: 19 de junho de 2026

## 1. Objetivo

Definir como o Alvo Church controla quais módulos, rotas e itens de menu aparecem para cada organização, garantindo que:

- igrejas pequenas vejam apenas o que precisam
- igrejas grandes ativem camadas adicionais
- nenhum módulo novo polua a experiência de quem não contratou
- web e app mobile usem a mesma fonte de verdade para visibilidade

## 2. Princípio central

O sistema não cresce adicionando telas — cresce ativando módulos.

A visibilidade de cada parte do produto é controlada pelo `feature gate` da organização, lido no momento do login e mantido em contexto durante toda a sessão.

Isso significa:

- o código de todos os módulos existe no sistema
- o menu lateral, as rotas protegidas e as abas do app só renderizam o que o plano da organização liberou
- uma organização no plano base vê 6 itens no menu; no plano avançado, vê até 14

## 3. Fonte de verdade

A configuração de módulos de cada tenant vive em:

`organizations/{organizationId}/settings/features`

Campos por módulo:

- `enabled`: boolean
- `source`: `plan | addon | trial | manual`
- `enabledAt`: timestamp
- `limits`: objeto com limites específicos (ex: `{ maxSeats: 100, aiQuota: 500 }`)
- `beta`: boolean

Exemplo de documento:

```json
{
  "modules": {
    "core": { "enabled": true, "source": "plan" },
    "visitors": { "enabled": true, "source": "plan" },
    "groups": { "enabled": true, "source": "plan" },
    "events": { "enabled": true, "source": "plan" },
    "communication": { "enabled": false },
    "giving": { "enabled": false },
    "publicForms": { "enabled": false },
    "youth": { "enabled": false },
    "pastoralCare": { "enabled": false },
    "workflows": { "enabled": false },
    "ead": { "enabled": false },
    "analytics": { "enabled": false },
    "missions": { "enabled": false },
    "finance": { "enabled": true, "source": "plan" },
    "ai": { "enabled": false },
    "multiCampus": { "enabled": false },
    "whiteLabelPortal": { "enabled": false }
  }
}
```

## 4. Como o frontend consome o gate

### 4.1 Carregamento

Ao autenticar, o sistema carrega o documento de features da organização e armazena no contexto global:

```ts
// packages/domain/src/featureGate.ts
export type ModuleKey = keyof typeof MODULE_KEYS

export function isModuleEnabled(modules: ModulesConfig, key: ModuleKey): boolean {
  return modules?.[key]?.enabled === true
}
```

### 4.2 Menu lateral (web)

O menu lateral é gerado dinamicamente a partir de uma lista declarativa de itens, cada um com um `requiredModule`:

```ts
const MENU_ITEMS: MenuItem[] = [
  { label: 'Dashboard', route: '/', icon: 'home', requiredModule: 'core' },
  { label: 'Recepção', route: '/reception', icon: 'door', requiredModule: 'visitors' },
  { label: 'Painel Pastor', route: '/reception?pastor=1', icon: 'user-check', requiredModule: 'visitors' },
  { label: 'Pessoas', route: '/members', icon: 'users', requiredModule: 'core' },
  { label: 'Células', route: '/groups', icon: 'circles', requiredModule: 'groups' },
  { label: 'Eventos', route: '/events', icon: 'calendar', requiredModule: 'events' },
  { label: 'Comunicação', route: '/communication', icon: 'mail', requiredModule: 'communication' },
  { label: 'Doações', route: '/giving', icon: 'heart', requiredModule: 'giving' },
  { label: 'Finanças', route: '/finance', icon: 'chart', requiredModule: 'finance' },
  { label: 'Jovens', route: '/youth', icon: 'star', requiredModule: 'youth' },
  { label: 'Cuidado Pastoral', route: '/pastoral-care', icon: 'hand-heart', requiredModule: 'pastoralCare' },
  { label: 'Automações', route: '/workflows', icon: 'zap', requiredModule: 'workflows' },
  { label: 'Escola EAD', route: '/learning/academy', icon: 'book', requiredModule: 'ead' },
  { label: 'Analytics', route: '/analytics', icon: 'bar-chart', requiredModule: 'analytics' },
  { label: 'Missões', route: '/missions', icon: 'globe', requiredModule: 'missions' },
  { label: 'IA Pastoral', route: '/pastoral-ai', icon: 'cpu', requiredModule: 'ai' },
  { label: 'Marketplace', route: '/marketplace-community', icon: 'store', requiredModule: 'core' },
  { label: 'Tribos', route: '/tribes', icon: 'flag', requiredModule: 'core' },
  { label: 'Jornadas', route: '/journeys', icon: 'map', requiredModule: 'core' },
  { label: 'Louvor & Cifras', route: '/serving/worship', icon: 'music', requiredModule: 'core' },
  { label: 'Escalas', route: '/serving', icon: 'list', requiredModule: 'core' },
  { label: 'Kids Security', route: '/kids/scan', icon: 'shield', requiredModule: 'core' },
]

// Renderização filtrada
const visibleItems = MENU_ITEMS.filter(item =>
  isModuleEnabled(orgModules, item.requiredModule)
)
```

### 4.3 Proteção de rotas (web)

Cada rota protegida verifica o gate antes de renderizar:

```ts
// apps/web/src/middleware/moduleGuard.ts
export function requireModule(moduleKey: ModuleKey) {
  return (ctx: AppContext) => {
    if (!isModuleEnabled(ctx.org.modules, moduleKey)) {
      redirect('/upgrade') // ou página de "módulo não disponível no seu plano"
    }
  }
}
```

### 4.4 App mobile

O app mobile carrega os mesmos módulos ao autenticar e filtra as abas do menu inferior e as seções da tela inicial com a mesma lógica:

```ts
// apps/mobile/src/navigation/tabs.ts
const MOBILE_TABS = [
  { label: 'Início', screen: 'Home', requiredModule: 'core' },
  { label: 'Agenda', screen: 'Events', requiredModule: 'events' },
  { label: 'Jornada', screen: 'Journey', requiredModule: 'core' },
  { label: 'Cursos', screen: 'EAD', requiredModule: 'ead' },
  { label: 'Benefícios', screen: 'Marketplace', requiredModule: 'core' },
]

const visibleTabs = MOBILE_TABS.filter(tab =>
  isModuleEnabled(orgModules, tab.requiredModule)
)
```

## 5. Regras de exibição por camada de plano

### Camada 0 — Núcleo (todos os planos)

Módulos sempre ativos: `core`, `visitors`, `groups`, `events`, `finance`, `kids`

Itens visíveis: Dashboard, Recepção, Painel Pastor, Pessoas, Células, Eventos, Finanças, Kids Security, Marketplace, Tribos, Jornadas, Louvor & Cifras, Escalas

### Camada 1 — Operacional completo (Plano Base expandido)

Módulos adicionais: `communication`, `giving`, `publicForms`

Novos itens: Comunicação, Doações

### Camada 2 — Ministério e cuidado (Plano Crescimento)

Módulos adicionais: `youth`, `pastoralCare`, `workflows`, `ead`, `analytics`, `missions`

Novos itens: Jovens, Cuidado Pastoral, Automações, Escola EAD, Analytics, Missões

### Camada 3 — Enterprise e denominacional (Plano Avançado)

Módulos adicionais: `ai`, `multiCampus`, `whiteLabelPortal`, `denominational`

Novos itens: IA Pastoral (ou integrado ao Dashboard), controles multi-campus

## 6. Páginas públicas (fora do menu)

Formulários públicos, portal da igreja e links de doação são URLs públicas sem autenticação. Eles não entram no menu lateral. A secretaria acessa via Configurações > Links Públicos.

Rotas públicas seguem o padrão:

- `/p/{orgSlug}/visit` — formulário de visitante
- `/p/{orgSlug}/events/{eventSlug}` — página de evento público
- `/p/{orgSlug}/give` — link de doação
- `/p/{orgSlug}` — portal público da igreja

## 7. Tela de upgrade

Quando um usuário tenta acessar uma rota de módulo não ativo, o sistema redireciona para `/upgrade` com contexto do módulo solicitado, exibindo:

- nome do módulo
- o que ele oferece
- em qual plano está disponível
- botão para falar com a equipe Alvo

Isso transforma tentativas de acesso em oportunidades de venda.

## 8. Regra de ouro

Nenhum módulo novo entra como item de primeiro nível no menu sem aprovação de produto.

Todo módulo novo entra primeiro como:

1. sub-item dentro de um módulo existente
2. aba dentro de uma página existente
3. item de menu próprio apenas se o módulo tiver fluxo independente e frequência de uso diária

Exemplos:
- Giving → aba dentro de Finanças
- Cuidado Pastoral → submenu dentro de Pessoas
- Jovens → seção dentro de Células com filtro por faixa etária
- Portal Público → acesso via Configurações, não menu lateral
