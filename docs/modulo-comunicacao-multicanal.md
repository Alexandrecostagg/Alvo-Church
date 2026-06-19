# Módulo de comunicação multicanal - Alvo Church

Data: 19 de junho de 2026

## 1. Objetivo

Definir o módulo de comunicação do Alvo Church: motor nativo de envio de mensagens segmentadas por email, push notification e SMS, operado diretamente dentro da plataforma, sem depender de ferramentas externas para comunicação pastoral e operacional.

## 2. Problema que resolve

Hoje o sistema depende do WhatsApp externo para qualquer contato com visitantes e membros. Isso cria:

- falta de histórico centralizado de comunicações
- impossibilidade de segmentar por grupo, jornada ou tribo dentro da plataforma
- perda de rastreabilidade (quem enviou o quê e quando)
- dependência de ferramenta pessoal do líder, não da organização

O módulo de comunicação resolve isso com um motor nativo que usa os mesmos dados de pessoas, grupos e jornadas que já existem no sistema.

## 3. Canais suportados

### Push notification (FCM via Firebase)

- funciona para membros com o app instalado
- custo zero operacional (Firebase gratuito até volumes altos)
- entrega imediata
- suporte a deep link (notificação abre tela específica do app)

### Email

- integração com provedor transacional (SendGrid, Resend ou AWS SES)
- para pessoas com email cadastrado
- templates com logo e cores da organização (via tokens do tenant)
- rastreamento de abertura (opcional)

### SMS

- integração com provedor nacional (Twilio, Zenvia ou similar)
- para pessoas sem app instalado ou email
- custo variável por mensagem (add-on de volume)
- ideal para comunicação urgente ou com visitantes novos

### WhatsApp (via API oficial)

- integração com WhatsApp Business API (Meta)
- custo por conversa iniciada pela organização
- templates pré-aprovados pela Meta
- ideal para follow-up de visitante e confirmação de evento
- add-on premium (custo por conversa)

## 4. Segmentação de audiência

O motor de comunicação usa os dados já existentes no sistema para segmentar sem precisar criar listas manuais:

### Segmentos disponíveis

| Segmento | Descrição |
|---|---|
| Toda a base | Todos os membros e visitantes ativos |
| Por grupo/célula | Membros de um grupo específico |
| Por jornada | Todos em uma etapa (ex: visitantes sem follow-up) |
| Por tribo | Membros de uma tribo ministerial |
| Por evento | Inscritos em um evento |
| Por tag | Pessoas com tag manual atribuída |
| Por inatividade | Sem presença há X dias |
| Personalizado | Combinação de filtros |

### Filtros combinados

Exemplos de segmentos criados por filtro:

- visitantes que vieram há mais de 7 dias e não têm célula
- membros da tribo Levi que não foram escalados nos últimos 30 dias
- todos inscritos no Retiro de Jovens que ainda não confirmaram presença
- membros sem email cadastrado (para incentivar atualização de perfil)

## 5. Tipos de comunicação

### Mensagem pontual

Envio único para um segmento ou pessoa específica. Usada para:

- comunicados de evento
- mudança de horário de culto
- convite para campanha
- follow-up manual de visitante

### Campanha programada

Envio agendado para data e hora futuras. Usada para:

- lembrete de evento na véspera
- comunicado semanal de agenda
- campanha de dízimo

### Automação (workflow de comunicação)

Envio acionado por evento do sistema. Exemplos:

- visitante cadastrado → push/SMS de boas-vindas 1 hora depois
- membro sem presença há 21 dias → mensagem de cuidado
- inscrição em evento confirmada → email de confirmação automática
- novo membro cadastrado → email de boas-vindas com próximos passos

As automações fazem parte do módulo `workflows` (Camada 2). O módulo `communication` fornece o canal de envio; o `workflows` fornece os gatilhos.

## 6. Interface no painel admin

Localização: Comunicação (item no menu lateral, visível quando módulo ativo)

### Telas

- `/communication` — histórico de mensagens enviadas e em andamento
- `/communication/new` — nova mensagem ou campanha
- `/communication/templates` — templates salvos por canal
- `/communication/automations` — regras de envio automático (quando módulo workflows ativo)

### Criação de mensagem

1. escolher canal (push, email, SMS, WhatsApp)
2. definir audiência (segmento ou busca por pessoa)
3. escrever conteúdo (com preview por canal)
4. agendar ou enviar imediatamente
5. confirmar e monitorar entrega

## 7. Templates

Cada canal tem templates próprios salvos por organização:

### Email

- template base com logo, cores e rodapé da organização
- blocos editáveis: cabeçalho, corpo, CTA, rodapé
- variáveis dinâmicas: `{nome}`, `{evento}`, `{celula}`, `{pastor}`

### Push

- título (max 60 chars)
- corpo (max 150 chars)
- ícone (usa logo da organização)
- deep link opcional (abre tela específica do app)

### SMS

- texto simples (max 160 chars por segmento)
- link encurtado automático

## 8. Histórico e rastreabilidade

Cada mensagem enviada gera registro em `communication_deliveries`:

- destinatário (person_id)
- canal usado
- status: `sent | delivered | opened | failed`
- timestamp de cada etapa
- id da campanha origem

O histórico fica visível no perfil da pessoa em Pessoas > [nome] > Comunicações, mostrando todas as mensagens recebidas com data e canal.

## 9. Dados gerados

| Ação | Gera | Aparece em |
|---|---|---|
| Mensagem enviada | `communication_deliveries` | Histórico em Comunicação e Perfil da Pessoa |
| Campanha criada | `communication_campaigns` | Comunicação > Histórico |
| Template salvo | `communication_templates` | Comunicação > Templates |
| Automação disparada | `communication_deliveries` com `trigger_type` | Jornadas, Comunicação |

## 10. Estrutura de dados sugerida

### communication_campaigns

- `id`
- `organization_id`
- `name`
- `channel`: `push | email | sms | whatsapp`
- `audience_type`: `all | group | journey | tribe | event | tag | custom`
- `audience_config` (JSON com filtros)
- `content_subject` (para email)
- `content_body`
- `template_id` (nullable)
- `status`: `draft | scheduled | sending | sent | failed`
- `scheduled_at` (nullable)
- `sent_at` (nullable)
- `sent_by_user_id`
- `created_at`

### communication_deliveries

- `id`
- `organization_id`
- `campaign_id`
- `person_id`
- `channel`
- `address` (email, telefone ou device token — não exposto em listagem)
- `status`: `queued | sent | delivered | opened | failed`
- `sent_at`
- `delivered_at`
- `opened_at`
- `error_code` (nullable)
- `trigger_type`: `manual | scheduled | automation`
- `trigger_reference_id` (nullable, ID do workflow que disparou)

## 11. Provedores e integrações

Toda comunicação com provedores externos passa pelo `apps/worker-api` (Cloudflare Workers):

- nunca expõe chaves de API no frontend
- faz fila de envio com retry automático
- normaliza erros de diferentes provedores
- registra status de entrega via webhook do provedor

### Provedores sugeridos por canal

| Canal | Provedor inicial |
|---|---|
| Push | Firebase Cloud Messaging (FCM) — já na stack |
| Email | Resend (simples, moderno, bom DX) |
| SMS | Zenvia (cobertura nacional, suporte em PT) |
| WhatsApp | Meta Business API via Gupshup ou 360dialog |

## 12. Plano de ativação

Este módulo pertence à Camada 1 — Operacional completo.

- campo no feature gate: `modules.communication`
- aparece no menu lateral como "Comunicação" apenas quando ativo
- add-ons de volume (SMS e WhatsApp) são cobrados separadamente por uso

## 13. Prioridade de implementação

Alta. É o terceiro gap mais crítico para fechamento de novos contratos.

### Sequência técnica recomendada

1. criar estrutura de dados `communication_campaigns` e `communication_deliveries`
2. integrar FCM para push (já na stack — só criar fluxo de envio manual)
3. criar tela `/communication/new` com seleção de audiência e canal push
4. integrar Resend para email com template base por organização
5. criar histórico de comunicações no perfil da pessoa
6. adicionar SMS via Zenvia como canal adicional
7. criar sistema de templates salvos
8. criar campanhas programadas (agendamento)
9. integrar WhatsApp via API oficial como add-on premium
