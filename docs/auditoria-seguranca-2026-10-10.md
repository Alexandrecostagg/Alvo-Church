# Auditoria de segurança — plataforma, LP e mobile

> Remediação em 10/10: [correções, validações e pendências](correcoes-seguranca-2026-10-10.md). O diagnóstico original abaixo registra o estado anterior.


Data: 10/10/2026. Base: commit `5c56b4e`, branch `codex/consolidacao-local-2026-09-05`.

**Resultado: há falhas confirmadas que impedem considerar a segurança homologada.**
Três grupos de alta prioridade afetam autorização: vínculo de cobrança alterável
pelo cliente, leitura excessiva de dados internos e acesso a aulas sem a
publicação/liberação esperada. As regras em produção são idênticas às usadas
nas reproduções locais. Não foram consultados dados privados de membros reais.

Esta entrega contém diagnóstico, evidências e uma suíte reproduzível. **Não
altera regras, código de produção, dependências nem builds das lojas. As falhas
abaixo continuam abertas.** Ausência de achados em uma busca não equivale a
garantia de ausência de vulnerabilidades.

## Evidência e escopo

- [Evidências sanitizadas](security/2026-10-10/evidencias.json): regras publicadas,
  HTTP público, resultados dos testes, dependências e artefatos mobile.
- [Provas locais](../scripts/audit-security-local.mjs): contas, instituições e
  documentos fictícios; emuladores `demo-alvo-qa`; limpeza ao final.
- 41 arquivos de testes existentes: **434 testes aprovados**.
- Integrações locais: **77** verificações de custódia Kids, **62** de mídia Kids,
  **78** de vínculo/Esdras Pass e **41** de parceiros/benefícios aprovadas.
- Provas adicionais de autorização: **25 verificações; 15 respostas esperadas e
  10 divergências**, agrupadas em SEC-01 a SEC-04. Isso NÃO é uma nota percentual
  de segurança. Duas divergências são acessos legítimos negados pelo Storage;
  os testes negativos desse Storage não demonstram uma política correta,
  pois a avaliação falha antes de aplicar a autorização desejada.
- Histórico Git: 354 commits, 2.435 blobs menores que 2 MB pesquisados por
  padrões de chaves privadas e tokens de provedores; nenhum segredo real
  identificado nesses formatos. A busca atual também separou marcadores PEM
  usados por parsers/testes de uma chave privada de fato.
- Android: `apps/mobile/build/esdrasapp-v15.aab`; iOS:
  `apps/mobile/build/ios/EsdrasApp-1.0.0-1.xcarchive`.
  Varredura de 608 entradas de configuração/bundles/texto (8.242.901 bytes),
  sem correspondência aos padrões de segredo pesquisados. Não houve
  descompilação completa nem instrumentação de aparelho.
- Produção: leitura das regras pelo Firebase Rules API e configuração Auth;
  consultas públicas HTTP sem conta; sem ataques de carga, sem pagamentos,
  sem mutações de dados, sem testes contra contas reais.

Hashes das regras publicadas, iguais aos arquivos locais:

| Recurso | SHA-256 | Atualização publicada |
| --- | --- | --- |
| Firestore | `cddd537ec2159f18dddd654a6c2a4e4b89bc9b04fb332409a3d3be89440260d3` | 12/09/2026 |
| Storage | `a83333b5bddde972ff7c224e1abe84d4277987422b737e6885470a5aa8ee5b0f` | 05/09/2026 |

## Achados e correções prioritárias

### SEC-01 — Alta: identificadores de cobrança alteráveis pelo cliente

**Confirmado:** `firestore.rules:311–325` permite ao administrador da instituição
alterar `asaasCustomerId` e `asaasSubscriptionId` diretamente. A prova local
substituiu a assinatura por um identificador fictício de terceiro e esvaziou o
cliente: HTTP **200**, quando a escrita deveria ser exclusiva do backend.

`apps/web/app/api/billing/invoices/route.ts:19–43` consulta o Asaas usando esse
identificador. O filtro de cliente é ignorado quando `asaasCustomerId` está
vazio. Um administrador que conheça uma assinatura de outra instituição pode,
por esse caminho, induzir a consulta de suas faturas. A permissão de escrita
foi reproduzida; a exposição de faturas é uma inferência direta desse fluxo,
**não uma consulta a uma fatura real de terceiro**.

Correção: tornar os IDs imutáveis para todo cliente, inclusive administradores
do tenant; vinculá-los a um pedido/registro de cobrança criado pelo servidor;
validar a origem e o cliente antes de retornar faturas. A criação inicial da
assinatura também precisa de uma lista estrita de campos, para não permitir
IDs arbitrários já no provisionamento. Testar criação e atualização maliciosas.

Critério de aceite: escrita direta de IDs negada; fatura de referência
incompatível não retornada; contratação legítima e webhook continuam funcionando.

### SEC-02 — Alta: membro comum lê dados internos de outras pessoas

**Confirmado:** `firestore.rules:432–438` e os matches genéricos `:728–749`
liberam documentos operacionais a qualquer membro ativo da mesma instituição.
Uma conta com apenas `roles: ["member"]` leu, por REST, quatro documentos
fictícios que deveriam ser internos: `families`, `visitorIntakes`,
`followUpTasks` e um `financeReports` em rascunho — todos HTTP **200**.

`Family` inclui endereço, faixa de renda e observações
(`packages/types/src/index.ts:336`); recepção inclui telefone
(`:687`). Esconder uma tela no app/painel não protege esses documentos.
As mesmas regras afetam o mobile e qualquer cliente que use o SDK/REST.
O isolamento entre instituições foi aprovado na prova equivalente, mas não
substitui o isolamento entre pessoas e funções dentro de uma instituição.

Correção: remover coleções sensíveis do acesso genérico; criar regras por papel,
titular e publicação. Auditar também `memberTribeProfiles`, `tribeAssessments`,
`tribeBehaviorSignals`, `tribeReviewRequests`, `journeyProfiles` e descendentes
da lista operacional. Se houver transparência financeira para membros,
publicar uma projeção expressamente aprovada, sem abrir rascunhos e anotações.

Critério de aceite: testes positivos para cada operador autorizado e negativos
para membro comum, outra família, outra instituição, usuário e instituição
bloqueados. Nenhum match genérico pode reabrir a permissão via OR.

### SEC-03 — Alta antes de restaurar cursos: publicação e compra só na interface

**Confirmado:** `firestore.rules:169–179` permite a qualquer usuário autenticado,
mesmo sem instituição, ler um programa global não publicado e suas aulas.
`firestore.rules:550–556` permite a membro ler aulas de curso institucional
inativo. As três provas retornaram HTTP **200** sem a liberação esperada.

Uma consulta da interface com `isPublished == true` não impede uma chamada
direta a outro documento. O mesmo vale para verificação de compra feita apenas
na tela. Isto pode expor URLs de vídeos/materiais e rascunhos.

O catálogo foi arquivado em 02/10; não foi restaurado nem novamente contado em
produção nesta auditoria. **Não restaurar materiais, mesmo como rascunho, antes
de corrigir essa regra:** o mecanismo atual de restauração em rascunho, sozinho,
não preserva a confidencialidade. As duas cópias privadas foram preservadas.

Correção: separar catálogo público de conteúdo protegido; verificar publicação,
instituição ativa e entitlement válido no servidor/regras. Administrador
editor pode revisar rascunhos; demais usuários precisam de autorização explícita.
Declaração de direitos autorais e controle de acesso são verificações distintas.

### SEC-04 — Média: Storage falha na avaliação e precisa de política explícita

**Confirmado:** `storage.rules:19` chama `tenantUser(orgId).exists()`. O emulador
retorna `Function not found error: Name: [exists]`. Leitura de marca por membro
ativo e upload por administrador legítimo retornaram HTTP **403**.

Não foi demonstrado vazamento no Storage: o erro bloqueia o acesso. Entretanto,
apenas trocar a função seria insuficiente. O código também não verifica status
da instituição, tamanho/tipo da imagem em branding e admite leitura genérica de
todo `organizations/{orgId}/**` para membros. Esses são riscos latentes na
política que deve ser redesenhada junto com a correção.

Usar `firestore.exists(caminho)` e `firestore.get(caminho).data`, verificar o
bloqueio institucional, limitar prefixos, tipos e tamanho. Fotos Kids e arquivos
financeiros devem continuar em caminhos privados mediados pelo backend.
Ver [documentação oficial de condições do Storage](https://firebase.google.com/docs/storage/security/rules-conditions).

### SEC-05 — Alta prioridade de manutenção: dependências com avisos de segurança

`pnpm audit --json` concluiu com código 1 e registrou **4 críticos, 82 altos,
91 moderados e 24 baixos** no resumo do gerenciador. A lista contém 150 avisos
distintos em 37 pacotes; contagens do grafo não são quantidade de ataques
exploráveis no produto. O próprio relatório informa `devDependencies: 0`,
embora inclua ferramentas de desenvolvimento; essa classificação não foi usada
como prova de execução em produção.

| Aviso crítico | Contexto encontrado | Avaliação |
| --- | --- | --- |
| `next` / ImageResponse | Next 16.3.4 no painel e LP | Não encontrei uso de `next/og`/`ImageResponse` com entrada externa no código da aplicação; exploração não demonstrada. Atualizar para versão corrigida, mínimo 16.3.8 para o conjunto de avisos consultados. |
| `tar` | Cadeia de `firebase-tools`, versão 7.5.13 | Risco da ferramenta ao extrair arquivo malicioso; não foi localizado endpoint do produto que faça essa extração. Aviso indica correção em 7.5.19. |
| `proxy-addr` | Dependência transitiva | Exploração depende de configuração de proxy/sub-rede vulnerável; não demonstrada no Worker. Aviso indica 2.0.8. |
| `shell-quote` | Cadeia React Native/devtools | Depende do uso vulnerável de `quote()`; não demonstrado no bundle mobile. Aviso indica 1.11.0. |

O aviso oficial do Next distingue Node e Edge e exige valores controlados pelo
atacante no SVG. Não se deve afirmar RCE confirmada neste projeto somente pela
versão instalada. [Aviso do mantenedor](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j).
O aviso de SSRF do otimizador de imagens exige `images.remotePatterns`; a
configuração web examinada não possui essa lista.

Correção: atualizar por grupos compatíveis (Next/OpenNext, Expo/RN e ferramentas),
refazer auditoria, build Cloudflare e builds nativos e testar os fluxos afetados.
Não foi aplicado `audit fix --force` nem uma atualização ampla sem validação.

### SEC-06 — Média: upload de marca confia no MIME informado pelo remetente

**Confirmado por código**, sem enviar arquivo ativo à produção:
`apps/web/app/api/assets/upload/route.ts:6–38` e
`apps/worker-api/src/index.ts:105–129` aceitam SVG e outros arquivos por
`file.type`. Não há inspeção dos bytes nem sanitização do SVG. O limite de
5 MB é avaliado depois de `formData()` carregar o corpo. A API exige token e
papel administrativo, o que limita o atacante, mas não valida o arquivo.

Risco: hospedar conteúdo ativo ou de tipo divergente no domínio de assets;
sobrecarga por corpo grande antes da rejeição. Não há prova de execução de
script na origem do painel. Correção: rasterizar/re-encodar imagens, sanitizar
ou rejeitar SVG, conferir assinatura/tipo e limitar o corpo antes de materializá-lo;
normalizar nomes e aplicar headers adequados no domínio de arquivos.

### SEC-07 — Média: a LP não recebe os headers aplicados ao painel

**Confirmado por HTTP público:** a resposta HTML de `plataformaesdras.com.br`
não trouxe CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options` nem
`Referrer-Policy`. O painel possui esses headers e não oferece CORS permissivo
nas respostas consultadas. No painel, CSP ainda permite `unsafe-inline` em
scripts; é um ponto de melhoria, não uma prova isolada de XSS.

Correção: aplicar headers na LP/router e validar recursos, formulário,
incorporações e navegação. Adotar nonce/hash para scripts quando compatível.
O `Permissions-Policy` do painel bloqueia câmera globalmente; conferir o
impacto funcional no leitor Kids ao revisar a política.

## Mobile e riscos que precisam de validação adicional

### SEC-08 — Revogação global de sessão não conferida pelo verificador local

`apps/web/app/api/_lib/verify-auth.ts:91–141` verifica assinatura, emissor,
público-alvo e validade, mas não consulta revogação/conta Firebase desativada.
O fallback também não examina `disabled`. A conclusão é de código; não foi
desativada uma conta real para testar uma sessão em produção.

Bloqueio por vínculo/organização é verificado nas APIs centrais e passou nos
testes. Entretanto, **desativar apenas a conta no Firebase Auth** não equivale
a revogar imediatamente todo token já emitido. Implementar e testar revogação
no servidor para ações sensíveis, com estratégia de cache e indisponibilidade.
[Firebase: gerenciamento e revogação de sessões](https://firebase.google.com/docs/auth/admin/manage-sessions).

### SEC-09 — Mobile: permissões, links externos e assinatura a conferir

- Sessão: `access-monitor.ts` revalida ao retomar e a cada 60 segundos, bloqueia
  em timeout/erro e descarta respostas antigas. Isso não substitui as regras
  de dados — o mobile está sujeito a SEC-01/02/03.
- Armazenamento: SecureStore guarda a instituição escolhida por UID. Não foi
  encontrado armazenamento de senha pelo app. O Firebase mobile usa `getAuth`;
  não foi identificada uma implementação explícita de persistência dos tokens
  no SecureStore. Não afirmar que todos os tokens estão protegidos por ele.
- O cadastro mobile aceita senha de seis caracteres. A configuração Auth
  consultada não retornou política personalizada de senha. A proteção contra
  enumeração de e-mail está **ativada**; a mensagem específica de senha na
  interface não demonstra, por si, enumeração explorável.
- `App.tsx:679,796`: URLs de aulas/materiais vão a `Linking.openURL` sem allowlist
  local de esquema/domínio. A publicação nova valida URLs, mas dados legados
  merecem defesa adicional. Restringir a HTTPS e destinos apropriados; tratar
  falhas sem abrir esquemas inesperados. Não foi demonstrada execução de código.
- `App.tsx:1480`: `console.error(e)` fora de `__DEV__`; reduzir/redigir logs de
  produção. Não houve comprovação de dado pessoal em log de aparelho real.
- O `Info.plist` do archive usa `NSAllowsArbitraryLoads=false`, mas permite rede
  local. Há descrições de microfone e biblioteca de fotos genéricas em inglês;
  remover microfone se desnecessário e justificar as permissões efetivas. No
  Expo Android, `RECORD_AUDIO` está bloqueado; confirmar no manifesto final.
- `codesign` no **archive local** mostrou `get-task-allow=true` e
  `aps-environment=development`. Isto é evidência de assinatura de desenvolvimento
  desse artefato, **não do IPA exportado ou do app instalado via TestFlight**.
  O IPA distribuído não está disponível na pasta de build e não foi verificado.
  Conferir o arquivo exportado e registrar `get-task-allow=false` antes de
  distribuição direta. [Referência Apple sobre perfis](https://developer.apple.com/library/archive/technotes/tn2319/_index.html).
- AAB 15 foi inspecionado como arquivo/bundles. `aapt2` não decodificou o manifesto
  protobuf do AAB; portanto não certifico `debuggable`, backup, cleartext ou
  componentes exportados do APK instalado. Usar bundletool/análise do APK
  distribuído e testes em dispositivo na próxima homologação.

### SEC-10 — Comprovantes no mesmo bucket de assets: exposição a confirmar

`apps/worker-api/src/index.ts:233–280` grava comprovantes em
`BRAND_ASSETS_BUCKET`, também usado para branding público. O handler não
retorna URL pública, mas isso não é controle de leitura. O domínio público do
bucket é configurado em `apps/worker-api/wrangler.jsonc`.

Não consultei comprovantes reais nem confirmei a configuração efetiva de
domínio/ACL do R2. **Risco arquitetural pendente de confirmação**, não vazamento
demonstrado. Separar bucket privado de comprovantes e exigir endpoint
autenticado/URL temporária; desabilitar a rota legada se não for mais usada.

### SEC-11 — Limite em memória no intake Wi-Fi

`apps/worker-api/src/index.ts:163–177` mantém contadores num `Map` do isolate.
Não há garantia de limite global entre instâncias/reinicializações. A rota
exige segredo do roteador; não foi demonstrado abuso público sem esse segredo.
O `RateLimiter` genérico do web também é local, mas não foi encontrado uso dele
nas rotas atuais, portanto não é tratado como falha global da API.

Fluxos centrais de Kids, parceiros e cotas usam controles persistidos e testes
específicos. Avaliar Durable Object/controle distribuído para Wi-Fi e proteção
de borda para uploads; evitar afirmar que toda a aplicação depende do Map.

## Checklist da imagem

“Verificado no escopo” significa evidência obtida nesta auditoria, não selo
definitivo. “Parcial” inclui limites de execução e pontos ainda sem prova.

| # | Item solicitado | Resultado |
| --- | --- | --- |
| 1 | Chave de API protegida | Parcial: segredos de Asaas/provedores/uploads ficam no servidor; nenhum padrão de segredo encontrado nos bundles pesquisados. Chaves públicas Firebase não são segredo. Restrições completas no Google Cloud pendentes. |
| 2 | `.env` não exposto | Verificado nos caminhos consultados: `/.env` e `/.env.local` responderam 403; `.git/HEAD` e `service-account.json`, 404. `.env.production` versionado contém apenas configuração pública Firebase/Turnstile. |
| 3 | Sem senha no código | Nenhuma credencial real identificada na busca; senha fixa encontrada em fixtures está limitada ao emulador. Busca por padrões não cobre todo formato possível. |
| 4 | Login real | Firebase Auth, token validado e controles de tenant; proteção contra enumeração habilitada. Revogação global e política de senha: SEC-08/09. |
| 5 | Permissão no servidor | Falha: SEC-01/02/03. Vários endpoints corretos não compensam regras diretas permissivas. |
| 6 | Não confiar no ID da tela | Parcial: Kids/Pass usam vínculo servidor; cobrança confia em IDs que o cliente pode alterar (SEC-01). |
| 7 | Cada um só vê o seu | Falha dentro da instituição (SEC-02) e conteúdo global (SEC-03); prova entre instituições negada. |
| 8 | Banco protegido | Há regras e bloqueio de escrita sensível, mas permissões de leitura precisam correção. |
| 9 | Firebase/Supabase/Storage | Firebase auditado; Storage com erro (SEC-04); Supabase não integra esta arquitetura. R2: SEC-10. |
| 10 | Admin protegido | Cliente não cria `platformAdmins`, membro não promove seu papel; gestão central valida no backend. Escopo administrativo de cobrança ainda excessivo. MFA/IAM dos consoles não auditados. |
| 11 | Debug desligado | Parcial: CSP de produção sem unsafe-eval; archive local iOS de desenvolvimento; artefato distribuído precisa conferência (SEC-09). |
| 12 | Erro sem detalhes | Rotas críticas usam mensagens genéricas; rever erro bruto no Wi-Fi e console mobile. Não foram provocados erros de produção com dados reais. |
| 13 | Validação no servidor | Presente em operações críticas e limites de corpo; falta validar campos das demais tarefas de Sabedoria Pastoral por schema, além da checagem genérica do objeto. Upload e cobrança: SEC-01/06. |
| 14 | Tratar conteúdo recebido | React/Markdown sem inserção livre de HTML nos caminhos revisados; SVG sem sanitização (SEC-06), links mobile sem defesa local (SEC-09). |
| 15 | Upload protegido | Kids privado passou em 62 verificações. Branding/Storage/R2 exigem correções SEC-04/06/10. |
| 16 | Sem SQL injection | SQL não é usado nos fluxos examinados; Firestore com IDs/consultas estruturadas. Isso não elimina problemas de autorização ou validação de caminhos. |
| 17 | Limite de tentativas | Verificado em Kids/Pass e cotas transacionais; Wi-Fi local por isolate (SEC-11); resistência global a abuso não homologada. |
| 18 | Git sem segredo vazado | 2.435 blobs pesquisados sem segredo real identificado; não cobre blobs grandes, todo histórico remoto possível, logs externos ou backups locais. |
| 19 | Headers/CORS | Painel com controles nas amostras; LP sem headers (SEC-07). Não há ACAO indiscriminado nas respostas consultadas. |
| 20 | Teste como estranho | Contas sintéticas sem papel/fora do tenant e chamadas anônimas executadas; 10 divergências relevantes nos probes. |
| 21 | Auditoria completa com assistência | Checklist inteiro avaliado com evidências e limites; não é certificação, pentest exaustivo nem prova de ausência de incidentes. |

A presença de `NEXT_PUBLIC_FIREBASE_API_KEY`/`EXPO_PUBLIC_FIREBASE_API_KEY` no
cliente é esperada: a autorização depende de Auth, Rules e outras proteções.
Não deve ser confundida com uma chave de serviço/admin ou segredo do Asaas.
[Firebase: chaves de API](https://firebase.google.com/docs/projects/api-keys).

## Como reproduzir e fechar

```sh
corepack pnpm qa:emulators
# Em outro terminal; grava somente resultado sanitizado:
node scripts/with-qa-env.mjs node scripts/audit-security-local.mjs /tmp/esdras-audit.json
```

A suíte adicional sai com código 1 enquanto expectativas de segurança falharem.
É um diagnóstico reproduzível, não um teste marcado como aprovado por encontrar
uma vulnerabilidade. As contas e documentos próprios são apagados ao final.

Para integrações: `qa:seed`, `qa:web`, depois `qa:kids-custody`, `qa:kids-media`,
`qa:member-pass`, `qa:partner-pass`. Todos usam `demo-alvo-qa` e localhost.
Não direcionar as provas de escrita a um projeto real.

Ordem de trabalho:

1. Fechar SEC-01 e SEC-02 com casos positivos/negativos por função; publicar
   regras somente após homologar clientes web/mobile.
2. Fechar SEC-03 antes de qualquer restauração de cursos; preservar backups.
3. Corrigir Storage com política explícita (SEC-04), uploads e separação privada
   de comprovantes; comprovar a configuração real do R2.
4. Atualizar dependências em lotes compatíveis e aplicar headers da LP.
5. Validar revogação Auth, permissões e artefatos finais Android/iOS; repetir
   testes em dispositivo, inclusive após bloqueio, logout e troca de instituição.

Critérios gerais: nenhuma leitura financeira/familiar indevida; nenhum ID de
cobrança escolhido pelo cliente; aulas protegidas mesmo por REST; acesso legítimo
ao Storage preservado; arquivos sensíveis privados; riscos de dependências
reavaliados; builds de distribuição e comportamento em aparelho conferidos.

**Progresso:** manter os indicadores funcionais históricos — sistema **96,40%**,
mobile **97%**, LP **100% do escopo funcional anterior** — sem aumento por esta
auditoria. Esses valores não medem segurança. A homologação de segurança está
**pendente**, com os bloqueadores acima; não há fundamento para declarar 100%.
O plano gratuito permanece em **50 membros**, inclusive nas verificações de
Kids e parceiros executadas. Nenhum deploy de aplicação ou novo AAB/IPA faz
parte desta entrega de auditoria.
