# Módulo de formulários públicos e QR Code - Alvo Church

Data: 19 de junho de 2026

## 1. Objetivo

Definir o módulo de formulários públicos do Alvo Church: páginas acessíveis sem login, vinculadas à organização via slug, que permitem ao visitante se cadastrar no próprio celular na entrada do culto — sem depender de nenhuma ação da secretaria no momento do preenchimento.

## 2. Problema que resolve

Hoje o fluxo de recepção exige que a secretaria cadastre o visitante. Isso cria dois problemas:

- gargalo operacional: uma pessoa para cada visitante
- perda de dados: em cultos cheios, alguns visitantes saem sem ser cadastrados

Com formulários públicos e QR Code, o visitante preenche seus dados no celular ao entrar, e o sistema cria automaticamente o registro em `visitorIntakes`, `people` e `visitorJourneys`.

## 3. Rotas públicas

Todas as rotas públicas seguem o padrão `/p/{orgSlug}/...` e funcionam sem autenticação:

| Rota | Função |
|---|---|
| `/p/{orgSlug}/visit` | Formulário de cadastro de visitante |
| `/p/{orgSlug}/events/{eventSlug}` | Página pública de evento com inscrição |
| `/p/{orgSlug}/give` | Link de doação |
| `/p/{orgSlug}` | Portal público da igreja |
| `/p/{orgSlug}/checkin/{eventSlug}` | Check-in de adultos por QR Code |

Essas rotas ficam fora do menu lateral. A secretaria acessa os links em Configurações > Links Públicos.

## 4. Formulário de visitante (`/p/{orgSlug}/visit`)

### Campos obrigatórios

- nome completo
- telefone (com validação de formato brasileiro)
- como soube da igreja (opções configuráveis)

### Campos opcionais

- email
- data de nascimento
- bairro ou cidade
- é a primeira vez? (sim/não)
- gostaria de receber mensagens? (consentimento LGPD)

### Comportamento após envio

1. sistema verifica duplicidade por telefone
2. se pessoa já existe: atualiza `visitorIntakes` e reabre jornada se necessário
3. se pessoa nova: cria `people`, `visitorIntakes`, `visitorJourneys` e `followUpTasks`
4. visitante vê tela de confirmação com mensagem de boas-vindas personalizada da organização
5. recepcão e painel pastor atualizam em tempo real via Firebase

### Personalização por organização

- logo e nome da organização
- cor primária do tenant
- mensagem de boas-vindas configurável
- campos opcionais ativáveis no painel admin

## 5. QR Code de acesso

O QR Code é gerado automaticamente para cada organização a partir do link `/p/{orgSlug}/visit`.

### Como funciona na prática

- secretaria imprime ou exibe o QR Code na entrada do culto (totem, banner, telão)
- visitante aponta a câmera do celular
- abre o formulário no navegador sem precisar instalar app
- preenche em 30 segundos
- confirma e pronto

### Geração do QR Code

O painel admin tem botão `Gerar QR Code` em Configurações > Links Públicos que:

- gera imagem PNG do QR Code (1000x1000px, com logo da organização ao centro)
- gera versão para impressão A4 com instruções para o visitante
- exibe o link curto associado

## 6. Página pública de evento (`/p/{orgSlug}/events/{eventSlug}`)

### Conteúdo exibido

- nome e banner do evento
- data, hora e local
- descrição
- vagas disponíveis (se configurado)
- botão de inscrição

### Comportamento de inscrição

- formulário simples: nome, telefone, email
- sistema verifica duplicidade por telefone
- cria `event_registrations` vinculado à pessoa
- envia confirmação por WhatsApp ou email (se módulo de comunicação ativo)
- na chegada, voluntário faz check-in pelo painel admin ou app mobile

## 7. Check-in de adultos por QR Code (`/p/{orgSlug}/checkin/{eventSlug}`)

Extensão do Kids Security para adultos. Funciona como autoatendimento:

- visitante/membro acessa o link ou QR Code na entrada do evento
- digita telefone ou nome
- sistema confirma presença em `event_checkins`
- exibe confirmação na tela do celular

Para membros com app instalado, o check-in pode ser feito diretamente pelo app com um toque.

## 8. Portal público da organização (`/p/{orgSlug}`)

Página simples gerada automaticamente para cada organização:

- logo e nome da igreja
- próximos eventos (público)
- link de formulário de visitante
- link de doação
- redes sociais (configurável)
- endereço e horários de culto

Não é um site completo — é uma landing page de entrada para quem chega pelo QR Code ou link compartilhado.

## 9. Dados gerados e onde aparecem

| Ação pública | Gera | Aparece em |
|---|---|---|
| Preenchimento do formulário de visitante | `people`, `visitorIntakes`, `visitorJourneys`, `followUpTasks` | Recepção, Painel Pastor, Dashboard, Jornadas, Pessoas |
| Inscrição em evento | `event_registrations` | Eventos, Pessoas, Dashboard |
| Check-in adulto | `event_checkins` | Eventos, Pessoas, Analytics |

## 10. Configuração no painel admin

Localização: Configurações > Links Públicos e QR Codes

Funcionalidades:

- ver e copiar link de formulário de visitante
- gerar e baixar QR Code (PNG e PDF imprimível)
- personalizar mensagem de boas-vindas
- ativar/desativar campos opcionais do formulário
- ver e copiar links de eventos públicos
- configurar horários e endereço para o portal público

## 11. Plano de ativação

Este módulo pertence à Camada 1 — Operacional completo.

- campo no feature gate: `modules.publicForms`
- disponível a partir do Plano Base expandido
- sem item próprio no menu lateral (acessado via Configurações)
- não gera poluição visual para igrejas que não ativaram

## 12. Prioridade de implementação

Alta. Este módulo resolve diretamente a pergunta mais comum antes de contratar: "como o visitante se cadastra?".

### Sequência técnica recomendada

1. criar rota pública `/p/[orgSlug]/visit` com formulário básico
2. conectar ao Firebase com criação de `people` e `visitorIntakes`
3. sincronizar com a recepção em tempo real
4. gerar QR Code no painel admin
5. criar página de confirmação personalizada
6. adicionar personalização visual por organização
7. criar portal público `/p/[orgSlug]`
8. criar check-in de adultos e página de evento público
