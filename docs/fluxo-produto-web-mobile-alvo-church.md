# Fluxo produto web + mobile - Alvo Church

Atualizado em: 19 de junho de 2026

## Norte do produto

O Alvo Church deve funcionar como um unico sistema pastoral e operacional:

- O web e a mesa de trabalho da igreja: secretaria, recepcao, pastores, financeiro, lideres e administracao.
- O app mobile e a area do membro: identidade, jornada, eventos, escola, servico, filhos, comunicacao e beneficios.
- O Firebase deve ser a fonte comum para que uma acao em uma tela alimente as demais.

## Ciclo central da pessoa

1. Recepcao captura um visitante em `/reception`.
2. O sistema cria ou atualiza `people`, cria `visitorIntakes`, abre `visitorJourneys` e gera `followUpTasks`.
3. Dashboard `/` mostra a proxima melhor acao e os gargalos.
4. Jornadas `/journeys` organiza a triagem: contato, celula, membresia e tarefas.
5. Novo membro `/members/new` completa cadastro, familia, LGPD e Getro Pass.
6. Pessoas `/members` e Perfil `/members/[personId]` viram a ficha viva.
7. Celulas `/groups`, Eventos `/events`, Escalas `/serving`, Escola `/learning/academy` e Louvor `/serving/worship` registram participacao.
8. O app mobile mostra para o membro o que e dele: perfil, filhos, eventos, cursos, missoes, badges, escala e beneficios.

## Como as paginas devem conversar

| Origem | Gera/atualiza | Deve aparecer em |
| --- | --- | --- |
| Dashboard | conclusao de tarefas, atalhos de acao | Jornadas, Pessoas, Recepcao, Financeiro |
| Recepcao | `visitorIntakes`, `people`, `visitorJourneys`, `followUpTasks` | Dashboard, Painel Pastor, Jornadas, Pessoas |
| Painel Pastor | leitura de visitantes do dia | Recepcao, Jornadas |
| IA Pastoral | recomendacoes e sinais de cuidado | Dashboard, Jornadas, Perfil da Pessoa |
| Pessoas/Novo Membro | `people`, `families`, LGPD, Getro Pass | Dashboard, Marketplace, Kids, App mobile |
| Jornadas | estagio, tarefa, celula sugerida | Dashboard, Pessoas, Celulas, App mobile |
| Celulas | `groups`, membros, reunioes, presencas | Dashboard, Jornadas, Perfil, App mobile |
| Financas | relatorios e transparencia | Dashboard, App mobile |
| Marketplace | parceiros, lojas, beneficios | Getro Pass no cadastro, App mobile |
| Escola EAD | cursos, aulas e progresso | Perfil, App mobile |
| Eventos | agenda, inscricoes e check-in | Dashboard, App mobile |
| Escalas | equipes, escalas e trocas | Dashboard, App mobile |
| Louvor & Cifras | musicas e setlists | Escalas, Eventos, App mobile de voluntario |
| Kids Security | responsaveis, criancas, check-in | Minha Area, App mobile dos pais |
| Organizacoes | tenant, marca, plano e modulos | Todas as telas |

## Contrato web x mobile

O app mobile deve ler os mesmos registros do web, mas com permissao filtrada:

- Membro comum ve apenas seus dados, filhos, eventos, cursos, missoes, badges, escalas e beneficios.
- Lider de celula ve seu grupo, presencas e pessoas sob cuidado.
- Voluntario ve sua escala, ministerio, setlists quando aplicavel e pedidos de troca.
- Pastor/admin ve sinais agregados no web, nao dados sensiveis desnecessarios no app.

## Ordem recomendada de funcionalizacao

1. Dashboard: transformar em hub real de leitura e acoes.
2. Recepcao + Painel Pastor: garantir que visitante criado aparece em todos os lugares certos.
3. Pessoas + Novo Membro + Perfil: uma ficha unica, sem duplicidade.
4. Jornadas: tarefas, celula sugerida, status e proximo passo.
5. Celulas: grupos, membros, encontros e presenca.
6. Eventos: agenda, inscricao e check-in.
7. App mobile: Minha Area, jornada do membro, eventos, cursos, escalas e kids.
8. Financeiro, Marketplace, Escola, Louvor, Kids e Organizacoes.

## Implementacao iniciada

- Dashboard ja busca pessoas, familias, grupos, eventos, jornadas, tarefas, recepcao e relatorios financeiros quando o Firebase esta configurado.
- A busca global da Dashboard deve abrir a ficha real da pessoa e direcionar eventos/grupos para suas paginas dedicadas.
- A proxima melhor acao da Dashboard usa a fila real/mock de tarefas abertas em vez de texto fixo.
- A Dashboard agora expõe um contrato Web + Mobile com as fontes que alimentam Inicio, Agenda, Jornada e Perfil do app.
- O app mobile ja entende tenant, marca, plano e modulos.
- O app mobile agora tambem tenta carregar eventos, celulas e tarefas de follow-up do mesmo Firebase usado pelo painel web.
- Ainda falta ligar no app mobile: perfil real da pessoa logada, filhos, cursos, escalas, beneficios, missoes, badges e permissoes por papel.

## Criterio de pronto por pagina

Uma pagina so esta pronta quando:

- Usa dados reais quando Firebase estiver configurado.
- Tem fallback local ou mock claramente identificado quando offline.
- Abre a tela certa a partir da Dashboard e do menu.
- Grava uma acao que aparece em pelo menos uma outra tela.
- Nao expõe dado sensivel fora do papel correto.
- Mantem o padrao visual claro e operacional do Getro.
