# Consolidação local — 05/09/2026

Sessão iniciada em 04/09 no horário de Belém. Objetivo: unificar o trabalho
local com as melhorias úteis das branches remotas e continuar nesta máquina.

## Estado preservado

- `main` local: `fcf06eb`, dois commits à frente de `origin/main` (`4188627`).
- 50 arquivos versionados alterados e 44 arquivos novos úteis foram preservados,
  junto aos ajustes de ignore, no checkpoint `67d58d6` (95 arquivos).
- Backup Git: `backup/local-2026-09-05`.
- Backup adicional: `.local-backups/2026-09-05-before-integration/`, com bundle
  do histórico, patch binário e arquivo dos novos fontes/assets. Pods, builds,
  caches e credenciais locais não foram apagados nem incluídos no commit.
- Branch ativa: `codex/consolidacao-local-2026-09-05`.
- `remote.origin.fetch` passou a `+refs/heads/*:refs/remotes/origin/*`.
- Nenhuma branch remota foi apagada, nenhuma main foi reescrita e nenhum deploy
  foi realizado. Os commits desta consolidação são locais.

## Integração

As 26 branches Jules continham 71 commits ausentes da main local, com vários
patches duplicados e alterações incompatíveis de build. Foram integradas por
conteúdo, com origem registrada abaixo, sem marcar branches incompletas como
integradas por merge.

- Mantidos todos os avanços locais de landing, cadastro de membros, segurança,
  APIs, assinatura e mobile (Expo 57/RN 0.86).
- Recuperadas 12 suítes de testes com nomes distintos. As branches reutilizavam
  `index.test.ts` para assuntos diferentes; nomes únicos evitam sobrescrita.
- Ajustados fixtures antigos, módulos ausentes e nome da função PIX
  (`buildPixPayload`). Mantida a API real em vez de criar export inexistente.
- Corrigida transposição de acordes bemóis e progresso acima de 100%.
- Tokens Kids usam UUID criptográfico; códigos de retirada/convite usam Web
  Crypto e alfabeto de 32 símbolos, sem viés de módulo. Acrescentados testes.
- Dashboard deixou de declarar uma segunda rota `/`: o componente foi movido
  de `(authenticated)/page.tsx` para `app/dashboard-page.tsx`, usado por `/app`.
  A landing continua responsável pela raiz.
- Radar pastoral ordena reuniões uma vez por grupo e cria o mapa de pessoas
  diretamente; callbacks de papéis usam `useCallback`.
- Testes centralizados em `vitest.config.mts` e `corepack pnpm test`.
- Todos os comandos de build Cloudflare do painel usam OpenNext. Removida a
  dependência `@cloudflare/next-on-pages`; preview e deploy reutilizam o mesmo
  build e patch já existente no projeto. LP passa a participar do typecheck.

A escolha de OpenNext segue a [documentação oficial](https://opennext.js.org/cloudflare/get-started),
que orienta remover next-on-pages e exports de runtime edge. Não foram
importadas as adições de `runtime = "edge"` das branches.

## Triagem das branches

| Branch remota | Decisão |
| --- | --- |
| `add-domain-snapshot-test-13564739735121763111` | Testes recuperados e adaptados aos tipos/API atuais; ajustes paralelos de runtime/build descartados. |
| `add-firebase-path-tests-6696157004034470778` | Testes recuperados e adaptados aos tipos/API atuais; ajustes paralelos de runtime/build descartados. |
| `add-gettenantpaths-tests-3870957481399797240` | Testes recuperados e adaptados aos tipos/API atuais; ajustes paralelos de runtime/build descartados. |
| `add-tests-tribe-questionnaire-5836012633939210714` | Testes recuperados e adaptados aos tipos/API atuais; ajustes paralelos de runtime/build descartados. |
| `add-tests-utils-toslug-13564739735121760274` | Testes recuperados e adaptados aos tipos/API atuais; ajustes paralelos de runtime/build descartados. |
| `feat/care-radar-map-optimization-13830506844453142156` | Integrada: mapa por pessoa e ordenação única por grupo. |
| `fix-insecure-kids-token-6738298617924029026` | Consolidada em Web Crypto para tokens Kids e códigos Kids/convite; sem sobrescrever alterações locais. |
| `fix-insecure-randomness-pickup-code-16059877186426807793` | Consolidada em Web Crypto para tokens Kids e códigos Kids/convite; sem sobrescrever alterações locais. |
| `fix-todo-false-positive-13762884404714914434` | Consolidada na limpeza do comentário e useCallback de providers; descartadas repetições/formatação global. |
| `fix/insecure-randomness-9861055622221434342` | Consolidada em Web Crypto para tokens Kids e códigos Kids/convite; sem sobrescrever alterações locais. |
| `fix/lowercase-todo-comment-2939788125193278547` | Consolidada na limpeza do comentário e useCallback de providers; descartadas repetições/formatação global. |
| `fix/lowercase-todos-in-comment-15451432895544291662` | Consolidada na limpeza do comentário e useCallback de providers; descartadas repetições/formatação global. |
| `fix/providers-memo-todo-16972028319654531141` | Consolidada na limpeza do comentário e useCallback de providers; descartadas repetições/formatação global. |
| `fix/secure-randomness-kids-8990834407302420808` | Consolidada em Web Crypto para tokens Kids e códigos Kids/convite; sem sobrescrever alterações locais. |
| `fix/todos-comment-18357989323173194539` | Consolidada na limpeza do comentário e useCallback de providers; descartadas repetições/formatação global. |
| `jules-2988588784939314874-2f08ce5d` | Não aplicada: preservar resumo operacional de sucesso/falha do job de snapshots; resto é formatação. |
| `perf-batch-course-seeding-15183855802340562996` | Adiada: escrita direta contorna cleanFirestoreData e mantém seed automático de demonstração; revisar provisionamento EAD antes. |
| `perf-optimize-care-radar-sort-16398241238600779232` | Integrada: mapa por pessoa e ordenação única por grupo. |
| `perf-optimize-network-snapshots-10203593486327460092` | Adiada: collectionGroup precisa de regras/índices e limite de leitura; preservar consultas atuais. |
| `test-calculate-progress-1546407632957350360` | Testes recuperados e adaptados aos tipos/API atuais; ajustes paralelos de runtime/build descartados. |
| `test-feature-gate-12443163240307135546` | Testes recuperados e adaptados aos tipos/API atuais; ajustes paralelos de runtime/build descartados. |
| `test-transpose-chords-7612417036801946299` | Testes recuperados e adaptados aos tipos/API atuais; ajustes paralelos de runtime/build descartados. |
| `test/check-schedule-conflict-16242909176846722189` | Testes recuperados e adaptados aos tipos/API atuais; ajustes paralelos de runtime/build descartados. |
| `test/pix-payload-generator-16144198022777696745` | Testes recuperados e adaptados aos tipos/API atuais; ajustes paralelos de runtime/build descartados. |
| `test/transpose-chord-4597452717422919458` | Testes recuperados e adaptados aos tipos/API atuais; ajustes paralelos de runtime/build descartados. |
| `testing-improvement/get-group-type-label-16885879766110740814` | Testes recuperados e adaptados aos tipos/API atuais; ajustes paralelos de runtime/build descartados. |

## Pendências de produto preservadas

Esta consolidação organiza o desenvolvimento; não conclui o plano de segurança.
Continuam pendentes testes de regras Firestore, revisão de tenant/perfis,
limites persistentes e cotas de banners, dados simulados e armazenamento privado
Kids. A otimização da rede e o seed EAD foram preservados nas branches remotas
para revisão própria. O aplicativo nativo ainda precisa de testes em aparelho.

## Validação

- `corepack pnpm install --frozen-lockfile --offline --ignore-scripts`: passou;
  lockfile consistente e instalação reproduzível com o cache local.
- `corepack pnpm test`: 152 testes passaram em 13 arquivos.
- `corepack pnpm typecheck`: passou, incluindo web, LP, mobile e API.
- `corepack pnpm --filter @alvo/worker-api build`: dry-run passou, sem publicar.
- `corepack pnpm build:cloudflare:web`: passou após remover a rota duplicada;
  Worker gerado e patch aplicado, sem aviso de manifesto ausente.
- Smoke test com `wrangler dev --local`: `/` retornou 307 para `/landing`;
  `/landing`, `/login` e `/app` retornaram 200. Isso valida a entrega das
  páginas, não uma sessão autenticada completa.
- Chamadas POST sem autenticação a `/api/ai` e `/api/assets/upload` retornaram 401.
- Preview temporário encerrado após a verificação; iniciar desenvolvimento com
  `corepack pnpm dev:web`.
- `git diff --check`: passou.
- Permanece um aviso não bloqueante do Next sobre migrar `middleware` para
  `proxy`; a migração não foi misturada à consolidação.
- Testes nativos em aparelho, login real e regras Firestore não foram executados.

