# Contexto atual de trabalho

Atualizado em 05/09/2026 (UTC; sessão iniciada em 04/09 no horário de Belém).

- Produto: Plataforma Esdras / EsdrasApp; monorepo Alvo Church.
- Branch de trabalho: `codex/consolidacao-local-2026-09-05`.
- O trabalho local anterior foi salvo no commit `67d58d6` e na branch
  `backup/local-2026-09-05`. Não descartar esse trabalho.
- Backup adicional, ignorado pelo Git: `.local-backups/2026-09-05-before-integration/`.
- O Git local agora busca todas as branches de `origin`, não apenas `main`.
- A main remota estava em `4188627` em 06/08. As branches Jules de setembro
  foram revisadas e integradas seletivamente; não fazer merge de todas.
- Consolidação inicial: 152 testes, typecheck, build OpenNext e dry-run da API passaram.
- Homologação local posterior: 158 testes, typecheck e build OpenNext passaram; login, cadastro,
  CEP, CPF, família, ficha e leitura isolada entre duas igrejas foram verificados
  em emuladores. Veja `docs/homologacao-membros-2026-09-05.md`.
- Consulte `docs/consolidacao-git-2026-09-05.md` para a triagem e validação.

## Rodar e validar

```bash
corepack pnpm dev:web
corepack pnpm test
corepack pnpm typecheck
corepack pnpm build:cloudflare:web
```

O build Cloudflare usa OpenNext e não publica. O deploy é uma operação separada.
Credenciais e arquivos `.env*` locais não devem ser versionados.

## Produto e pendências

- `/` redireciona para `/landing`; `/app` abre o painel autenticado.
- CEP, CPF e nascimento foram homologados no fluxo desktop de membros, com
  correções de datas/fuso, consultas de CEP e proteção contra envio simultâneo.
- Dashboard e ficha agora deixam campos sem dados reais vazios ou indicados
  como indisponíveis. Outras telas ainda precisam da mesma revisão.
- Próxima etapa: gravação atômica de pessoa/família/vínculo e garantias de CPF,
  limite de plano e autorização de escrita no backend.
- Mobile usa Expo 57 e React Native 0.86, identidade `com.plataformaesdras.app`.
- Segurança de tenant, dados simulados, armazenamento Kids e limites persistentes
  ainda exigem a estabilização descrita em `docs/plano-acao-seguranca-estabilizacao-2026-08-21.md`.
- Testes unitários não substituem testes de regras Firestore nem homologação
  em aparelhos. Esta consolidação não certifica prontidão para produção.
