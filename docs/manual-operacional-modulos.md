# Manual operacional dos modulos atuais - Alvo Church

Atualizado em: 17 de junho de 2026

## Objetivo

Documentar como as telas ja trabalhadas devem funcionar, o que ja esta maduro e o que ainda falta conectar em dados reais. Este e o documento de trabalho para continuar a construcao sem perder contexto.

## Padrao de UX atual

As telas operacionais devem seguir o padrao visual que ja comecamos a consolidar:

- fundo claro, com contraste limpo
- cards brancos ou muito claros
- tipografia grande o suficiente para leitura em notebook e tablet
- botoes com funcao clara
- poucos gradientes e sem fundo escuro pesado
- menu lateral fixo com rolagem propria
- informacao principal acima da dobra
- estados vazios, erros e sucesso visiveis

## Recepcao

Rota: `/reception`

Funcao:

- registrar visitante rapidamente
- iniciar jornada pastoral
- preparar dados para saudacao publica e follow-up
- acionar fluxo de WhatsApp/contato

O que ja esta bom:

- hierarquia visual mais clara
- cards e formularios mais alinhados
- fluxo de porta ao cuidado mais explicito

Falta conectar:

- persistencia real dos visitantes
- envio real de WhatsApp
- lista real de visitantes do dia
- historico da jornada no perfil da pessoa

## Painel Pastor

Rota: `/reception?pastor=1`

Funcao:

- mostrar ao pastor ou equipe de palco os visitantes prontos para saudacao
- permitir marcar visitante como cumprimentado
- evitar a tela preta antiga e manter legibilidade de culto

O que ja esta bom:

- entrada propria no menu
- UX clara e legivel
- contador da lista
- acao de cumprimentado atualizando a lista local

Falta conectar:

- alimentacao com dados reais da recepcao
- sincronizacao em tempo real
- permissao por perfil
- modo tela cheia opcional

## IA Pastoral

Rota: `/pastoral-ai`

Funcao:

- concentrar sinais pastorais
- sugerir proximas acoes de cuidado
- apoiar mensagens, triagens e prioridades

O que ja esta bom:

- tela mais alinhada ao dashboard e recepcao
- linguagem de produto mais clara
- acoes rapidas para operacao

Falta conectar:

- fontes reais de dados: presenca, eventos, grupos, financas e jornada
- regras de prioridade
- auditoria do que a IA sugeriu
- limite de custo por organizacao

## Financas

Rota: `/finance`

Funcao:

- dar visao transparente de entradas, saidas e saldo
- simular ou operar PIX e doacoes
- apoiar relatorios financeiros

O que ja esta bom:

- UX revisada no padrao claro
- logica de lancamento manual corrigida para saldo
- simulacao de PIX atualizando indicadores locais

Falta conectar:

- gateway real de pagamento/PIX
- conciliacao bancaria
- permissao por perfil financeiro
- exportacao real de relatorios
- trilha de auditoria

## Pessoas e Novo Membro

Rotas: `/members`, `/members/new`, `/members/[personId]`

Funcao:

- manter a base central de pessoas
- criar novos membros
- sustentar familias, jornadas, grupos e ministerios

O que ja esta bom:

- tela de novo membro mais alinhada ao padrao visual atual
- base pronta para virar centro do produto

Falta conectar:

- validacao completa de formulario
- deduplicacao por telefone/email
- timeline da pessoa
- relacao com familia, grupo, tribo, eventos e servico

## Marketplace comunitario

Rota principal: `/marketplace-community`

Funcao:

- criar uma rede de lojas, prestadores e beneficios da comunidade
- fortalecer economia interna e relacionamento
- permitir moderacao pela igreja/plataforma

O que ja esta bom:

- marketplace principal identificado
- acoes de minhas lojas, moderacao e criar loja
- cards e filtros com UX revisada

Falta conectar:

- persistencia real de lojas
- fluxo de aprovacao
- regras de destaque
- contato/compra fora ou dentro da plataforma
- criterios pastorais e comerciais de moderacao

## Kids Security

Rota: `/kids/scan`

Funcao:

- controlar check-in e retirada de criancas
- validar token de seguranca
- dar visao rapida para lideranca infantil

O que ja esta bom:

- UX clara e operacional
- cards de status
- fluxo de check-in e token validado em prototipo

Falta conectar:

- banco real de criancas e responsaveis
- impressao/geracao de etiqueta
- autorizacao por responsavel
- alertas criticos
- historico por culto/evento

## Louvor & Cifras

Rota: `/serving/worship`

Funcao:

- organizar repertorio
- visualizar cifra
- transpor tom
- apoiar setlists e voluntarios de louvor

O que ja esta bom:

- rota visivel no menu
- UX clara no padrao atual
- painel de cifra sem fundo escuro pesado
- transposicao funcionando no estado local

Falta conectar:

- biblioteca real de musicas
- setlists por culto/evento
- permissao por lider de louvor
- anexos, links e observacoes de arranjo
- sincronizacao com escalas

## Organizacoes SaaS

Rota: `/saas/organizations/new`

Funcao:

- criar nova igreja/unidade/tenant
- definir identidade, plano, modulos, marca e limites
- provisionar configuracao base

O que ja esta bom:

- campos alinhados com a logica de salvamento
- modulos, plano, branding e limites visiveis
- menu lateral corrigido para nao esconder itens

Falta conectar:

- criacao real de tenant
- validacao de slug unico
- provisionamento de dominio/subdominio
- billing/plano real
- log de auditoria do provisionamento

## Prioridade de conexao real

1. Pessoas como base central.
2. Recepcao criando pessoas/jornadas reais.
3. Painel Pastor lendo visitantes reais.
4. Financas com persistencia e auditoria.
5. Kids Security com criancas/responsaveis reais.
6. Louvor conectado a escalas e eventos.
7. Marketplace com moderacao real.
8. IA Pastoral usando sinais reais com limites de custo.
