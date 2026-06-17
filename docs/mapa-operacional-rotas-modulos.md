# Mapa operacional de rotas e modulos - Alvo Church

Atualizado em: 17 de junho de 2026

## Objetivo

Manter um mapa simples das telas reais do app web, o papel de cada modulo e o nivel atual de maturidade. Este documento deve ser usado antes de criar novas telas para evitar funcoes escondidas, rotas duplicadas e confusao entre modulos.

## URLs de referencia

- Local: `http://127.0.0.1:3000`
- Deploy canonico: `https://alvo-church-web.alexandrecostagg.workers.dev`
- Legado/teste: `https://alvo-church-web.pages.dev`

O deploy canonico hoje e o Worker `alvo-church-web`. O dominio `pages.dev` antigo pode continuar existindo, mas nao deve ser usado como referencia de validacao.

## Rotas principais

| Modulo | Rota | Funcao principal | Status atual |
| --- | --- | --- | --- |
| Dashboard | `/` | Visao geral da operacao | Em evolucao |
| Recepcao | `/reception` | Cadastro rapido de visitantes e fluxo de boas-vindas | UX revisada |
| Painel Pastor | `/reception?pastor=1` | Lista ao vivo para saudacao no culto | UX revisada |
| IA Pastoral | `/pastoral-ai` | Sinais, assistente e cuidado pastoral assistido | UX revisada |
| Financas | `/finance` | Transparencia, PIX, lancamentos e simulacao de gateway | UX revisada, logica parcial |
| Pessoas | `/members` | Base de pessoas e membros | Em evolucao |
| Novo membro | `/members/new` | Cadastro e jornada inicial do membro | UX revisada |
| Perfil da pessoa | `/members/[personId]` | Detalhe individual, historico e proximos passos | Em evolucao |
| Minha area | `/me` | Area do membro logado | Em evolucao |
| Familia/Kids | `/me/kids` | Responsaveis e criancas vinculadas ao membro | Em evolucao |
| Marketplace comunitario | `/marketplace-community` | Rede de lojas, servicos e beneficios da comunidade | UX revisada |
| Criar loja | `/marketplace-community/new` | Cadastro de loja ou prestador | Em evolucao |
| Minhas lojas | `/marketplace-community/my-stores` | Gestao das lojas do usuario | Em evolucao |
| Moderacao marketplace | `/marketplace-community/admin/moderation` | Revisao administrativa de anuncios | Em evolucao |
| Loja | `/marketplace-community/[storeId]` | Vitrine da loja | Em evolucao |
| Editar loja | `/marketplace-community/[storeId]/edit` | Edicao da vitrine | Em evolucao |
| Marketplace antigo | `/marketplace` | Rota antiga ou ponte para marketplace | Revisar/remover depois |
| Tribos | `/tribes` | Identidade ministerial e vocacao | Parcial |
| Teste de tribos | `/tribes/test` | Questionario de classificacao | Parcial |
| Celulas/grupos | `/groups` | Pequenos grupos e acompanhamento | Parcial |
| Jornadas | `/journeys` | Trilhas e progresso pastoral | Parcial |
| Escola EAD | `/learning/academy` | Conteudo e formacao | Parcial |
| Eventos | `/events` | Agenda, inscricoes e check-in | Parcial |
| Escalas | `/serving` | Servico e voluntariado | Parcial |
| Louvor & Cifras | `/serving/worship` | Repertorio, cifras, setlists e transposicao | UX revisada |
| Kids Security | `/kids/scan` | Check-in infantil e validacao por token | UX revisada |
| Bem-estar | `/wellness` | Sinais de cuidado e saude da jornada | Parcial |
| Nova organizacao | `/saas/organizations/new` | Provisionamento SaaS multi-tenant | UX e logica revisadas |
| Wi-Fi | `/wifi` | Rota publica ou utilitaria de acesso | Parcial |
| Teste | `/test` | Diagnostico tecnico | Deve sair do menu/producao |

## Regras de navegacao

- Funcoes de operacao diaria ficam no menu lateral.
- Funcoes que existem mas estavam escondidas devem ter entrada clara no menu, como `Painel Pastor` e `Louvor & Cifras`.
- Rotas antigas ou de teste devem ficar fora da navegacao principal ate serem removidas ou convertidas.
- A tela ativa precisa aparecer no menu mesmo quando a rota usa query string, como `/reception?pastor=1`.
- O menu lateral deve rolar internamente sem esconder os itens inferiores.

## Rotas que precisam decisao

| Rota | Problema | Acao recomendada |
| --- | --- | --- |
| `/marketplace` | Pode duplicar o marketplace comunitario | Converter para redirect ou remover quando nao houver dependencia |
| `/test` | Diagnostico tecnico visivel em producao se acessado diretamente | Manter apenas em dev ou proteger |
| `/wifi` | Proposito ainda pouco documentado | Definir se e modulo real, pagina publica ou utilitario |

## Como usar este mapa

Antes de implementar uma nova tela:

1. Conferir se ja existe rota equivalente.
2. Conferir se o modulo aparece no menu lateral.
3. Conferir se ha documento operacional do modulo.
4. Registrar a nova rota aqui se ela entrar no produto.
