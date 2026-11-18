# Jornadas de integração

O painel `/journeys`, os indicadores de integração dos painéis de liderança e a seção **Minha integração** do app consultam `visitorJourneys`, `followUpTasks` e as associações de células da mesma instituição. `journeyProfiles` continua sendo um contrato separado de desenvolvimento ministerial, preservado na API para compatibilidade com versões antigas do app.

## Fluxo e responsabilidades

- A equipe pastoral/administrativa inicia e avança a integração, registra a decisão de membresia, vincula uma célula ativa e cria acompanhamentos com responsável e prazo.
- O primeiro contato só deixa de ser pendência quando uma tarefa de boas-vindas, primeiro contato ou contato pastoral está concluída. Preparar WhatsApp, criar uma tarefa ou saudar no altar não comprova contato realizado.
- Tarefas abertas e em andamento são pendentes. Concluídas e canceladas não são. A confirmação de membresia encerra as jornadas ativas da pessoa.
- Líderes de célula consultam somente pessoas das células onde possuem vínculo verificado de liderança. Podem iniciar/concluir tarefas atribuídas à própria conta; decisões de membresia, cancelamentos e mudanças de etapa permanecem com a equipe pastoral/administrativa.
- O membro consulta apenas sua etapa, célula e aviso de atualização. Notas pastorais e tarefas internas não são expostas nessa projeção.
- A tela aguarda confirmação do servidor, mostra erros e recarrega os dados após salvar. Revisões evitam sobrescrever alterações concorrentes; identificadores de solicitação impedem repetir a mesma operação.

## Indicadores e histórico

Os painéis oferecem situação atual e evolução das transições registradas nas últimas oito semanas, agrupadas em UTC. O histórico de `journeyHistory` começa com operações feitas pelo novo serviço; alterações antigas ou de outros fluxos não são reconstruídas. Registros legados continuam visíveis no estado atual.

Há paginação de 40 pessoas e limites de consulta: 2.000 pessoas, 4.000 jornadas, 5.000 tarefas, 200 células, 2.000 associações por célula, 2.000 usuários e 2.000 eventos de histórico. Ao atingir limites, a interface informa que os resultados são parciais. Não interpretar um gráfico parcial como total da instituição. Classes e outros grupos com tipo explícito diferente de `cell` não contam como células; grupos legados sem tipo mantêm a interpretação de célula.

O painel de tarefas mostra até dez itens e sinaliza listas resumidas ou registros sem pessoa válida. A atualização ocorre após ações, ao atualizar o painel e ao retornar ao app/tela; não é uma assinatura em tempo real do Firestore.

## Avisos e WhatsApp

Mudanças de etapa, membresia e célula criam aviso para uma conta de membro verificada; novas tarefas criam aviso ao responsável. O envio push revalida instituição, acesso e dispositivo antes de uma única tentativa pelo Expo. Os estados `pending`, `sending`, `accepted`, `failed`, `uncertain`, `no_device`, `unavailable` e `test_mode` ficam em `journeyNotices`. Aceite do provedor não comprova entrega no aparelho. Tentativas incertas não são repetidas automaticamente. O payload não inclui nomes ou observações pastorais.

O app atualiza o painel ao receber/abrir `journey_update` da instituição ativa. O aviso dentro de Minha integração deriva do registro salvo, independentemente da entrega do push.

WhatsApp permanece manual: abre a conversa com texto preparado para revisão e envio pela equipe. Não exige conexão Meta e não marca a tarefa como concluída automaticamente.

## Validação e publicação

Executar `corepack pnpm qa:journeys` com os emuladores locais de QA. O script só aceita o projeto `demo-alvo-qa`, bloqueia destinos externos, usa contas fictícias e remove suas próprias fixtures. Inclui persistência web/app, tarefas, escopo de liderança, isolamento de instituições, concorrência, idempotência, paginação e push simulado. A suíte está incluída em `scripts/qa-ci.mjs`.

A publicação deve entregar a API/web antes da versão mobile nova. Não há migração automática de dados reais nem envio retroativo de avisos. Um novo build mobile é necessário para apresentar Minha integração e tratar os novos avisos em aparelhos instalados. A entrega real de push precisa de homologação posterior em aparelho com permissão e token registrado.
