# Backlog MVP de implementacao - Alvo Church

Atualizado em: 17 de junho de 2026

> Histórico. Os status abaixo foram substituídos pelo
> [backlog ativo atualizado em 05/09/2026](backlog-mvp-implementacao-v2.md).
> Não usar esta versão para decidir o próximo trabalho.

## Objetivo

Transformar o roadmap conceitual em uma lista pratica de trabalho para as proximas rodadas de desenvolvimento.

## Principios

- Comecar pelo que reduz retrabalho operacional da igreja.
- Manter pessoas como base central do sistema.
- Evitar telas bonitas sem persistencia quando o modulo ja precisa operar.
- Preservar UX consistente entre dashboard, recepcao, IA pastoral, financas e novos modulos.
- Separar prototipo local, dado mockado e integracao real.

## Legenda

- `Pronto visual`: tela ja revisada em UX, mas pode ter dados mockados.
- `Parcial`: existe rota ou prototipo, mas precisa consolidacao.
- `Fazer`: ainda precisa implementacao relevante.

## Epico 1 - Base de pessoas e jornadas

Status: `Parcial`

Entregas:

- persistir pessoa/membro/visitante em uma fonte unica
- deduplicar por telefone, email e nome aproximado
- criar timeline da pessoa
- ligar pessoa a familia, grupo, evento, tribo e atendimento pastoral
- criar estados de jornada: visitante, novo membro, membro ativo, lider, cuidado especial

Prioridade: alta.

## Epico 2 - Recepcao e Painel Pastor

Status: `Pronto visual`

Entregas:

- salvar visitante real
- listar visitantes do dia
- enviar visitante para painel pastor
- marcar como cumprimentado
- gerar tarefa de follow-up
- registrar observacao pastoral sem expor dado sensivel no painel publico

Prioridade: alta.

## Epico 3 - Financas e PIX

Status: `Pronto visual`

Entregas:

- persistir lancamentos
- separar entrada, saida, categoria, campanha e centro de custo
- criar trilha de auditoria
- exportar relatorio
- preparar integracao PIX/gateway
- definir permissoes financeiras

Prioridade: alta.

## Epico 4 - Kids Security

Status: `Pronto visual`

Entregas:

- cadastrar crianca e responsaveis
- check-in por culto/evento
- token de retirada
- alertas de seguranca
- historico de presenca
- impressao ou exibicao de etiqueta

Prioridade: alta.

## Epico 5 - IA Pastoral

Status: `Pronto visual`

Entregas:

- definir sinais reais de risco/cuidado
- registrar sugestoes da IA
- permitir aprovacao humana antes de mensagem sensivel
- controlar custo por tenant
- auditar prompts e respostas essenciais sem expor dados indevidos

Prioridade: media-alta.

## Epico 6 - Louvor, cifras e escalas

Status: `Pronto visual` em Louvor & Cifras, `Parcial` em Escalas

Entregas:

- biblioteca de musicas
- cifra por musica
- transposicao persistida por setlist
- setlist por evento/culto
- voluntarios escalados por funcao
- observacoes de arranjo e links externos

Prioridade: media.

## Epico 7 - Marketplace comunitario

Status: `Pronto visual`

Entregas:

- cadastro real de loja
- moderacao e aprovacao
- categorias
- destaque e reputacao
- contato seguro
- politicas de uso e responsabilidade

Prioridade: media.

## Epico 8 - SaaS, organizacoes e white-label

Status: `Parcial`

Entregas:

- criar tenant real
- validar slug unico
- ativar modulos por plano
- limites de assentos, campus e IA
- branding por organizacao
- dominio/subdominio
- log de provisionamento

Prioridade: media.

## Epico 9 - Limpeza tecnica e rotas antigas

Status: `Fazer`

Entregas:

- decidir destino de `/marketplace`
- proteger ou remover `/test`
- documentar ou remover `/wifi`
- manter menu lateral alinhado com rotas reais
- evitar funcoes escondidas

Prioridade: media.

## Proxima sequencia recomendada

1. Fechar persistencia de pessoas.
2. Conectar recepcao e painel pastor a dados reais.
3. Conectar novo membro e perfil da pessoa.
4. Conectar financas com lancamentos persistidos.
5. Conectar Kids Security com pessoas/familias.
6. Revisar marketplace, louvor e escalas com dados reais.
