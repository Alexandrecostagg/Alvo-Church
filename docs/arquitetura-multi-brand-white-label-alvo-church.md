# Arquitetura multi-brand e white-label do Alvo Church

Data: 19 de marco de 2026

## 1. Objetivo

Definir como o `Alvo Church` deve suportar:

- multi-tenant
- multi-brand
- modulos por organizacao
- planos e licencas
- co-branding
- white-label

sem quebrar a consistencia arquitetural do produto.

## 2. Principio central

Cada `organization` precisa ter nao apenas dados operacionais, mas tambem uma configuracao completa de produto.

Ou seja, cada tenant deve carregar:

- identidade
- modulos habilitados
- plano contratado
- recursos premium
- regras de exibicao de marca
- dominio e distribuicao

## 3. Camadas da arquitetura

### 3.1. Tenant layer

Responsavel por:

- isolamento de dados
- autenticacao contextualizada
- paths e consultas por `organizationId`
- configuracao contratual do cliente

### 3.2. Brand layer

Responsavel por:

- logo
- nome publico
- paleta
- tipografia opcional
- tokens visuais por tenant
- assets de app e web

### 3.3. Feature layer

Responsavel por:

- modulos ativos
- limites por plano
- gates de recursos
- recursos beta ou premium

### 3.4. Distribution layer

Responsavel por:

- subdominio Alvo
- dominio customizado
- app brand-driven
- configuracoes para publicacao futura por cliente premium

## 4. Estrutura recomendada de dados

### Collection principal

- `organizations/{organizationId}`

### Documento base da organizacao

Campos recomendados:

- `id`
- `slug`
- `legalName`
- `publicName`
- `displayName`
- `status`
- `countryCode`
- `locale`
- `timezone`
- `organizationType`
- `churchNetworkId?`

## 5. Configuracao comercial por tenant

Sugestao de subestrutura:

- `organizations/{organizationId}/settings/billing`
- `organizations/{organizationId}/settings/subscription`
- `organizations/{organizationId}/settings/features`

### Campos recomendados em subscription

- `planCode`
- `planTier`
- `billingCycle`
- `seatLimit?`
- `memberRange`
- `campusLimit?`
- `aiQuota?`
- `whiteLabelEnabled`
- `coBrandingEnabled`
- `multiCampusEnabled`
- `denominationalModeEnabled`
- `startedAt`
- `renewsAt?`
- `trialEndsAt?`

## 6. Configuracao de modulos

Sugestao:

- `organizations/{organizationId}/settings/features/modules`

Ou dentro de um unico documento:

- `modules.core`
- `modules.visitors`
- `modules.groups`
- `modules.events`
- `modules.children`
- `modules.youth`
- `modules.volunteers`
- `modules.tribes`
- `modules.journeys`
- `modules.communication`
- `modules.finance`
- `modules.ai`

Cada modulo pode ter:

- `enabled`
- `source`
- `limits`
- `beta`

## 7. Configuracao de branding

Sugestao de documento:

- `organizations/{organizationId}/settings/branding`

### Campos recomendados

- `brandMode`: `alvo_managed | co_branded | white_label`
- `publicProductName`
- `publicShortName`
- `logoLightUrl`
- `logoDarkUrl?`
- `iconUrl`
- `faviconUrl?`
- `primaryColor`
- `secondaryColor`
- `accentColor`
- `surfaceColor`
- `textColor`
- `fontHeading?`
- `fontBody?`
- `showPoweredByAlvo`
- `poweredByLabel?`

## 8. Configuracao de dominio e distribuicao

Sugestao de documento:

- `organizations/{organizationId}/settings/distribution`

Campos recomendados:

- `defaultSubdomain`
- `customDomain?`
- `customDomainStatus?`
- `webAppMode`: `shared | custom_domain`
- `mobileBrandingMode`: `shared | premium_branding | dedicated_build`
- `iosBundleId?`
- `androidPackageName?`
- `appStoreDisplayName?`
- `playStoreDisplayName?`

## 9. Design tokens por tenant

A UI deve ter tokens base da plataforma e tokens de override por organizacao.

### Camada 1. platform tokens

Exemplo:

- `brand.alvo.primary`
- `brand.alvo.surface`
- `brand.alvo.text`

### Camada 2. tenant tokens

Gerados dinamicamente a partir do branding do tenant:

- `tenant.primary`
- `tenant.secondary`
- `tenant.accent`
- `tenant.surface`
- `tenant.text`

### Regra importante

Mesmo em white-label, a estrutura visual do design system continua a mesma.

O que muda e:

- token
- asset
- naming
- dominancia de marca

Nao muda:

- semantica de componente
- regras de acessibilidade
- estrutura de layout

## 10. Feature gating na aplicacao

O frontend nao deve decidir sozinho quais modulos existem.

Fluxo recomendado:

1. autenticar usuario
2. carregar tenant context
3. carregar `subscription`, `features` e `branding`
4. montar `app runtime context`
5. exibir menus, telas e acoes com base em feature flags e papel do usuario

## 11. Runtime context recomendado

Objeto carregado no app/web:

- `organization`
- `branding`
- `subscription`
- `modules`
- `permissions`
- `campusScope?`
- `userRole`

Isso permite que web e mobile compartilhem a mesma logica de habilitacao.

## 12. Autorizacao e licenciamento

A liberacao de modulos deve considerar dois filtros:

- permissao do usuario
- habilitacao do tenant

Exemplo:

- o usuario pode ser `church_admin`
- mas se o modulo `tribes` estiver desabilitado no plano, ele nao aparece

## 13. Menus e navegacao orientados por contrato

A navegacao do produto deve ser calculada com base em:

- tenant modules
- user permissions
- branding mode

Exemplo:

- tenant sem `children`: nao mostra menu infantil
- tenant sem `finance`: nao mostra financeiro
- tenant white-label: troca nome e identidade no header e no app shell

## 14. Web e mobile

### Web

Deve suportar:

- tema por tenant
- logo por tenant
- dominio compartilhado ou customizado
- paginas publicas e privadas contextualizadas

### Mobile

Deve suportar em fases:

#### Fase 1

- branding dinamico em app compartilhado
- logo, nome e cores por tenant

#### Fase 2

- assets de splash e icone por modo premium
- branding mais profundo por configuracao remota

#### Fase 3

- builds dedicados por cliente white-label premium, se contratado

## 15. Cloudflare nessa estrategia

Cloudflare deve suportar:

- roteamento por dominio
- identificacao de tenant por host
- cache inteligente por tenant
- regras de seguranca por superficie publica
- protecao de formularios publicos multi-brand

## 16. Firebase nessa estrategia

Firebase continua funcionando bem, desde que a modelagem respeite:

- isolamento por `organizationId`
- settings por tenant
- leitura controlada por auth + role + feature state

Firestore pode armazenar:

- `organization`
- `branding`
- `subscription`
- `feature flags`
- `domain settings`

## 17. Riscos arquiteturais

### Risco 1. White-label superficial demais

Se o sistema permitir trocar so logo e cor, mas mantiver textos e naming fixos demais, o cliente premium vai sentir limitacao.

### Risco 2. White-label profundo cedo demais

Se tentarmos suportar builds dedicados por cliente desde o inicio, a operacao fica cara e lenta.

### Risco 3. Modulos acoplados

Se os dominios nao nascerem modulares, a comercializacao por modulo vira promessa vazia.

## 18. Recomendacao de implementacao por fases

### Fase 1

- multi-tenant real
- feature flags por tenant
- branding por tenant em web e mobile compartilhado
- planos base e crescimento

### Fase 2

- dominios customizados
- add-ons e quotas
- co-branding formal
- dashboards de licenca e assinatura

### Fase 3

- white-label premium
- distribuicao mobile premium
- suporte denominacional mais profundo

## 19. Decisao recomendada para o Alvo Church

O Alvo Church deve nascer como:

- `SaaS multi-tenant`
- `multi-module`
- `multi-brand ready`
- `white-label capable`, mas com rollout progressivo

Essa decisao protege o produto tecnicamente e abre espaco comercial real.

## 20. Proximos impactos no projeto

A partir desta definicao, os proximos documentos tecnicos devem incluir:

- modelagem de `organization settings`
- `feature flags` por tenant
- `branding engine`
- `subscription model`
- `domain routing`
- `menu resolver` por modulos e papel
