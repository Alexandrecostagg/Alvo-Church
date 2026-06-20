# Contexto de sessão — Épico 13: Feature Gate e Menu Progressivo

Use este arquivo para retomar o trabalho no Claude Code. Cole o conteúdo abaixo no início da conversa.

---

## O projeto

Monorepo **Alvo Church** (pnpm + Turborepo). Stack: Next.js App Router (apps/web), Expo (apps/mobile), Cloudflare Worker (apps/worker-api), Firebase (Firestore + Auth).

```
packages/
  types/src/index.ts       ← todos os tipos de domínio (@alvo/types)
  domain/src/index.ts      ← funções de domínio (@alvo/domain)
  firebase/src/index.ts    ← SDK Firebase + repositórios (@alvo/firebase)
apps/web/
  app/providers.tsx        ← AppProviders + useAppAuth()
  app/(authenticated)/
    layout.tsx             ← layout autenticado
    module-nav.tsx         ← menu lateral
  contexts/
    OrgFeaturesContext.tsx ← feature gate (novo)
```

---

## O que foi implementado nesta sessão (Épico 13)

### Arquivos criados

**`packages/domain/src/featureGate.ts`**
- `ModuleKey` = union das chaves de `OrganizationFeaturesSettings["modules"]`
- `ModulesConfig` = tipo do objeto de módulos
- `isModuleEnabled(modules, key)` — função pura
- `getEnabledModuleCount(modules)` — contagem de módulos ativos

**`packages/firebase/src/orgFeatures.ts`**
- `fetchOrgFeatures(config, organizationId)` — wrapper limpo sobre `fetchOrganizationFeaturesSettings` do repositório

**`apps/web/contexts/OrgFeaturesContext.tsx`**
- `OrgFeaturesProvider` — deriva de `useAppAuth().tenantRuntime` (sem segunda chamada ao Firestore)
- `useOrgFeatures()` — retorna `{ features, ready, isEnabled }`
- `useModuleEnabled(key)` — hook direto para uso nos componentes

**`apps/web/app/(authenticated)/upgrade/page.tsx`**
- Tela simples exibida quando módulo não está ativo
- Aceita query param `?module=finance` para mostrar o nome do módulo bloqueado
- Para usar: `redirect('/upgrade?module=finance')` no page.tsx da rota protegida

### Arquivos modificados

**`packages/domain/src/index.ts`**
- Removeu `isModuleEnabled` e `getEnabledModuleCount` (estavam duplicados)
- Adicionou `export * from "./featureGate"`

**`packages/firebase/src/index.ts`**
- Adicionou `export * from "./orgFeatures"`

**`apps/web/app/(authenticated)/layout.tsx`**
- Envolveu o layout com `<OrgFeaturesProvider>`

**`apps/web/app/(authenticated)/module-nav.tsx`**
- Cada item de nav tem `moduleKey?: ModuleKey` opcional
- Itens sem `moduleKey` = sempre visíveis (core)
- Itens com `moduleKey` = filtrados por `isEnabled(key)` do contexto
- Enquanto `tenantReady === false`, itens com gate ficam ocultos (menu progressivo)

### Mapeamento módulo → itens do menu

| ModuleKey       | Itens do menu                          |
|-----------------|----------------------------------------|
| `visitors`      | Recepção, Painel Pastor                |
| `ai`            | IA Pastoral                            |
| `finance`       | Finanças                               |
| `communication` | Marketplace                            |
| `tribes`        | Tribos                                 |
| `groups`        | Células                                |
| `journeys`      | Jornadas, Escola EAD                   |
| `events`        | Eventos                                |
| `volunteers`    | Escalas, Louvor & Cifras               |
| `children`      | Segurança Kids                         |
| sem moduleKey   | Dashboard, Minha Área, Pessoas, Novo Membro, Organizações |

---

## Fonte de verdade no Firestore

```
organizations/{organizationId}/settings/features
```

Documento contém `modules: { [key]: { enabled: boolean, source, beta?, limits? } }`.

O `organizationId` hoje está hardcoded como `"org_alvo_demo"` em `apps/web/app/providers.tsx` (linha 26). Isso precisa ser dinamizado em algum momento.

---

## O que ainda falta no Épico 13

- [ ] **Guard nas rotas** — cada `page.tsx` de módulo gated deve chamar `redirect('/upgrade?module=X')` quando o módulo não está ativo. Hoje o menu some, mas a URL ainda é acessível diretamente.
- [ ] **Badge "beta"** no menu — itens de módulos com `beta: true` no Firestore deveriam mostrar um badge visual.
- [ ] **organizationId dinâmico** — remover o hardcode `"org_alvo_demo"` e derivar do usuário autenticado (provavelmente do custom claim do Firebase ou do documento do user no Firestore).
- [ ] **Skeleton do menu** — enquanto `tenantReady === false`, o menu mostra só os itens core. Poderia ter um estado visual de loading mais explícito.
- [ ] **Testes** — `isModuleEnabled` e `getEnabledModuleCount` são funções puras prontas para unit test.

---

## Como retomar no Claude Code

```bash
cd /Users/alexandregomesdacosta/Documents/Projetos_DEV/Alvo-Church
# cole o conteúdo deste arquivo no início da conversa com o Claude Code
# ou rode: cat CONTEXT.md
```

Sugira ao Claude Code que leia este arquivo primeiro:
> "Leia o CONTEXT.md na raiz do projeto e continue o Épico 13 a partir do que falta."
