# Contexto atual de trabalho

Atualizado em 05/09/2026 (UTC; sessão iniciada em 04/09 no horário de Belém).

- Produto: Plataforma Esdras / EsdrasApp; monorepo Alvo Church.
- Regra do usuário: manter 50 membros no gratuito, atualizar percentual/planos e
  fazer commit ao fim de cada entrega; descartar cópias comprovadamente sem uso.
- Entrega 1 concluída: dependências corrigidas, 0 críticos/0 altos/1 moderado
  residual de ferramenta. Percentual após entrega 1: 64,20%; veja `docs/entregas-2026-09-05.md`.
- Entrega 2 concluída: oferta de 50 na LP/cadastro, 22 arquivos redundantes
  removidos e rota LP legada reutilizando a principal. Percentual: 64,45%.
- Entrega 3 concluída: vínculo conta/pessoa confirmado pela administração,
  regras de leitura individual e Passe no app. Percentual: 66,35%.
  192 testes, 78 verificações HTTP/regras, regressão 49→50, OpenNext e Hermes
  iOS/Android passaram. Veja `docs/vinculo-passe-2026-09-05.md`.
- Entrega 4: QR autenticado, foto em Storage privado, upload/remoção no painel
  e leitura web/app; 222 testes, 62 verificações HTTP/regras/Storage, regressão
  49→50, OpenNext e Hermes passaram. Atual: 68,15% (~68,2%).
  Veja `docs/kids-midias-privadas-2026-09-05.md`; sem publicação/teste físico.
- Planos revisados em 05/09: `docs/backlog-mvp-implementacao-v2.md` é a fila ativa;
  `docs/status-implementacao-2026-09-05.md` concentra evidências e estimativa de
  63,25% como linha de base (não prontidão de produção nem PRD completo).
- Prioridade atual: fluxo Kids → limites/cadastros legados → dados reais e QA mobile.
- Recomendação arquitetural: mobile no monorepo; LP com fonte e deploy próprios,
  candidata a repo separado após consolidação. Nenhuma migração foi executada.
- Revisão documental: 167 testes e typecheck passaram novamente; build estático
  da LP passou. Auditoria de produção reportou 3 críticos/50 altos/51 moderados/
  5 baixos; alcance ainda por avaliar, inventário sanitizado em `docs/`.
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
- Jules encerrado operacionalmente neste repositório: sete sessões pausadas,
  CI Auto-Fixer e Suggestions desligados, sem tarefas agendadas. Histórico
  preservado; veja `docs/encerramento-jules-2026-09-05.md`.

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
- Cadastro completo agora usa `/api/members`: transação de pessoa/família/vínculo,
  CPF reservado, idempotência, limite por contagem real e Passe criptográfico com
  consentimento. Teste HTTP/emuladores e 167 testes unitários passaram.
- A auditoria Jules encontrou token Kids mobile ainda com Math.random; corrigido
  com UUID completo de Expo Crypto. Web já estava integrado. Não havia patch
  funcional Jules específico do Esdras Passe nas branches disponíveis.
- A inspeção posterior do Jules encontrou o plano da carteirinha mobile ainda
  aguardando resposta. Resolvido localmente na entrega 3: o app consulta API
  autenticada, o vínculo é transacional/privado e `personId` é protegido nas regras.
  Vínculos legados exigem confirmação administrativa; parceiro/aparelhos por homologar.
- Consulte `docs/auditoria-jules-kids-passe-2026-09-05.md` e
  `docs/cadastro-transacional-2026-09-05.md`. QR e fotos privadas implementados localmente na entrega 4;
  vínculo responsável/operador, retirada atômica e retenção seguem pendentes. Recepção/escalas ainda precisam
  migrar para a mesma API para fechar o limite global de pessoas.
- Mobile usa Expo 57.0.20 e React Native 0.86.3, identidade `com.plataformaesdras.app`.
- Segurança de tenant, dados simulados, armazenamento Kids e limites persistentes
  ainda exigem a estabilização descrita em `docs/plano-acao-seguranca-estabilizacao-2026-08-21.md`.
- Testes unitários não substituem testes de regras Firestore nem homologação
  em aparelhos. Esta consolidação não certifica prontidão para produção.
