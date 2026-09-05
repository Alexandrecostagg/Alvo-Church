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
  49→50, OpenNext e Hermes passaram. Percentual: 68,15%.
  Veja `docs/kids-midias-privadas-2026-09-05.md`; sem publicação/teste físico.
- Entrega 5: entrada/retirada Kids no backend, responsável separado do operador,
  autorização nominal e confirmação de identidade; transações impedem duplicação
  e dupla retirada. Legados exigem confirmação no painel. 235 testes, 77 checks
  de custódia, 62 de mídia, regressão 49→50, OpenNext e Hermes passaram.
  Percentual após entrega 5: 69,45% (~69,5%); veja `docs/kids-custodia-2026-09-05.md`.
- Entrega 6 ampliada: cadastros de recepção/dashboard/escalas centralizados,
  limite global de 50, formulário público com cota persistente, Kids por
  sessão/sala/evento/equipe/capacidade e criança cadastral, limpeza de simulações,
  privacidade de bem-estar/lojas e CI versionado. 263 testes e 308 verificações
  numeradas mais regressão de cadastro; QA visual, types e builds.
  Após entrega 6: **76,65% (~76,7%)**, +7,20 pontos. Veja `docs/entrega-ampliada-6-2026-09-05.md`.
- Entrega 7 ampliada: doação pelo backend, comprovantes privados, conferência
  financeira auditada e CSV mensal; cobrança idempotente e webhook vinculado à
  ordem; cota compartilhada de IA e remoção assistida de fotos antigas Kids.
  Atual: **83,70% (~83,7%)**, +7,05 pontos. 301 testes, 444 verificações numeradas
  de integração mais regressão de cadastro; ver `docs/entrega-ampliada-7-2026-09-05.md`.
  Homologação Asaas usou adaptador simulado; sandbox real, aparelhos e deploy pendentes.
- Usuário pediu entregas maiores (~7–10 pontos), sem aumentar porcentagem sem
  implementação/validação. Agrupar várias histórias por entrega e commitar ao final.
- Planos revisados em 05/09: `docs/backlog-mvp-implementacao-v2.md` é a fila ativa;
  `docs/status-implementacao-2026-09-05.md` concentra evidências e estimativa de
  63,25% como linha de base (não prontidão de produção nem PRD completo).
- Prioridade atual: comunicação real e auditoria EAD/eventos; preparar inventário
  de legados/migração de cobrança e homologação externa/aparelhos antes de publicar.
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
  vínculo responsável/operador e retirada atômica validados localmente na entrega 5.
  Escala nominal/sala/evento e entradas legadas validados na entrega 6. Retenção
  assistida validada na entrega 7; inventário legado, relação familiar e QA físico pendentes.
- Mobile usa Expo 57.0.20 e React Native 0.86.3, identidade `com.plataformaesdras.app`.
- Segurança de tenant, dados simulados, armazenamento Kids e limites persistentes
  ainda exigem a estabilização descrita em `docs/plano-acao-seguranca-estabilizacao-2026-08-21.md`.
- Testes unitários não substituem testes de regras Firestore nem homologação
  em aparelhos. Esta consolidação não certifica prontidão para produção.
