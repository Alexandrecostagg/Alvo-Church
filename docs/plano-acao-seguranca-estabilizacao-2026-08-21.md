# Plano de ação — segurança e estabilização

Atualizado em **08/09/2026**; nome do arquivo preservado para manter os links.
Este plano organiza os achados da varredura técnica
para tornar a Plataforma Esdras segura, coerente para o cliente e pronta para
homologação mobile. Itens marcados como **bloqueadores** devem estar concluídos
antes de ampliar o uso com dados reais ou enviar versões para as lojas.

## Entrega ampliada 19 — 08/09

**94,00% estimados (+0,05 ponto)**. O cron da rede calcula membros, grupos,
finanças, eventos e presenças reais por instituição. O painel expõe cobertura,
data e significado correto dos indicadores. 384 testes, tipos, builds e seis
índices `READY` passaram. API `29ee2174-583c-41b7-951e-39700c53a6f9` e painel
`19ba5036-2700-4908-9a3a-c146d4887318` foram publicados e verificados.
[Evidências](entrega-ampliada-19-indicadores-rede-2026-09-08.md).

## Entrega ampliada 18 — 08/09

**93,95% estimados (+0,25 ponto)**. Convites e vínculos de rede passaram ao
backend transacional, com plano, limite 50, uso único, expiração, prevenção de
auto vínculo/segunda rede e auditoria. A sede administra reemissão, revogação e
desvinculação e lê apenas snapshots agregados das filiais ativas. Escritas diretas
e o gravador cliente antigo foram removidos. 379 testes, tipos, lint, build
OpenNext, regras e QA ao vivo passaram.
[Evidências](entrega-ampliada-18-rede-segura-2026-09-08.md).

## Entrega ampliada 10 — 07/09

**91,25% estimados (+1,40 ponto)**. Moderação do marketplace passa por transação
autenticada, idempotente e auditada; escrita direta e log forjado foram fechados.
A LP removeu prova social e promessas sem fonte, rotulou exemplos, acrescentou
canonical e links legais. A rota `/test` foi removida. 340 testes, 20 checks
novos, tipos, builds e QA visual passaram.
[Evidências](entrega-ampliada-10-2026-09-07.md).
Implementação `4d361f2` enviada; Worker publicado na versão
`994c25a5-fabf-4ee3-bfc5-a5061c442ec6` e regras Firestore liberadas.

## Entrega ampliada 9 — 07/09

**89,85% estimados (+1,80 ponto)**. Gestão EAD e eventos passa pelo servidor,
com idempotência, auditoria, transições e regras sem escrita direta. Portal
público projeta nome e próximos eventos reais. 336 testes, 35 checks novos,
43 regressivos, cadastro 49→50, tipos, builds e QA visual passaram.
[Evidências](entrega-ampliada-9-2026-09-07.md).
Implementação `7c80579` enviada; painel/APIs publicados no Worker
`alvo-church-web`, versão `20d782fb-f01a-42fe-ad05-8aa7bb38b733`, e regras do
Firestore liberadas no projeto `alvo-church`.

## Entrega ampliada 8 — 07/09

**88,05% estimados (+4,35 pontos)**. WhatsApp manual com opt-out, destinatários
resolvidos no servidor e confirmação explícita; EAD por vínculo conta/pessoa e
entitlement; inscrição, pagamento e check-in de eventos transacionais e auditados.
Regras fecharam as escritas diretas correspondentes. 318 testes, 43 checks novos,
regressões e builds passaram. [Evidências](entrega-ampliada-8-2026-09-07.md).
Sem provedor real, aparelho, push ou deploy nesta entrega.

## Entrega ampliada 7 — 05/09

**83,70% estimados (+7,05 pontos)**. Finanças mediadas por API, comprovantes
privados, conferência/auditoria/ledger atômicos e CSV mensal; cobrança vinculada
à ordem com repetição segura; texto/banner/imagem na mesma cota; retenção Kids
assistida. [Evidências e limites](entrega-ampliada-7-2026-09-05.md).
Antes de publicar: migrar referências de cobrança legadas, homologar Asaas real,
inventariar mídias antigas e coordenar backend/regras/índices/versão mobile.
Referência legada de igreja conhecida agora retorna 409 para revisão, sem
ativar plano por inferência. Não publicar esse comportamento sem migração.

## Entrega ampliada 6 — 05/09

**76,65% estimados (+7,20 pontos)**. Cadastros legados centralizados, limite 50
homologado entre três origens, intake público com contadores persistentes,
sessões Kids por sala/evento/equipe/horário/capacidade, presença cadastral,
privacidade de bem-estar e lojas, limpeza de simulações e CI versionado.
[Evidências e limites](entrega-ampliada-6-2026-09-05.md). Nenhum deploy.

## Correção posterior — entrega 1 de 05/09

Dependências e repetição concorrente do cadastro corrigidas: auditoria agora com **0 críticos, 0 altos e 1 moderado**
residual em ferramenta Xcode, avaliado sem alcance no chamador v4. Testes,
builds web/LP/API, bundles iOS/Android, pods e QA passaram. O inventário abaixo
descreve o estado anterior; ver [entrega e evidências](entregas-2026-09-05.md).

## Situação consolidada em 05/09

Os andamentos e IDs de publicação de agosto, preservados abaixo, são históricos.
A consolidação de setembro foi validada localmente e **não foi publicada**.
Execução atual: [backlog ativo](backlog-mvp-implementacao-v2.md).
Medição e evidências: [estado da implementação](status-implementacao-2026-09-05.md).

| Frente | Confirmado localmente | Ainda bloqueia o fechamento |
| --- | --- | --- |
| 1 — Acesso/assinatura | Conta/pessoa protegidas; cadastro transacional e teto 50 em três origens; cobrança vinculada à ordem; gestão central auditada e bloqueios de módulo publicados em API/Firestore. | Revisar provisionamento e migração de referências antigas. |
| 2 — APIs/Kids | Sessões/custódia/mídia privada e remoção assistida após retirada; comprovantes privados no servidor. Turnstile publicado e validado ao vivo nos formulários públicos. | Inventário legado, relação familiar e aparelhos. |
| 3 — Custo/cobrança | Cota compartilhada de IA; checkout/webhook idempotentes; WhatsApp manual com destinatário/opt-out auditados. | Sandbox real, migrações e envio/entrega por provedor. |
| 4 — Dados/fluxos | Frentes anteriores só confirmam gravações reais; rede transacional e cron com agregados reais, escopo por instituição e cobertura explícita nas entregas 18–19. | Dados externos e integração bancária. |
| 5 — Validação | 384 testes, TypeScript integral, builds, índices e QA HTTP passaram na entrega 19. | Primeiro ciclo agendado, aparelhos, integrações externas, CI remoto e homologação coordenada. |

### Identidade e Passe — entrega 3 validada localmente

Autoalteração de `users.personId` bloqueada. Vínculo é confirmado por admin em
transação, com reserva exclusiva e auditoria privada. O app usa a API de Passe
que deriva a identidade do token e verifica pessoa ativa, consentimento e benefício.
Leitura alheia de pessoas/validações negada; legado não basta para comprovar vínculo.
192 testes e 78 verificações HTTP/regras passaram. Ainda faltam aparelhos e fluxo
integral do parceiro. [Detalhes](vinculo-passe-2026-09-05.md).

### Auditoria inicial de dependências de 05/09 (histórico anterior à entrega 1)

`pnpm audit --prod` retornou 3 críticos, 50 altos, 51 moderados e 5 baixos no
resumo do scanner. O inventário possui 105 advisories distintos; não confundir
com quantidade de falhas exploráveis no produto. Inclui cadeias de ferramentas
do Expo. [Inventário](auditoria-dependencias-2026-09-05.json).

Na auditoria inicial, Next era 16.2.4; o mínimo antigo abaixo não deve virar garantia
permanente de segurança. Selecionar versões compatíveis que resolvam **todos os
avisos aplicáveis atuais**, incluindo Hono e transitivos, com auditoria após o
lockfile atualizado. Os críticos reportados envolvem protobufjs, shell-quote e
websocket-driver; alcance no runtime ainda não foi demonstrado.

## Princípios de decisão

- O cliente nunca altera plano, módulos contratados ou abrangência
  organizacional pelo navegador.
- Permissões são negadas por padrão; cada coleção e operação recebe uma regra
  explícita.
- Nenhuma tela de produção apresenta dados simulados como dados reais.
- Operações que geram custo, tratam dados de crianças ou recebem conteúdo
  público precisam de autenticação, limite e auditoria.

## Frente 1 — acesso, assinatura e abrangência **(bloqueador)**

1. Remover da configuração comum a alteração de Igreja Solo, Multi-campus,
   Rede e Denominação. A tela passa a mostrar a abrangência atual e direciona
   para o plano/atendimento.
2. Impedir no Firestore que administrador da igreja altere `organizationTier`,
   `organizationType`, `memberCount` ou `affiliateCount` diretamente.
3. Deixar mudanças de plano, módulos e abrangência somente no provisionamento,
   cobrança validada no backend ou operação da administração Esdras.
4. Revisar os papéis: `pastor` e `secretary` não devem administrar usuários,
   papéis nem assinatura sem uma autorização explícita.

**Andamento:** itens 1 e 2 iniciados nesta alteração. A gestão de usuários
também foi restringida a `church_admin` e `super_admin`.

## Frente 2 — Firestore e APIs expostas **(bloqueador)**

1. Substituir a regra genérica de escrita do Firestore por permissões
   explícitas por coleção e subcoleção.
2. Proteger o upload de comprovantes de evento no Worker: autenticação,
   vínculo com a organização/evento, tipo e tamanho de arquivo.
3. Restringir contadores e consumo de IA a operações transacionais no servidor.
4. Corrigir QR de crianças: não expor token em URL pública/cacheável; usar
   token curto e validado no servidor ou geração local autenticada.
5. Aplicar limite persistente e proteção anti-spam (Turnstile/App Check) aos
   formulários públicos e uploads de comprovantes.

**Andamento:** o upload de comprovante foi fechado para chamadas sem bearer,
com limite de 8 MB e tipos PDF/JPG/PNG/WEBP. A infraestrutura ainda precisa
configurar `EVENT_PROOF_UPLOAD_BEARER_TOKEN` e uma rota web autenticada que
faça a mediação. Os uploads de marca já migraram para `/api/assets/upload`,
que valida Firebase, papel de administrador, organização, tipo e tamanho antes
de usar o segredo interno do Worker. Fotos Kids não usam mais esse endpoint de
branding; o próximo passo é uma rota privada própria, com acesso temporário e
auditável.

O histórico de banners também foi corrigido: membro só cria e altera registros
cujo `createdByUserId` seja o próprio UID; administradores fazem moderação.

A regra genérica passou a usar uma lista fechada das coleções operacionais
existentes. Coleções novas não herdam mais leitura/escrita automaticamente.

O formulário público de visitante deixou de gravar diretamente no Firestore:
a API valida o pedido, aplica limite por IP/honeypot e grava com service
account. Na entrega 6, contadores persistentes no Firestore substituíram o
limite em memória. A entrega 15 implementou Turnstile com Siteverify, ação e
hostname vinculados; secret criptografado, publicação e QA ao vivo foram concluídos.

A entrega 16 fechou a mutação central da plataforma em API server-side: cada
operação revalida o administrador Esdras, exige motivo e registra antes/depois em
auditoria privada. Bloqueios de instituição e usuário são aplicados pelas regras,
pela sessão web e pelas APIs verificadas. O último administrador ativo e contas
ligadas ao cadastro de pessoas não podem ser removidos acidentalmente.

Na entrega 17, a pausa de módulos também passou a ser verificada pelas APIs de
negócio e pelas regras do Firestore. Assim, chamadas diretas recebem negação
enquanto o módulo estiver explicitamente desabilitado. O checkout da assinatura
permanece disponível para regularização do plano.

## Frente 3 — custo, comunicação e pagamentos **(alta)**

1. Exigir organização, papel permitido, cota de plano e rate limit nas APIs de
   geração de banner e imagem.
2. Registrar consentimento, opt-out, origem e limite de envio para WhatsApp.
3. Enviar `organizationId` ao Worker de comunicação e validar destinatários.
4. Adicionar idempotência a checkout e reconferir dados da organização no
   servidor antes da cobrança.

**Andamento:** banner de texto e imagem de fundo agora exigem `organizationId`,
usuário ativo com papel administrativo e limites de entrada; imagem não é mais
cacheada publicamente. A rota principal de IA passou a consumir cota no servidor
em transação, e `aiUsage` foi fechado para escrita pelo cliente. Falta unificar
as duas rotas de banner à mesma cota e adicionar rate limit persistente.

**Publicação:** ruleset `7f1ee5cf-ba29-468b-beab-8b301529a4b3` e painel web
`6bcf1f95-e198-4a4f-8a41-6c909c8c3ad2`.

## Frente 4 — verdade dos dados e fluxos funcionais **(alta)**

1. Trocar todos os fallbacks simulados por estados honestos de vazio/erro:
   recepção, ficha de membro, marketplace, bem-estar, rede e IA pastoral.
2. Finalizar o fluxo Wi-Fi para persistir o cadastro ou indicar claramente que
   ele está indisponível.
3. Revisar a visibilidade de dados de crianças: membros comuns não devem ler
   check-ins que não pertençam aos seus dependentes.

**Andamento:** concluída a separação de leitura dos check-ins Kids. A lista
completa agora é exclusiva de administradores/equipe Kids; responsáveis fazem
consultas restritas aos registros em que são o responsável ou uma pessoa
autorizada. Foram publicados os índices dessas consultas e a interface web foi
atualizada. Ainda falta retirar a foto em base64 do documento do check-in e
entregá-la apenas por armazenamento privado.

## Frente 5 — dependências e validação **(bloqueador para publicação)**

1. Atualizar Next.js para versão corrigida (mínimo 16.2.11), Hono e a cadeia
   Firebase/Protobuf/WebSocket indicada pelo `pnpm audit`.
2. Executar `pnpm audit --prod`, typecheck e build após cada lote de atualização.
3. Criar testes automatizados com Firebase Emulator para papéis, plano,
   coleções sensíveis e tentativas de alteração direta.
4. Homologar com usuários de igreja, pastor, secretário, membro e visitante
   antes de novo deploy e antes da distribuição mobile.

## Ordem de execução atualizada

1. Corrigir dependências aplicáveis e validar os artefatos afetados.
2. Fechar fluxo Kids, retenção e publicação coordenada; QR/fotos validados na entrega 4; vínculo/Passe validado localmente na entrega 3.
3. Migrar cadastros legados, proteger uploads e persistir limites/cotas.
4. Remover dados simulados e homologar cobrança/comunicação.
5. Ampliar testes de regras, homologar aparelhos/papéis e só então publicar.

## Critério de conclusão

Cada item só é concluído após revisão de código, teste do caminho permitido e
tentativa comprovadamente bloqueada do caminho indevido. Alterações de regras
ou backend são publicadas apenas junto de uma validação no ambiente de
homologação.


## Entrega 4 — mídias Kids

QR por GET/cache público desativado. API autenticada consulta check-in ativo,
foto em Storage privado sem URL/token de download permanente. Referências e
consentimento protegidos de escrita direta; upload limitado, substituição e
remoção. 222 testes e 62 verificações HTTP/Firestore/Storage passaram. Vínculo do
responsável/retirada, retenção, legado/cache remoto e IAM por fechar antes de
produção. [Evidências e limites](kids-midias-privadas-2026-09-05.md).


## Entrega 5 — entrada e retirada Kids

Escritas diretas de check-in removidas: backend autentica operador, resolve conta
do responsável dentro da igreja e registra visitante sem UID inventado. Lista
confirmada e versão do vínculo, QR/código e conferência de identidade são exigidos
para retirada transacional; override livre removido. Regularização de legados
exige motivo/confirmação e auditoria. 77 verificações de custódia, regressões de
mídia/50 membros, 235 testes e builds passaram. Escala/sala/evento, criança
cadastral e aparelhos ainda por fechar. [Evidências](kids-custodia-2026-09-05.md).


### Fechamento local da entrega 6

263 testes, 91 verificações novas, 77 de custódia, 62 de mídia e 78 de Passe,
regressão 49→50, types, builds web/LP/mobile e QA de navegador. CI definido,
mas não executado no remoto. Seguem retenção/legado Kids, aparelhos, comprovantes,
cobrança/cotas e comunicação real. Regras de aprovação de loja e log não tornam
as duas escritas atômicas; esse refinamento segue pendente.
