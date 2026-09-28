# Sabedoria Pastoral — nomenclatura pública

## Decisão do usuário

Em 28/09/2026, o usuário definiu **Sabedoria Pastoral** como substituição do
termo “IA” nas interfaces da plataforma e da LP. A regra vale para textos
novos e existentes, incluindo títulos, botões, planos, cotas, FAQ, descrições
acessíveis e mensagens de erro exibidas ao usuário.

## Implementação

- LP independente e landing da aplicação web: apresentação do produto,
  planos, FAQ, módulos, metadados e textos de apoio; Quem Somos na LP.
- Plataforma: aba pastoral, classificação de tribos, comunicação, banners,
  administração de instituições, configurações, uso e cotas dos planos.
- APIs e cliente compartilhado: mensagens de erro próprias atualizadas.
- Mobile: textos de geração, roteiros e relatórios preparados no código.
  Publicação somente na próxima distribuição; nenhum AAB gerado nesta entrega.
- Captura pastoral refeita na aplicação real com instituição fictícia nos
  emuladores `demo-alvo-qa`. PNG sem edição de conteúdo nas duas LPs; removidas
  as duas imagens substituídas que ainda mostravam o termo anterior.

Rotas como `/api/ai`, campos de banco, permissões, nomes de pacotes, variáveis
de ambiente e comentários técnicos permanecem compatíveis. Não houve mudança
de fornecedores, comportamento de geração ou regras de acesso. A indicação
de rascunhos gerados, supervisão humana e responsabilidade pastoral continua.

Plano gratuito permanece com **50 membros**; cotas comerciais preservadas.

## Verificações

- Typecheck da aplicação web e do mobile aprovado.
- Build de produção e exportação estática da LP aprovados.
- Dez testes existentes de tarefas e limites de planos aprovados.
- Varredura sintática de 277 arquivos TypeScript/TSX: nenhuma ocorrência de
  “IA” ou “inteligência artificial” em strings ou textos JSX nos escopos verificados.
- Tela pastoral local: nova aba e mensagem de apoio renderizadas, sem o termo antigo.
- LP a 390 px: sem rolagem horizontal; aba Sabedoria Pastoral abre o painel
  correto e a nova imagem carrega com 1433 px de largura original.

Sem push, deploy ou publicação no Google Play nesta entrega.
Percentuais mantidos: sistema **96,40%**, mobile **97%**, LP **100% do escopo
funcional anterior**. Renomear recursos não representa avanço funcional.
