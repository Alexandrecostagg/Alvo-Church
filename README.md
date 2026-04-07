# Alvo Church

Monorepo inicial do Alvo Church.

## Stack

- Next.js para web admin
- Expo + React Native para iOS e Android
- Cloudflare Workers para APIs públicas e orquestração
- Firebase para auth, banco, storage e push

## Estrutura

```text
apps/
  web/
  mobile/
  worker-api/
packages/
  ai/
  analytics/
  config/
  domain/
  firebase/
  types/
  ui/
  utils/
docs/
```

## Scripts

Os scripts serao executados via `pnpm`.

- `pnpm dev`
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm seed:firebase`
- `pnpm build:cloudflare:web`

## Deploy do web no Cloudflare

Para publicar o painel web com `Next.js 16` no Cloudflare, o caminho recomendado e usar `OpenNext for Cloudflare` no app web.

Arquivos-base:

- [apps/web/open-next.config.ts](/Users/alexandregomesdacosta/Documents/Projetos%20DEV/Alvo%20Church/apps/web/open-next.config.ts)
- [apps/web/wrangler.jsonc](/Users/alexandregomesdacosta/Documents/Projetos%20DEV/Alvo%20Church/apps/web/wrangler.jsonc)

Scripts:

```bash
corepack pnpm build:cloudflare:web
corepack pnpm --filter @alvo/web preview:cloudflare
corepack pnpm --filter @alvo/web deploy:cloudflare
```

Observacao importante:

- `@cloudflare/next-on-pages` nao e mais o caminho recomendado para este projeto
- como o Alvo usa `Next 16`, o deploy correto e via `@opennextjs/cloudflare`
- para Git deploy no Cloudflare, use um projeto baseado em `Worker`, apontando para `apps/web/wrangler.jsonc`

Variaveis de ambiente necessarias:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=alvo-church.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=alvo-church
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=alvo-church.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## Seed inicial do Firebase

Para popular o projeto com os primeiros documentos:

1. defina `FIREBASE_SERVICE_ACCOUNT_JSON` com o JSON da service account
2. opcionalmente defina `FIREBASE_PROJECT_ID`
3. execute `corepack pnpm seed:firebase`

## Configuracao do app web com Firebase

Para o painel web ler dados reais e autenticar usuarios:

1. abra `Firebase Console > Configuracoes do projeto`
2. em `Seus aplicativos`, crie um app da Web
3. copie a configuracao do SDK Web
4. crie um arquivo `.env.local` na raiz com:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=alvo-church.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=alvo-church
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=alvo-church.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Depois disso, execute `corepack pnpm --filter @alvo/web dev`.

## Firestore Rules do tenant

O projeto agora usa regras orientadas a tenant em [firestore.rules](/Users/alexandregomesdacosta/Documents/Projetos%20DEV/Alvo%20Church/firestore.rules):

```text
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    ...
  }
}
```

Essas regras assumem:

1. cada usuario autenticado possui um documento em `organizations/{orgId}/users/{uid}`
2. o bootstrap desse documento e feito automaticamente pelo app web e mobile na primeira sessao
3. `settings` e escrita geral do tenant exigem perfis administrativos

Para publicar:

1. abra `Firestore > Regras`
2. copie o conteudo de `firestore.rules`
3. publique no projeto

## Storage Rules do tenant

O upload de logo, icone e favicon usa [storage.rules](/Users/alexandregomesdacosta/Documents/Projetos%20DEV/Alvo%20Church/storage.rules).

Essas regras permitem:

- leitura autenticada por membro do tenant
- escrita apenas para perfis administrativos do tenant
- upload restrito ao namespace `organizations/{orgId}/branding/...`

Para publicar:

1. abra `Storage > Regras`
2. copie o conteudo de `storage.rules`
3. publique no projeto

## Upload de assets com Cloudflare

Como o Firebase Storage pode exigir plano pago, o projeto agora esta preparado para upload de marca via `Cloudflare Worker + R2`.

Arquivos-base:

- Worker: [apps/worker-api/src/index.ts](/Users/alexandregomesdacosta/Documents/Projetos%20DEV/Alvo%20Church/apps/worker-api/src/index.ts)
- Wrangler: [apps/worker-api/wrangler.jsonc](/Users/alexandregomesdacosta/Documents/Projetos%20DEV/Alvo%20Church/apps/worker-api/wrangler.jsonc)

Configuracoes necessarias:

1. criar um bucket R2 para assets de marca
2. ajustar `bucket_name` no `wrangler.jsonc`
3. definir no Worker o secret `UPLOAD_API_BEARER_TOKEN`
4. definir no web a variavel:

```bash
NEXT_PUBLIC_UPLOAD_API_BASE_URL=
```

Fluxo:

- o painel envia o arquivo para `POST /tenant-assets/upload`
- o Worker grava no R2 em `organizations/{orgId}/branding/...`
- o Worker devolve a URL publica
- o painel salva essa URL no Firestore em `settings/branding`

Enquanto `NEXT_PUBLIC_UPLOAD_API_BASE_URL` nao estiver configurada, o painel continua funcionando com preenchimento manual das URLs.

## Status

Base inicial do monorepo criada a partir da arquitetura definida em [docs/arquitetura-tecnica-monorepo-alvo-church.md](/Users/alexandregomesdacosta/Documents/New%20project/docs/arquitetura-tecnica-monorepo-alvo-church.md).
