# Módulo de giving recorrente e doações - Alvo Church

Data: 19 de junho de 2026

## 1. Objetivo

Definir o módulo de giving do Alvo Church: dízimos, ofertas e doações recorrentes integradas ao sistema, com suporte a PIX, cartão de crédito, campanhas de oferta, carta fiscal e transparência financeira para o membro.

## 2. Por que é prioridade crítica

Giving é a primeira pergunta de qualquer pastor antes de contratar um sistema de gestão. Sem doação digital recorrente, o produto não fecha negócio com igrejas que já usam qualquer solução concorrente.

O módulo de Finanças já existe no sistema com lançamentos manuais e simulação de PIX. O giving recorrente é a evolução natural: adiciona o fluxo de doação iniciado pelo próprio membro, com recorrência agendada e integração real com gateway de pagamento.

## 3. Diferença entre Finanças e Giving

Esses são módulos distintos mas conectados:

| Finanças (`/finance`) | Giving (`/giving`) |
|---|---|
| Visão administrativa de entradas e saídas | Interface do membro para doar |
| Lançamentos manuais e conciliação | Doações automáticas e recorrentes |
| Controle de caixa, categorias e campanhas | Histórico de doações por pessoa |
| Acesso restrito à liderança financeira | Acesso do membro via app e web pública |

O giving alimenta as finanças: cada doação processada cria um lançamento em `finance.entries` automaticamente.

## 4. Formas de pagamento suportadas

### MVP do módulo

- PIX (geração de QR Code dinâmico via gateway)
- PIX recorrente agendado (via integração com gateway ou instrução de agendamento)
- cartão de crédito com recorrência mensal

### Expansão futura

- boleto bancário
- débito automático
- carteira digital (quando disponível no Brasil)

## 5. Tipos de doação

### Dízimo recorrente

- valor fixo mensal definido pelo membro
- processado automaticamente na data escolhida
- membro pode pausar, alterar ou cancelar a qualquer momento via app ou web

### Oferta avulsa

- valor livre ou sugerido
- destinada ao fundo geral ou a uma campanha específica
- processada imediatamente

### Campanha de oferta

- vinculada a um projeto ou causa específica
- tem meta, prazo e progresso público (opcional)
- membro pode destinar doação avulsa ou criar recorrência para a campanha
- exemplos: reforma, missões, fundo social, EBF

### Doação anônima

- processada normalmente mas sem vinculação ao perfil da pessoa no painel
- registrada apenas para controle financeiro

## 6. Fluxo do membro

### Via app mobile

1. membro acessa aba "Doações" ou "Contribuir"
2. escolhe tipo: dízimo, oferta ou campanha
3. informa valor e forma de pagamento
4. se PIX: exibe QR Code para pagar imediatamente
5. se cartão: formulário seguro via gateway (tokenizado, nunca armazenado no sistema)
6. confirmação com recibo na tela
7. histórico atualizado em tempo real

### Via link público (`/p/{orgSlug}/give`)

- acesso sem login
- doação por PIX ou cartão
- campo opcional de identificação (nome e email) para carta fiscal
- confirmação por email ou WhatsApp

## 7. Carta fiscal (recibo de doação)

Para igrejas com CNPJ e capacidade de emitir declaração de doação:

- o sistema gera PDF de carta fiscal por doação ou por período (mensal, anual)
- membro pode baixar pelo app ou receber por email
- template configurável no painel admin
- campos: nome do doador, CPF (opcional), valor, data, CNPJ da organização, assinatura digital do responsável financeiro

## 8. Campanhas de oferta

Localização: Finanças > Campanhas (admin) | App > Contribuir > Campanhas (membro)

### Criação de campanha (admin)

- nome da campanha
- descrição e imagem
- fundo de destino
- meta financeira (opcional)
- prazo (opcional)
- visibilidade: pública (aparece no app e portal) ou interna

### Progresso da campanha

- barra de progresso com valor arrecadado vs meta
- número de contribuintes (sem expor identidades)
- exibido no app do membro e no portal público (se configurado)

## 9. Dados gerados e onde aparecem

| Ação | Gera | Aparece em |
|---|---|---|
| Doação processada | `donations`, `finance.entries` | Finanças, Perfil da Pessoa, App do Membro |
| Recorrência ativa | `recurring_giving` | Finanças, App do Membro (status da recorrência) |
| Campanha criada | `giving_campaigns` | Finanças, App, Portal Público |
| Carta fiscal gerada | `fiscal_receipts` | App do Membro, email |

## 10. Estrutura de dados sugerida

### donations

- `id`
- `organization_id`
- `person_id` (nullable para doações anônimas)
- `fund_id`
- `campaign_id` (nullable)
- `amount`
- `currency`
- `payment_method`: `pix | credit_card | manual`
- `payment_status`: `pending | confirmed | failed | refunded`
- `gateway_transaction_id`
- `is_recurring`
- `recurring_giving_id` (nullable)
- `is_anonymous`
- `fiscal_receipt_requested`
- `created_at`

### recurring_giving

- `id`
- `organization_id`
- `person_id`
- `fund_id`
- `campaign_id` (nullable)
- `amount`
- `frequency`: `monthly | weekly | biweekly`
- `day_of_month`
- `payment_method`
- `status`: `active | paused | cancelled`
- `next_charge_at`
- `started_at`
- `cancelled_at` (nullable)

### giving_campaigns

- `id`
- `organization_id`
- `name`
- `description`
- `image_url`
- `fund_id`
- `goal_amount` (nullable)
- `deadline_at` (nullable)
- `is_public`
- `status`: `active | paused | completed`
- `created_by_user_id`

## 11. Integração com gateway

### Gateway inicial recomendado

- **Pagar.me** ou **Stripe Brasil** para cartão de crédito
- **APIs PIX do Banco Central / intermediador** para PIX dinâmico

### Cloudflare Worker como mediador

Toda comunicação com o gateway passa pelo `apps/worker-api`:

- nunca expõe chaves de API no frontend
- valida origem da requisição
- registra tentativas e erros
- faz retry automático em falhas transitórias

## 12. Plano de ativação

Este módulo pertence à Camada 1 — Operacional completo.

- campo no feature gate: `modules.giving`
- aparece no menu lateral como "Doações" apenas quando ativo
- no painel admin: aba dentro de Finanças inicialmente, depois item próprio quando o módulo estiver maduro
- no app do membro: aba "Contribuir" visível apenas para igrejas com o módulo ativo

## 13. Prioridade de implementação

Alta. É a segunda pergunta antes de qualquer contrato.

### Sequência técnica recomendada

1. criar estrutura de dados `donations` e `recurring_giving` no Firestore
2. integrar gateway para PIX dinâmico (geração de QR Code)
3. criar tela de doação no app mobile
4. criar link público `/p/{orgSlug}/give`
5. conectar doações ao módulo de Finanças (lançamento automático)
6. implementar recorrência mensal com cartão
7. criar módulo de campanhas (admin e app)
8. criar geração de carta fiscal em PDF
