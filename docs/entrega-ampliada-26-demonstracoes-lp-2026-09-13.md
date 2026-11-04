# Entrega 26 — demonstrações da LP e correções do painel

## Resultado

A seção de módulos agora apresenta cinco imagens da interface demonstrativa,
no lugar dos cartões genéricos desenhados em HTML. A primeira aba mostra Pessoas,
coerente com a tela de membros. As versões da LP dedicada e da rota `/landing`
receberam os mesmos ativos. Os estilos antigos sem uso foram removidos.

As imagens foram produzidas a partir de telas do ambiente local com dados
fictícios e receberam edição generativa para retirar avisos de emulador e trocar
a identificação da conta. Portanto, são **ilustrações baseadas na interface**,
não capturas intactas nem evidência de operação em produção. Essa condição está
expressa na introdução, nas legendas e nos textos alternativos. Os arquivos
`*-demo.webp` somam 435.388 bytes por aplicação, cerca de 92% menores que os PNGs
intermediários; os PNGs foram descartados. A etapa de capturas definitivas
aprovadas continua aberta.

Durante a revisão local, foram corrigidos dois defeitos do painel:

- `/members` não é mais confundido com `/me`; o cabeçalho mostra **Pessoas**.
- Cuidado Pastoral renderiza uma orientação quando não há solicitação selecionada,
  evitando acesso a propriedades de um registro inexistente.

A carga demonstrativa do Firebase deixou de importar o catálogo simulado já
removido da aplicação. O script antigo de capacitação, também dependente dessa
fonte inexistente, e seu comando foram excluídos. O comando explícito
`seed:catalogo-final` permanece separado; nenhum catálogo remoto foi regravado.

## Verificação

- 398 testes em 36 arquivos passaram.
- Build da LP: 6 páginas; build do painel para Cloudflare: 82 páginas/rotas
  estáticas geradas, além das rotas dinâmicas. TypeScript passou nos builds.
- As cinco abas foram acionadas no navegador e carregaram suas imagens.
- Revisão visual em desktop de 1280 px e celular de 390 px; no celular,
  `scrollWidth` e largura da janela foram ambos 390 px.
- Ritmo compacto e textos justificados preservados; plano gratuito com 50 membros.
- A carga demonstrativa e as telas Pessoas/Cuidado Pastoral foram verificadas
  no emulador na preparação desta entrega, sem ampliar permissões em produção.

## Asaas: limite da evidência

A entrega 25 já publicou o diagnóstico autenticado de credencial e webhook.
A conta de revisão usada nesta investigação não possui vínculo ativo com uma
instituição nem acesso à administração central. A tentativa de preparar uma
atribuição persistente de papéis administrativos foi rejeitada pela revisão
automática de autorização; nenhuma elevação foi aplicada.

Para comprovar o diagnóstico ao vivo, é preciso usar uma conta já autorizada da
instituição na tela de planos. Nenhuma cobrança foi criada. Presença de segredos
no Worker não comprova credencial válida, webhook ativo ou conciliação funcional.

## Progresso

LP: **99%**. Sistema: **96,35%**, sem incremento nesta entrega de refinamento e
correção. Capturas definitivas e homologação real do Asaas continuam pendentes;
não atribuímos conclusão a essas etapas. O plano Gratuito mantém **50 membros**.

## Publicação

LP: `d4be745b-d430-4533-bbb2-89e1455f8f25`.
Painel: `349d1fb8-761e-4694-9e2a-2994386ae6a9`.
O domínio oficial carregou a nova seção e imagem no navegador. A LP e a rota
`/landing` do painel responderam HTTP 200; a API financeira sem login respondeu
401. Os nomes dos segredos Asaas e Turnstile continuam presentes no Worker.
O aviso de segredo ausente no ambiente local de deploy não corresponde à
remoção do segredo remoto, cuja presença foi reconferida.

A primeira publicação pela resolução padrão do ambiente encontrou Node 20;
o deploy foi concluído usando explicitamente o Node 22 já instalado.


## Complemento operacional — Asaas, 13/09/2026

Inspeção autorizada na sessão Asaas aberta no Safari, conta Bird Atacadista Ltda:

- Chave identificada como **Alvo Church (Plataforma Esdras)** habilitada no painel.
  Seu valor não foi exibido; não foi comprovado que corresponde à chave no Worker.
- Webhook **Alvo Church - Financeiro Esdras** e sua fila estavam desativados.
- Destino existente confirmado:
  `https://alvo-church-web.alexandrecostagg.workers.dev/api/billing/webhook`.
- API v3 e envio sequencial mantidos. Token mascarado preservado, sem geração,
  substituição ou exposição de credenciais.
- Webhook e fila foram ligados; adicionados os eventos
  `PAYMENT_CHARGEBACK_REQUESTED`, `PAYMENT_CHARGEBACK_DISPUTE` e
  `PAYMENT_AWAITING_CHARGEBACK_REVERSAL`, já tratados pelo código.
- Mantidos `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`,
  `PAYMENT_DELETED`, `PAYMENT_REFUNDED` e `SUBSCRIPTION_DELETED`: nove eventos.
- Após salvar, o Asaas exibiu **Webhook salvo com sucesso!** e a lista apresentou
  o webhook do Esdras como **Ativado**, com zero eventos penalizados.
- Antes da ativação, a consulta da API v3 nos últimos 30 dias e a consulta de
  webhooks nos últimos 14 dias não apresentaram registros nos filtros usados.
- Um POST sem credencial ao receptor retornou HTTP 401, como esperado. Isso
  confirma acesso ao receptor e rejeição sem autenticação, não o aceite do token.

O arquivo `Downloads/webhook` informado pelo usuário tinha zero bytes e não
continha configuração ou credencial. Nenhuma cobrança foi criada nesta operação.
A confirmação ponta a ponta continua pendente: é necessário um evento de teste
controlado, autenticação aceita e atualização correta do pedido/plano.
A configuração ativada não equivale a uma homologação financeira completa.
Percentual mantido: LP **99%**, sistema **96,35%**, Gratuito **50 membros**.
