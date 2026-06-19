# Mapa operacional de rotas e módulos - Alvo Church

Atualizado em: 19 de junho de 2026

## Objetivo

Manter um mapa simples das telas reais do app web, o papel de cada módulo e o nível atual de maturidade. Este documento deve ser usado antes de criar novas telas para evitar funções escondidas, rotas duplicadas e confusão entre módulos.

## URLs de referência

- Local: `http://127.0.0.1:3000`
- Deploy canônico: `https://alvo-church-web.alexandrecostagg.workers.dev`
- Legado/teste: `https://alvo-church-web.pages.dev`

O deploy canônico hoje é o Worker `alvo-church-web`. O domínio `pages.dev` antigo pode continuar existindo, mas não deve ser usado como referência de validação.

## Regras de visibilidade

O menu lateral exibe apenas módulos ativos no plano da organização. O controle é feito pelo feature gate em `organizations/{organizationId}/settings/features`. Consultar `arquitetura-feature-gate-menu.md` para implementação.

---

## Rotas do painel admin (web)

### Núcleo — sempre visível (`modules.core`)

| Módulo | Rota | Função principal | Status atual |
|---|---|---|---|
| Dashboard | `/` | Visão geral da operação | Em evolução |
| Pessoas | `/members` | Base de pessoas e membros | Em evolução |
| Novo membro | `/members/new` | Cadastro e jornada inicial do membro | UX revisada |
| Perfil da pessoa | `/members/[personId]` | Detalhe individual, histórico e próximos passos | Em evolução |
| Minha área | `/me` | Área do membro logado | Em evolução |
| Família/Kids | `/me/kids` | Responsáveis e crianças vinculadas ao membro | Em evolução |
| Tribos | `/tribes` | Identidade ministerial e vocação | Parcial |
| Teste de tribos | `/tribes/test` | Questionário de classificação | Parcial |
| Jornadas | `/journeys` | Trilhas e progresso pastoral | Parcial |
| Louvor & Cifras | `/serving/worship` | Repertório, cifras, setlists e transposição | UX revisada |
| Escalas | `/serving` | Serviço e voluntariado | Parcial |
| Kids Security | `/kids/scan` | Check-in infantil e validação por token | UX revisada |
| Marketplace | `/marketplace-community` | Rede de lojas, serviços e benefícios | UX revisada |

### Visitantes (`modules.visitors`)

| Módulo | Rota | Função principal | Status atual |
|---|---|---|---|
| Recepção | `/reception` | Cadastro rápido de visitantes e fluxo de boas-vindas | UX revisada |
| Painel Pastor | `/reception?pastor=1` | Lista ao vivo para saudação no culto | UX revisada |

### Células e grupos (`modules.groups`)

| Módulo | Rota | Função principal | Status atual |
|---|---|---|---|
| Células/grupos | `/groups` | Pequenos grupos e acompanhamento | Parcial |

### Eventos (`modules.events`)

| Módulo | Rota | Função principal | Status atual |
|---|---|---|---|
| Eventos | `/events` | Agenda, inscrições e check-in | Parcial |

### Finanças (`modules.finance`)

| Módulo | Rota | Função principal | Status atual |
|---|---|---|---|
| Finanças | `/finance` | Transparência, PIX, lançamentos e simulação de gateway | UX revisada, lógica parcial |

### IA Pastoral (`modules.ai`)

| Módulo | Rota | Função principal | Status atual |
|---|---|---|---|
| IA Pastoral | `/pastoral-ai` | Sinais, assistente e cuidado pastoral assistido | UX revisada |

### Bem-estar (`modules.core`)

| Módulo | Rota | Função principal | Status atual |
|---|---|---|---|
| Bem-estar | `/wellness` | Sinais de cuidado e saúde da jornada | Parcial |

### SaaS e organizações (`modules.core`)

| Módulo | Rota | Função principal | Status atual |
|---|---|---|---|
| Nova organização | `/saas/organizations/new` | Provisionamento SaaS multi-tenant | UX e lógica revisadas |

---

## Rotas novas — Camada 1 (`Novo`)

### Formulários públicos (`modules.publicForms`)

| Módulo | Rota | Função principal | Status atual |
|---|---|---|---|
| Formulário visitante | `/p/[orgSlug]/visit` | Cadastro público sem login via QR Code | Novo |
| Portal público | `/p/[orgSlug]` | Landing page da organização | Novo |
| Evento público | `/p/[orgSlug]/events/[eventSlug]` | Inscrição pública em evento | Novo |
| Check-in adulto | `/p/[orgSlug]/checkin/[eventSlug]` | Check-in self-service por QR Code | Novo |
| Link de doação | `/p/[orgSlug]/give` | Doação pública sem login | Novo |
| Config links públicos | `/settings/public-links` | Gerenciar QR Codes e links no painel admin | Novo |

### Giving (`modules.giving`)

| Módulo | Rota | Função principal | Status atual |
|---|---|---|---|
| Doações | `/giving` | Gestão de doações e recorrências | Novo |
| Nova doação | `/giving/new` | Registrar doação manual ou iniciar recorrência | Novo |
| Campanhas | `/giving/campaigns` | Campanhas de oferta com meta e progresso | Novo |

### Comunicação (`modules.communication`)

| Módulo | Rota | Função principal | Status atual |
|---|---|---|---|
| Comunicação | `/communication` | Histórico de mensagens e campanhas | Novo |
| Nova mensagem | `/communication/new` | Criar e enviar mensagem segmentada | Novo |
| Templates | `/communication/templates` | Templates salvos por canal | Novo |

---

## Rotas novas — Camada 2 (roadmap futuro)

### Cuidado Pastoral (`modules.pastoralCare`)

| Módulo | Rota | Função principal | Status atual |
|---|---|---|---|
| Cuidado | `/members/[personId]?tab=care` | Aba de cuidado pastoral no perfil | Novo |

### Automações (`modules.workflows`)

| Módulo | Rota | Função principal | Status atual |
|---|---|---|---|
| Automações | `/workflows` | Lista e criação de regras if-then | Novo |
| Nova automação | `/workflows/new` | Builder visual de regra | Novo |

### Analytics (`modules.analytics`)

| Módulo | Rota | Função principal | Status atual |
|---|---|---|---|
| Analytics | `/analytics` | Relatórios históricos e exportação | Novo |

### Missões (`modules.missions`)

| Módulo | Rota | Função principal | Status atual |
|---|---|---|---|
| Missões | `/finance/missions` | Projetos e missionários apoiados | Novo |

---

## Rotas que precisam decisão

| Rota | Problema | Ação recomendada |
|---|---|---|
| `/marketplace` | Duplica o marketplace comunitário | Converter para redirect ou remover |
| `/test` | Diagnóstico técnico visível em produção | Manter apenas em dev ou proteger |
| `/wifi` | Propósito não documentado | Definir se é módulo real, página pública ou utilitário |

---

## Regras de navegação

- Funções de operação diária ficam no menu lateral, filtradas pelo feature gate.
- Módulos novos entram como sub-item ou aba antes de ganhar entrada própria no menu.
- Páginas públicas (`/p/...`) ficam fora do menu — acessadas via Configurações.
- Rotas antigas ou de teste devem ficar fora da navegação principal.
- A tela ativa precisa aparecer no menu mesmo quando a rota usa query string, como `/reception?pastor=1`.
- O menu lateral deve rolar internamente sem esconder os itens inferiores.

## Como usar este mapa

Antes de implementar uma nova tela:

1. Conferir se já existe rota equivalente neste documento.
2. Conferir se o módulo está documentado em arquivo próprio.
3. Conferir se o feature gate do módulo está definido em `arquitetura-feature-gate-menu.md`.
4. Registrar a nova rota aqui antes de implementar.
5. Definir em qual camada (0, 1, 2 ou 3) o módulo se encaixa.
