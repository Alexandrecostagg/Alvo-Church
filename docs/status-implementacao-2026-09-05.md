# Estado da implementação — 05/09/2026

> Atualização após entrega 2: **64,45% (aproximadamente 64,5%)**. Dependências corrigidas,
> oferta de 50 membros alinhada e 22 arquivos redundantes da LP removidos;
> 0 críticos/0 altos/1 moderado residual. Ver [entregas e cálculo](entregas-2026-09-05.md).
> A tabela abaixo preserva a linha de base inicial de 63,25% para comparação.

Base auditada: `ecc86b4`, branch `codex/consolidacao-local-2026-09-05`.
Avaliação do código local e dos registros de homologação. Não é uma verificação
do que está publicado no Cloudflare ou nas lojas. A consolidação ainda não foi
enviada ao remoto.

## Onde estão os planos

| Documento | Papel |
| --- | --- |
| [Backlog ativo](backlog-mvp-implementacao-v2.md) | Trabalho executável, prioridade e critérios de aceite. |
| [Segurança e estabilização](plano-acao-seguranca-estabilizacao-2026-08-21.md) | Bloqueadores para dados reais e distribuição. Nome histórico; conteúdo atualizado. |
| [Roadmap](roadmap-mvp-alvo-church.md) | Ondas de produto e recorte do MVP. |
| [Arquitetura do monorepo](arquitetura-tecnica-monorepo-alvo-church.md) | Fronteiras entre painel, mobile, LP, APIs e pacotes. |
| [Publicação mobile](publicacao-mobile-testes.md) | Preparação e validação em aparelhos/lojas. |
| [Encerramento do Jules](encerramento-jules-2026-09-05.md) | Sessões pausadas, patches pendentes e retomada local. |

O backlog sem `v2` e o contexto de agosto são históricos. Em caso de divergência
de status, usar este diagnóstico e o backlog ativo. PRD e documentos de módulos
descrevem intenção de produto, não comprovam entrega.

## Percentual: aproximadamente 63% do escopo operacional avaliado

Estimativa gerencial, com confiança moderada. A margem de julgamento é de cerca
de 10 pontos percentuais para mais ou para menos, não um intervalo estatístico.
Não significa 63% do tempo, do código, da segurança ou da prontidão para produção.
Não havia estimativas de esforço nem critérios uniformes nos planos anteriores;
esta é a primeira linha de base comparável.

Escopo: os dez grupos abaixo, cobrindo a operação planejada no backlog ativo,
o app e a aquisição pela LP. Expansões futuras sem recorte, como toda a Camada 2,
não entram como promessa integral. A visão completa do PRD é maior que esse
denominador e não tem percentual defensável sem decomposição adicional.

Cada nota soma quatro avaliações: funcionalidades/UX (F, até 40), persistência
e integração (I, até 25), proteção e consistência (S, até 20), validação e operação
(V, até 15). São pontos estimados a partir das evidências, não testes binários.
Pesos representam relevância no produto atual e somam 100; não são horas estimadas.

| Frente | Peso | F | I | S | V | Avanço | Evidência e principal lacuna |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Fundação, autenticação e permissões | 10 | 35 | 22 | 15 | 8 | 80% | Tenant e papéis em código; QA entre igrejas. Regras por coleção e dependências ainda exigem fechamento. |
| Pessoas, famílias e cadastro | 15 | 35 | 25 | 15 | 5 | 80% | API transacional, CPF e consentimento homologados; recepção/escalas ainda criam pessoas por outros caminhos. |
| Operação web: recepção, grupos, eventos, serviço | 15 | 35 | 22 | 8 | 5 | 70% | Telas e repositórios reais; faltam QA por papel, limpeza de simulações e convergência dos cadastros. |
| Segurança Kids | 10 | 28 | 12 | 5 | 5 | 50% | UUID e leitura responsável/operador verificados. QR em URL/cache, fotos e check-in mobile pendentes. |
| Esdras Passe completo | 5 | 20 | 15 | 7 | 3 | 45% | Emissão segura pronta; vínculo conta/pessoa, carteirinha mobile e validação ponta a ponta em parceiros pendentes. |
| Aplicativo iOS/Android | 15 | 32 | 18 | 7 | 3 | 60% | Login, grupos, eventos, perfil, PIX e Expo Push em código; export iOS passou, sem homologação física comprovada nesta base. |
| LP e aquisição | 5 | 35 | 18 | 7 | 5 | 65% | Build estático passou. Cópias divergentes, limite comercial incorreto, links/SEO e conversão por homologar. |
| SaaS, finanças e doações | 10 | 30 | 20 | 7 | 3 | 60% | Planos, lançamentos, PIX estático e checkout em código; idempotência de cobrança, conciliação e recorrência de doação incompletas. |
| Comunicação e IA | 10 | 25 | 15 | 7 | 3 | 50% | Templates, WhatsApp e APIs de IA; push/email em campanha ainda “em breve”, cota/rate limit não uniformes. |
| Tribos, jornadas, EAD, rede e marketplace | 5 | 25 | 13 | 4 | 3 | 45% | Scoring testado e repositórios presentes; simulações em rede/marketplace e QA integral pendentes. |

Fórmula: `soma(peso × avanço) / 100 = 63,25%`, comunicado como **cerca de 63%**.
Segurança é condição de liberação: uma média boa não compensa um bloqueador aberto.
Não há frente certificada como concluída para produção nesta avaliação.

## Evidências repetidas nesta revisão

- `corepack pnpm test`: **167 testes em 15 arquivos passaram**.
- `corepack pnpm typecheck`: passou nos pacotes que possuem esse script.
  `apps/lp-worker` só tem script de deploy e não é coberto por esse comando.
- `corepack pnpm --filter @alvo/lp build`: export estático de `/` e `/landing` passou.
- `corepack pnpm audit --prod --json`: retornou alertas; resumo do pnpm:
  3 críticos, 50 altos, 51 moderados e 5 baixos. São contagens do scanner,
  não 109 falhas exploráveis confirmadas. Há 105 registros distintos de advisory;
  caminhos/versões fazem o resumo divergir. Ferramentas transitivas do Expo também
  entram nessa árvore. Falta avaliar alcance no artefato e corrigir por lote.
- Críticos reportados: `protobufjs@7.5.4`, `shell-quote@1.8.3` e
  `websocket-driver@0.7.4`. O inventário sanitizado está em
  [auditoria-dependencias-2026-09-05.json](auditoria-dependencias-2026-09-05.json).

Evidências anteriores da mesma base, não reexecutadas nesta revisão documental:
build OpenNext, export do bundle iOS e QA HTTP/emuladores de cadastro/Kids/Passe.
Consulte [cadastro transacional](cadastro-transacional-2026-09-05.md) e
[retomada local](encerramento-jules-2026-09-05.md).

Não foram inspecionadas contas EAS/App Store/Google Play ou configuração remota
de CI nesta revisão. Configuração de build não comprova distribuição nas lojas.

## Achados que mudam o plano

1. `fetchTenantUser` não entrega `personId` ao mobile; a regra de autoedição em
   `firestore.rules` não impede alterar esse campo. Proteger/provisionar o vínculo
   antes de usá-lo para mostrar o Passe de uma pessoa.
2. `apps/web/app/api/kids/qr/route.ts` recebe o segredo por GET e permite cache
   público por um dia. UUID forte não resolve exposição do segredo.
3. `reception-view`, `wellness-view`, `network-view` e telas do marketplace ainda
   têm dados simulados/fallbacks. `/wifi` transforma falha de requisição em sucesso.
4. `/api/giving/pix` gera BR Code estático. Isso não é gateway de PIX dinâmico,
   confirmação bancária nem doação recorrente automática.
5. O app registra Expo Push Token, mas a tela de comunicação ainda anuncia push
   e email como “em breve”. Registro de token não comprova entrega de campanha.
6. Achado inicial, corrigido na entrega 2: a LP anunciava **100 membros** gratuitos; `packages/firebase/src/plans.ts`
   e o teste de limite aplicam **50**. Corrigir conteúdo conforme o plano vigente
   ou alterar o produto por decisão comercial explícita; não aumentar limite
   silenciosamente para acompanhar a propaganda.
7. Não há workflow GitHub Actions versionado nesta base. Há configurações
   Cloudflare/EAS, mas sua automação remota não foi auditada.

## App e LP: recomendação de repositórios

**Mobile: manter no monorepo neste estágio.** Ele depende de `@alvo/domain`,
`@alvo/firebase`, `@alvo/types`, `@alvo/ui` e do carregador de ambiente da raiz.
As correções de identidade, permissões e contratos precisam acompanhar web e app.
Extrair agora exigiria publicar/versionar esses pacotes, compatibilizar contratos
e manter CI em dois lugares. Organizar telas em `src/features` e ter release EAS
independente resolve o problema imediato sem duplicar regras.

**LP: separar do runtime do painel e manter uma única fonte; repositório próprio
é uma opção adequada depois dessa consolidação.** `apps/lp` já não depende dos
pacotes `@alvo/*` e gera site estático. É o melhor candidato à extração quando
houver operação de marketing independente ou necessidade de permissões próprias.
No curto prazo, build/deploy próprio dentro do monorepo já entrega autonomia.

Estado encontrado: `apps/web/app/landing`, `apps/lp/app/page.tsx`,
`apps/lp/app/landing` e um Worker de roteamento em `apps/lp-worker`. Este último
é infraestrutura de domínio, não outra aplicação de negócio. A duplicação já
causou divergências de conteúdo e links; criar repos sem resolvê-la a espalharia.

Sequência proposta para a LP, sem mover nada nesta revisão:

1. Escolher `apps/lp` como fonte única, reconciliar conteúdo e limites comerciais.
2. Configurar URLs por ambiente; conferir cadastro/login, privacidade, SEO,
   analytics/consentimento e uso móvel. Manter APIs autenticadas no backend.
3. Validar domínio e assets em preview. Definir redirects da antiga `/landing`;
   manter `/p/[orgSlug]`, formulários de igreja e rotas de API na plataforma.
4. Configurar build/deploy separado. Se a operação justificar repo próprio,
   extrair com histórico, lockfile/config próprios e deploy de preview validado.
5. Só então fazer a troca de domínio e remover cópias antigas, com rollback.

Expo/EAS suporta builds em monorepo; Cloudflare permite Workers com diretórios
e filtros de caminhos próprios. Portanto, publicação independente não exige
repositório independente. Essa recomendação é uma inferência baseada no código
e nas capacidades documentadas, não uma migração aprovada ou já executada.

Fontes oficiais consultadas em 05/09/2026:
[Expo/EAS e monorepos](https://docs.expo.dev/build-reference/build-with-monorepos/),
[Cloudflare: configuração de múltiplos Workers](https://developers.cloudflare.com/workers/ci-cd/builds/advanced-setups/),
[Cloudflare: filtros de caminhos](https://developers.cloudflare.com/workers/ci-cd/builds/build-watch-paths/).

## Próximo marco

Fechar dependências e identidade/Passe, retirar a exposição do QR Kids e
homologar papéis; depois integrar os cadastros legados, eliminar dados simulados
e fazer QA físico do mobile. LP pode ter sua consolidação preparada como frente
própria, sem antecipar publicação. Critérios detalhados no backlog ativo.
