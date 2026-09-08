# Entrega 16 — administração central da Plataforma Esdras

Data: **08/09/2026**  
Avanço estimado: **93,45%**, ganho de **0,40 ponto percentual**.

## Problema confirmado

O painel `/platform-admin` apresentava somente a visão agregada das instituições.
Não havia caminho para o administrador da Plataforma Esdras corrigir o cadastro,
trocar plano, suspender a operação, pausar funções ou tratar acessos indesejados.

## Entrega

- edição do nome público e da situação `ativa`, `inativa` ou `suspensa`;
- alteração do plano e da situação de cobrança;
- ativação ou pausa administrativa dos módulos conhecidos;
- alteração de papéis e bloqueio/reativação de usuários;
- remoção do acesso de contas sem vínculo cadastral;
- histórico recente das ações administrativas.

As operações passam por `/api/platform/organizations`. A API verifica o ID token
e a existência de `platformAdmins/{uid}` em cada transação, limita o corpo da
requisição, valida IDs e opções e devolve erros sem dados internos.

Cada mudança exige um motivo com pelo menos oito caracteres e grava uma entrada
privada em `platformAdminAudit` com ator, alvo, ação, estado anterior, estado
posterior e horário. Não há gravação administrativa direta feita pela tela.
As regras também negam atualização direta de situação, assinatura e módulos pelo
SDK; essas mutações passam obrigatoriamente pela API auditada.

## Proteções preservadas

- O plano Gratuito continua limitado a **50 membros**.
- Downgrade acima do novo limite exige confirmação explícita e auditada.
- O último `super_admin` ou `church_admin` ativo não pode ser bloqueado, rebaixado
  ou removido.
- Contas ligadas a uma pessoa ou a um vínculo de membro são bloqueadas em vez de
  apagadas, preservando histórico e integridade referencial.
- Suspender a instituição ou o usuário retira papéis da sessão e bloqueia as
  coleções operacionais no Firestore.
- A rota `/platform-admin` continua acessível ao administrador Esdras para permitir
  a recuperação de uma instituição suspensa.
- O plano continua sendo o teto comercial. A pausa manual pode fechar um módulo,
  mas não libera uma função que o plano não inclui.

## Validação

- **364 testes em 30 arquivos** passaram;
- seis cenários novos cobrem autorização, limite de 50, último administrador,
  bloqueio, preservação de conta ligada e pausa de módulo;
- TypeScript passou nos 13 projetos do monorepo;
- build OpenNext/Cloudflare concluiu com a nova rota dinâmica;
- regras Firestore compilaram na API oficial com Firebase CLI 15.29.0;
- QA local confirmou lista, editor, auditoria e mensagem de proteção do último admin;
- Worker publicado: `f2148e9c-de63-4abe-807f-fed2a840d284` (100%);
- `/platform-admin` publicado respondeu **200**;
- API administrativa sem autenticação respondeu **401**;
- formulário público sem Turnstile respondeu **400** e o secret permaneceu listado
  como `secret_text` após o deploy;
- regras Firestore foram liberadas no projeto `alvo-church`.

Nenhum dado de instituição em produção foi alterado durante o QA. As mutações de
interface foram exercitadas somente no emulador local.

## Percentual

Fundação sobe de 99 para 100 e SaaS/organizações de 95 para 98. O cálculo é
`93,05 + (10×1 + 10×3)/100 = 93,45%`.

O avanço é menor que as entregas intermediárias porque estas frentes estão perto
do teto. Ainda faltam homologação em aparelhos, relação familiar e inventário
legado em Kids, sandbox financeiro real, comunicação por provedor e migrações.
