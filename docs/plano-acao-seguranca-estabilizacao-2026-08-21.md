# Plano de ação — segurança e estabilização

Atualizado em 21/08/2026. Este plano organiza os achados da varredura técnica
para tornar a Plataforma Esdras segura, coerente para o cliente e pronta para
homologação mobile. Itens marcados como **bloqueadores** devem estar concluídos
antes de ampliar o uso com dados reais ou enviar versões para as lojas.

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

## Ordem de execução

1. Acesso/abrangência e regra de Firestore.
2. Upload público, QR Kids e controles de IA.
3. Atualização de dependências críticas.
4. Remoção de dados simulados e fluxos funcionais.
5. Testes de regra, build, homologação e publicação.

## Critério de conclusão

Cada item só é concluído após revisão de código, teste do caminho permitido e
tentativa comprovadamente bloqueada do caminho indevido. Alterações de regras
ou backend são publicadas apenas junto de uma validação no ambiente de
homologação.
