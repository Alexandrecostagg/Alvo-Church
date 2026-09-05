# Estado da implementação — 05/09/2026

> Atualização após entrega 7 ampliada: **83,70% (aproximadamente 83,7%)**, ganho
> de **7,05 pontos**. Doação privada/conferência/CSV, cobrança vinculada à ordem,
> cota única de IA e retenção assistida Kids. 301 testes e 444 verificações numeradas.
> Ver [evidências e limites](entrega-ampliada-7-2026-09-05.md) e [cálculo](entregas-2026-09-05.md).
> A tabela abaixo preserva a linha de base inicial de 63,25% para comparação.

Entrega publicada: `e92452c`, branch `codex/consolidacao-local-2026-09-05`.
O Worker canônico, regras Firestore/Storage e índice Kids foram verificados após
o deploy. O app não foi enviado às lojas e as integrações externas continuam com
os limites registrados no documento da entrega. A branch foi enviada ao remoto;
`main` permaneceu intacta.

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

## Linha de base histórica: aproximadamente 63% do escopo avaliado

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

1. Achado inicial resolvido localmente na entrega 3: vínculo privado e transacional
   confirmado pela administração, `personId` protegido e Passe via API autenticada.
   App implementado; homologação em aparelhos/parceiros continua pendente.
2. Achado inicial resolvido localmente na entrega 4: GET do QR desativado,
   consulta autenticada e foto privada. Publicação coordenada e revisão do
   cache/legado remoto ainda pendentes.
3. Achado inicial corrigido nas frentes revisadas na entrega 6: recepção, cuidado,
   bem-estar, rede, lojas/moderação e Wi-Fi. EAD/eventos ainda exigem auditoria.
4. `/api/giving/pix` gera BR Code estático. Isso não é gateway de PIX dinâmico,
   confirmação bancária nem doação recorrente automática.
5. O app registra Expo Push Token, mas a tela de comunicação ainda anuncia push
   e email como “em breve”. Registro de token não comprova entrega de campanha.
6. Achado inicial, corrigido na entrega 2: a LP anunciava **100 membros** gratuitos; `packages/firebase/src/plans.ts`
   e o teste de limite aplicam **50**. Corrigir conteúdo conforme o plano vigente
   ou alterar o produto por decisão comercial explícita; não aumentar limite
   silenciosamente para acompanhar a propaganda.
7. CI versionado na entrega 6 para tipos, testes, builds por aplicação e emuladores.
   Sem push: nenhuma execução desse workflow remoto foi verificada.

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

Entrega 7 publicou finanças/doações, cobrança vinculada, cota de IA e retenção
assistida Kids. Seguem migração de legados, sandbox Asaas, aparelhos, comunicação
real e auditoria EAD/eventos. Manter pacotes maiores conforme pedido do usuário,
com percentual sustentado por evidência. Mobile e LP não foram extraídos.
