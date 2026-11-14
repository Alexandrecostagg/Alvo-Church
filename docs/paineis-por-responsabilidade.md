# Painéis por responsabilidade

O início (`/app`) combina função, instituição ativa, plano e vínculos verificados. A escolha de uma visão no navegador ou no app não concede permissões: `/api/home` consulta novamente a conta e os vínculos em cada operação.

| Visão | Quem recebe | Conteúdo e alcance |
| --- | --- | --- |
| Cuidado pastoral | `pastor` | Pessoas ativas, visitantes, células, aniversários e acompanhamento da instituição ativa. |
| Administração da igreja | `church_admin`, `super_admin`, `secretary` | Rotina administrativa da instituição ativa e atalhos dos módulos contratados e habilitados. |
| Liderança de células | `group_leader` | Células em que a pessoa vinculada é líder, colíder ou supervisor; encontros, participantes, presenças, aniversários e acompanhamento desse conjunto. |
| Minha participação | Toda conta ativa com função | Próprias células, escalas pendentes, perfil, convites e eventos publicados. Não contém diretórios ou registros de cuidado de terceiros. |
| Liderança da rede | `church_admin` ou `super_admin` de rede/denominação com plano Rede ou Enterprise | Indicadores consolidados das igrejas com vínculo bilateral ativo. Não concede acesso operacional às filiais. |

Uma pessoa pode acumular funções e alternar entre as visões disponíveis. O menu reúne as áreas autorizadas pelos cargos da conta; mudar a visão organiza o trabalho, sem remover outros cargos existentes. O cargo `super_admin` é da instituição; a administração global da plataforma continua separada.

## Como preparar os acessos

1. A administração cadastra o usuário e suas funções na instituição correta.
2. A conta deve ser vinculada ao cadastro de pessoa pelo fluxo existente de vínculo verificado. O identificador da pessoa no usuário, o vínculo e a reivindicação exclusiva precisam concordar.
3. Em Células, a administração cadastra os participantes e define quem é líder, colíder ou supervisor. Ter apenas o cargo de líder não libera todas as células.
4. Para uma rede, configurar a instituição como rede/denominação e confirmar os vínculos de cada filial. A sede recebe os consolidados compartilhados; a operação de uma filial exige vínculo de usuário próprio nela.

Liderança ministerial (`ministry_leader`) mantém a participação pessoal. Não recebe gestão de toda a igreja por esse cargo. Um painel específico por equipe exige um vínculo explícito de responsabilidade na equipe, que o cadastro atual de áreas de serviço ainda não possui.

## Encontros e cuidado

`/my-groups` oferece ao líder os encontros e participantes de suas células. É possível criar encontro e registrar presente, ausente, ausência justificada ou primeira visita. O aplicativo usa a mesma API e os mesmos registros de presença do painel web. A preparação com IA que já existia no app continua disponível quando habilitada.

Encontros usam o fuso da instituição. A criação aceita datas entre os últimos 30 dias e os próximos 12 meses. O registro de presença abre 3 horas antes e permanece disponível por 90 dias. Alterações concorrentes exigem atualizar os dados antes de sobrescrever uma presença. A lista rápida contém os últimos 50 encontros.

Ausência percebida é um registro humano para acompanhamento, e não uma inferência por falta de check-in. Pastor/equipe podem pesquisar nomes da instituição; líderes selecionam pessoas das células que lideram. O registro guarda data, observação opcional e autor. “Já realizei o contato” encerra o acompanhamento e registra o responsável. Essas ações não enviam mensagens. Pessoa removida da célula deixa de aparecer no cuidado do líder.

Os registros ficam em `perceivedAbsences`, com trilha em `dashboardAudit`, ambos acessíveis somente pelo backend. As regras de grupos bloqueiam leitura direta de participantes e presenças por contas comuns; os fluxos pessoais e de liderança usam APIs com escopo.

## Atenção, evolução e contato

Pastores, administração e líderes de células recebem as abas **Atenção agora** e **Evolução**, no web e no app nativo. A primeira destaca acompanhamentos abertos e encontros passados sem chamada. A segunda apresenta oito semanas de participações registradas, incluindo a semana atual, no fuso da instituição. A tabela web detalha presenças, ausências e justificativas. Participações não são pessoas únicas; ausência de chamada não é ausência de pessoas. A taxa considera somente os registros existentes, e uma chamada iniciada pode estar incompleta.

O histórico consulta até 30 células, 100 encontros por célula, 120 encontros no total e 500 registros por encontro. Ao atingir os limites, apresenta aviso de visão parcial. Líderes recebem somente agregados das células em que possuem vínculo de liderança confirmado.

Nos aniversários e acompanhamentos, **WhatsApp** prepara uma mensagem com nome da pessoa e da instituição, própria para o contexto. A prévia permite conferir o texto antes de abrir o aplicativo; o envio continua manual. Preferências de não receber contato são respeitadas. **Ver endereço no mapa** apresenta o endereço antes de abrir o Google Maps e exige rua e cidade cadastradas. A autorização é conferida novamente na preparação de cada atalho; o perfil de membro não recebe acesso aos contatos de terceiros. Nenhum atalho encerra automaticamente o acompanhamento.

## Limites das visões rápidas

- Os indicadores de pessoas, células e acompanhamentos da equipe usam contagens do banco; não confundem o tamanho de uma página com o total.
- A lista rápida de aniversários pesquisa até 500 pessoas ativas e exibe até 20 nomes. Em instituições maiores, o painel avisa que a consulta pode estar incompleta.
- A pesquisa rápida de nomes consulta até 1.000 cadastros e devolve até 30 resultados, sem telefone, documento ou notas pessoais. Quando parcial, o formulário orienta consultar Pessoas.
- O painel de rede reúne até 50 igrejas verificadas e informa as datas dos consolidados. A gestão da rede permanece disponível para a relação completa. Ausência de consolidado aparece como “—”.
- O app oferece nativamente painéis, cuidado e encontros da liderança. A gestão ampla já existente (pessoas, finanças, rede etc.) abre a interface web e usa sua sessão de autenticação habitual.

## Validação e publicação

Executar `pnpm test`, `pnpm -r typecheck`, `pnpm qa:home` e `pnpm qa:mobile`. Os comandos de QA exigem os emuladores locais `demo-alvo-qa`; não usam produção, pagamentos ou envio de mensagens.

Uma publicação futura precisa incluir o web/API, as regras atualizadas do Firestore e uma nova versão do aplicativo para distribuir a interface nativa. Publicar somente o web não atualiza o aplicativo já instalado. A validação em aparelho físico complementa a exportação Android e os testes da API.
