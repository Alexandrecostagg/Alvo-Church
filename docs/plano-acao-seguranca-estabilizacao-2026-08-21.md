# Plano de ação — segurança e estabilização

Atualizado em **05/09/2026**; nome do arquivo preservado para manter os links.
Este plano organiza os achados da varredura técnica
para tornar a Plataforma Esdras segura, coerente para o cliente e pronta para
homologação mobile. Itens marcados como **bloqueadores** devem estar concluídos
antes de ampliar o uso com dados reais ou enviar versões para as lojas.

## Situação consolidada em 05/09

Os andamentos e IDs de publicação de agosto, preservados abaixo, são históricos.
A consolidação de setembro foi validada localmente e **não foi publicada**.
Execução atual: [backlog ativo](backlog-mvp-implementacao-v2.md).
Medição e evidências: [estado da implementação](status-implementacao-2026-09-05.md).

| Frente | Confirmado localmente | Ainda bloqueia o fechamento |
| --- | --- | --- |
| 1 — Acesso/assinatura | Gestão de usuários restrita; campos de assinatura/abrangência protegidos; cadastro completo transacional com limite real. | Migrar recepção/escalas, rever cobertura por coleção e proteger vínculo conta/pessoa. |
| 2 — APIs/Kids | Upload de marca mediado por API; coleção genérica limitada a lista fechada; token Kids criptográfico no web e mobile. | QR por URL/cache, fotos privadas, mediação de comprovantes, rate limit persistente/anti-spam. |
| 3 — Custo/cobrança | API principal de IA consome cota no servidor; PIX estático existe. | Cota uniforme de banners, idempotência de checkout, consentimento/opt-out e destinatários da comunicação. |
| 4 — Dados/fluxos | Dashboard/ficha sem dados inventados; leitura Kids por responsável/operador testada. | Fallbacks em recepção, rede, marketplace, bem-estar e pastoral; falso sucesso Wi-Fi; fluxo Kids mobile. |
| 5 — Validação | 167 testes, typecheck, QA transacional e export iOS registrados; build LP passou nesta revisão. | Dependências com advisories; homologação física Android/iOS; cobertura completa de papéis/coleções e integrações. |

### Novo requisito explícito — identidade e Passe

`AuthUser.personId` existe como tipo, mas `fetchTenantUser` não o devolve ao app.
As regras de autoedição em `users/{uid}` não o protegem. Antes de usar esse campo
como prova de identidade, bloquear autoatribuição/troca, definir vinculação por
operação autorizada e testar isolamento entre usuários/igrejas. A carteirinha
deve respeitar consentimento e benefício ativo; não associar por nome/e-mail.

### Auditoria de dependências de 05/09

`pnpm audit --prod` retornou 3 críticos, 50 altos, 51 moderados e 5 baixos no
resumo do scanner. O inventário possui 105 advisories distintos; não confundir
com quantidade de falhas exploráveis no produto. Inclui cadeias de ferramentas
do Expo. [Inventário](auditoria-dependencias-2026-09-05.json).

Next instalado ainda é 16.2.4; o mínimo antigo abaixo não deve virar garantia
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
account. A próxima evolução é substituir o limite em memória por Turnstile e
limite persistente no Cloudflare.

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
2. Fechar vínculo conta/pessoa e Passe; QR/fotos/fluxo Kids.
3. Migrar cadastros legados, proteger uploads e persistir limites/cotas.
4. Remover dados simulados e homologar cobrança/comunicação.
5. Ampliar testes de regras, homologar aparelhos/papéis e só então publicar.

## Critério de conclusão

Cada item só é concluído após revisão de código, teste do caminho permitido e
tentativa comprovadamente bloqueada do caminho indevido. Alterações de regras
ou backend são publicadas apenas junto de uma validação no ambiente de
homologação.
