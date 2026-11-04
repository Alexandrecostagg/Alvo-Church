# LP: demonstração, Quem Somos e Blog — 28/09/2026

## Pedido e referência

O usuário pediu funções semelhantes às da LP do [AppJetro](https://appjetro.com.br/),
principalmente agendamento de demonstração, Blog e Quem Somos. A referência foi
usada para a organização dos caminhos de navegação; texto, arte e identidade
do concorrente não foram reproduzidos. Mantida a identidade aprovada do Esdras.

O usuário confirmou o uso do WhatsApp comercial existente, final 0336, para
combinar e confirmar o horário. Não foi contratada nem integrada uma agenda
externa, e não existem horários fictícios ou reserva automática.

## Entrega local

- `/demonstracao`: formulário com nome, instituição, assunto e período de
  preferência; validação de obrigatórios e espaços vazios, revisão da mensagem
  e abertura voluntária do WhatsApp. A confirmação depende da equipe.
- `/quem-somos`: apresentação da proposta do Esdras, significado da marca e
  princípios. Sem biografia, clientes, depoimentos ou números inventados.
- `/blog`: índice com três artigos originais, páginas individuais, categoria,
  data, tempo de leitura estimado, links relacionados e chamada de demonstração.
- Home: demonstração no hero e após os módulos; apresentação institucional e
  prévia dos artigos. Cabeçalho e rodapé compartilhados pelas páginas públicas.
- Menu móvel com acesso às novas páginas, cadastro e login; fechamento por
  Escape e após escolha de link. Preservados tamanhos compactos e textos
  justificados solicitados pelo usuário.
- Metadados e sitemap para as novas rotas. O aviso de métricas aguarda a leitura
  da preferência existente antes de aparecer ao trocar de página.

O formulário não grava dados nem os inclui em métricas. A mensagem é preparada
localmente, compartilhada com o WhatsApp apenas quando o visitante abre o link
e enviada quando ele confirma no WhatsApp. Há alternativa por e-mail.

Conteúdo dos artigos em `apps/lp/app/lib/articles.ts`. Novos artigos podem ser
incluídos nessa coleção e entram no índice, nas rotas estáticas e no sitemap
durante o build. Não há CMS ou painel editorial nesta entrega.

## Verificação

- Build de produção, TypeScript e exportação estática aprovados.
- Oito páginas HTML verificadas: um H1, um canonical e todos os links e âncoras
  internos válidos. Sitemap inclui as páginas novas e os três artigos.
- Inspeção em navegador desktop 1440 px e móvel 390/320 px; formulário e menu
  cabem na largura disponível, sem rolagem horizontal.
- Formulário testado com dados fictícios: campos vazios, somente espaços,
  assunto/período, acentos e `&` na mensagem, foco na revisão e invalidação da
  mensagem anterior ao editar. Nenhuma mensagem externa enviada no teste.
- Artigo aberto, navegação de volta ao blog, menu móvel, Quem Somos e Escape
  verificados. Prévia em `http://localhost:3004`.

## Estado e limites

Entrega disponível localmente para revisão do usuário; sem deploy nesta sessão.
Os artigos são conteúdo inicial e podem ser revisados antes da publicação.
O horário da demonstração será negociado pelo WhatsApp, não reservado pela LP.

Plano gratuito permanece limitado a **50 membros**. Nenhuma alteração no app,
AAB ou Google Play; a mudança de identidade mobile segue adiada.

Percentuais mantidos: sistema **96,40%**, mobile **97%**, LP **100% do escopo
funcional anterior**. Esta expansão da LP não aumenta a matriz do produto nem
substitui as pendências de validação do app.
