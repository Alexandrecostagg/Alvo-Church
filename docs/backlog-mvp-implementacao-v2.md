# Backlog MVP de implementação - Alvo Church

Atualizado em: 19 de junho de 2026

## Objetivo

Transformar o roadmap conceitual em uma lista prática de trabalho para as próximas rodadas de desenvolvimento.

## Princípios

- Começar pelo que reduz retrabalho operacional da igreja.
- Manter pessoas como base central do sistema.
- Evitar telas bonitas sem persistência quando o módulo já precisa operar.
- Preservar UX consistente entre dashboard, recepção, IA pastoral, finanças e novos módulos.
- Separar protótipo local, dado mockado e integração real.
- Nenhum módulo novo polui o menu — o feature gate da organização controla a visibilidade.

## Legenda

- `Pronto visual`: tela já revisada em UX, mas pode ter dados mockados.
- `Parcial`: existe rota ou protótipo, mas precisa consolidação.
- `Fazer`: ainda precisa implementação relevante.
- `Novo`: módulo documentado, ainda não iniciado.

---

## Épico 1 — Base de pessoas e jornadas

Status: `Parcial`

Entregas:

- persistir pessoa/membro/visitante em uma fonte única
- deduplicar por telefone, email e nome aproximado
- criar timeline da pessoa
- ligar pessoa a família, grupo, evento, tribo e atendimento pastoral
- criar estados de jornada: visitante, novo membro, membro ativo, líder, cuidado especial

Prioridade: alta.

---

## Épico 2 — Recepção e Painel Pastor

Status: `Pronto visual`

Entregas:

- salvar visitante real
- listar visitantes do dia
- enviar visitante para painel pastor
- marcar como cumprimentado
- gerar tarefa de follow-up
- registrar observação pastoral sem expor dado sensível no painel público

Prioridade: alta.

---

## Épico 3 — Finanças e PIX

Status: `Pronto visual`

Entregas:

- persistir lançamentos
- separar entrada, saída, categoria, campanha e centro de custo
- criar trilha de auditoria
- exportar relatório
- preparar integração PIX/gateway
- definir permissões financeiras

Prioridade: alta.

---

## Épico 4 — Kids Security

Status: `Pronto visual`

Entregas:

- cadastrar criança e responsáveis
- check-in por culto/evento
- token de retirada
- alertas de segurança
- histórico de presença
- impressão ou exibição de etiqueta

Prioridade: alta.

---

## Épico 5 — IA Pastoral

Status: `Pronto visual`

Entregas:

- definir sinais reais de risco/cuidado
- registrar sugestões da IA
- permitir aprovação humana antes de mensagem sensível
- controlar custo por tenant
- auditar prompts e respostas essenciais sem expor dados indevidos

Prioridade: média-alta.

---

## Épico 6 — Louvor, cifras e escalas

Status: `Pronto visual` em Louvor & Cifras, `Parcial` em Escalas

Entregas:

- biblioteca de músicas
- cifra por música
- transposição persistida por setlist
- setlist por evento/culto
- voluntários escalados por função
- observações de arranjo e links externos

Prioridade: média.

---

## Épico 7 — Marketplace comunitário

Status: `Pronto visual`

Entregas:

- cadastro real de loja
- moderação e aprovação
- categorias
- destaque e reputação
- contato seguro
- políticas de uso e responsabilidade

Prioridade: média.

---

## Épico 8 — SaaS, organizações e white-label

Status: `Parcial`

Entregas:

- criar tenant real
- validar slug único
- ativar módulos por plano via feature gate
- limites de assentos, campus e IA
- branding por organização
- domínio/subdomínio
- log de provisionamento

Documento de referência: `arquitetura-feature-gate-menu.md`

Prioridade: média.

---

## Épico 9 — Limpeza técnica e rotas antigas

Status: `Fazer`

Entregas:

- decidir destino de `/marketplace`
- proteger ou remover `/test`
- documentar ou remover `/wifi`
- manter menu lateral alinhado com rotas reais
- evitar funções escondidas

Prioridade: média.

---

## Épico 10 — Formulários públicos e QR Code ⭐ NOVO

Status: `Novo`

Documento de referência: `modulo-formularios-publicos-qrcode.md`

Entregas:

- criar rota pública `/p/[orgSlug]/visit` com formulário de visitante
- conectar ao Firebase com criação de `people` e `visitorIntakes`
- sincronizar com a recepção em tempo real
- gerar QR Code no painel admin (PNG e PDF imprimível)
- criar página de confirmação personalizada por organização
- criar portal público `/p/[orgSlug]`
- criar check-in de adultos por QR Code `/p/[orgSlug]/checkin/[eventSlug]`
- criar página pública de evento `/p/[orgSlug]/events/[eventSlug]`

Prioridade: **crítica**. Primeira pergunta antes de qualquer contrato.

---

## Épico 11 — Giving recorrente e doações ⭐ NOVO

Status: `Novo`

Documento de referência: `modulo-giving-doacoes-recorrentes.md`

Entregas:

- criar estrutura de dados `donations` e `recurring_giving` no Firestore
- integrar gateway para PIX dinâmico com geração de QR Code
- criar tela de doação no app mobile
- criar link público `/p/[orgSlug]/give`
- conectar doações ao módulo de Finanças (lançamento automático)
- implementar recorrência mensal com cartão de crédito
- criar módulo de campanhas (painel admin e app)
- criar geração de carta fiscal em PDF

Prioridade: **crítica**. Segunda pergunta antes de qualquer contrato.

---

## Épico 12 — Comunicação multicanal ⭐ NOVO

Status: `Novo`

Documento de referência: `modulo-comunicacao-multicanal.md`

Entregas:

- criar estrutura de dados `communication_campaigns` e `communication_deliveries`
- integrar FCM para push (já na stack — criar fluxo de envio manual)
- criar tela `/communication/new` com seleção de audiência e canal push
- integrar Resend para email com template base por organização
- criar histórico de comunicações no perfil da pessoa
- adicionar SMS via Zenvia
- criar sistema de templates salvos
- criar campanhas programadas (agendamento)
- integrar WhatsApp via API oficial como add-on premium

Prioridade: **alta**. Terceiro gap mais crítico para fechamento de contratos.

---

## Épico 13 — Feature gate e menu progressivo ⭐ NOVO

Status: `Novo`

Documento de referência: `arquitetura-feature-gate-menu.md`

Entregas:

- implementar leitura de `organizations/{organizationId}/settings/features` no login
- implementar `isModuleEnabled()` em `packages/domain`
- filtrar menu lateral por módulos ativos da organização
- proteger rotas no web com `requireModule()` middleware
- filtrar abas do app mobile pelos mesmos módulos
- criar tela `/upgrade` com contexto do módulo solicitado
- criar interface em Configurações > Módulos para admin visualizar plano ativo

Prioridade: **alta**. É a infraestrutura que protege o sistema de poluição à medida que novos módulos entram.

---

## Épico 14 — Módulos da Camada 2 ⭐ NOVO (roadmap futuro)

Status: `Novo`

Documento de referência: `modulos-camada-2-ministerio-cuidado.md`

Sub-épicos (a serem detalhados individualmente):

- 14a: Jovens e Adolescentes (`modules.youth`)
- 14b: Cuidado Pastoral e Aconselhamento (`modules.pastoralCare`)
- 14c: Automações e Workflows (`modules.workflows`)
- 14d: EAD Completo com quiz e certificado (`modules.ead`)
- 14e: Analytics Pastorais com exportação (`modules.analytics`)
- 14f: Missões Externas (`modules.missions`)

Prioridade: média (após Camada 1 entregue e estável).

---

## Próxima sequência recomendada

1. Fechar persistência de pessoas (Épico 1).
2. Conectar recepção e painel pastor a dados reais (Épico 2).
3. Implementar feature gate no menu lateral (Épico 13) — protege tudo que vem depois.
4. Construir formulários públicos + QR Code (Épico 10).
5. Implementar giving com PIX real (Épico 11).
6. Construir comunicação multicanal com push e email (Épico 12).
7. Conectar finanças com lançamentos persistidos (Épico 3).
8. Conectar Kids Security com pessoas/famílias (Épico 4).
9. Revisar marketplace, louvor e escalas com dados reais (Épicos 6 e 7).
10. Iniciar módulos da Camada 2 conforme maturidade do produto (Épico 14).
