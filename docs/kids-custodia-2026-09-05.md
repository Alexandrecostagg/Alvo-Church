# Entrega 5 — responsáveis e retirada Kids

Implementação validada localmente em 05/09/2026. Sem publicação, push ou teste em
aparelho. Gratuito permanece com **50 membros**; check-in Kids não cria `Person`
nem altera o contador de membros.

## Entrada e vínculo

Web e app registram entrada por `POST /api/kids/custody`, com confirmação de
identidade pelo operador. O backend confere igreja/conta ativa e cargo Kids,
emite os códigos e grava entrada/auditoria na mesma transação. O operador fica
em `checkedInByUserId`; não é mais atribuído automaticamente como responsável.

O e-mail informado é uma escolha explícita da conta do responsável: a busca é
exata, normalizada para minúsculas, dentro da igreja e deve retornar uma única
conta ativa. Ausência ou duplicidade interrompe a operação. O nome não é usado
para inferir a conta. Sem e-mail, o responsável fica registrado nominalmente com
`parentId` vazio, sem conceder acesso ao app ao operador por esse motivo.

Responsável vinculado vê o crachá pelo acesso já protegido na entrega 4. Pessoas
adicionais são nomes previamente confirmados pela equipe (até cinco); isso não
concede acesso ao app automaticamente a contas de pessoas com nomes iguais.
A equipe entrega o crachá/código ao responsável sem conta. O mobile agora mostra
um crachá após a entrada, mesmo quando o operador não é o responsável.

`requestId` estável e fingerprint da entrada impedem duplicação por clique/retry,
inclusive concorrente. Reutilizar a tentativa com outro conteúdo gera conflito.
Repetir uma entrada já encerrada não reabre o check-in.

## Retirada

O operador seleciona uma pessoa da lista confirmada, informa o QR/código
apresentado e declara que conferiu identidade, foto disponível e restrições.
O backend valida todos esses requisitos e a versão atual dos responsáveis.
Uma observação livre não autoriza outra pessoa: o antigo override foi removido.

Retirada é transacional: somente `checked_in` pode transicionar para
`checked_out`. Duas confirmações concorrentes geram uma retirada e uma auditoria.
O retry da mesma operação vencedora é idempotente; outra tentativa recebe conflito.
O registro separa operador, ID/nome de quem recebeu e conta do responsável, quando
existente. Para pessoa sem conta, não inventa um UID de responsável.

Alterações dos responsáveis têm motivo e conferência obrigatórios, controle de
versão e auditoria com listas anterior/nova. Se essa alteração disputar com a
retirada, a mesma versão não confirma ambas. Uma tela antiga precisa atualizar.
Check-ins legados sem versão/lista confirmada são bloqueados para retirada até
regularização explícita no painel. Não houve migração automática de produção.

As regras Firestore negam criação, alteração e exclusão direta de check-ins e
escrita direta na auditoria. Foram removidas as funções antigas `saveKidsCheckIn`
e `checkoutKidsCheckIn`, sem consumidores restantes. Fotos continuam pela API
privada da entrega 4. QR/foto deixam de ser servidos após a retirada.

A confirmação de identidade é uma declaração auditada do operador; não é
biometria nem verificação automática de documentação. QR/código identifica o
check-in e não substitui a conferência da pessoa e das restrições pela equipe.

## Interface

Painel permite reabrir o crachá e confirmar/corrigir responsáveis na identificação
de retirada. Corrigida a rolagem do crachá em janela baixa. A capacidade fictícia
de 15 vagas foi substituída por retiradas efetivamente confirmadas na sessão;
não se apresenta esse contador como histórico completo do dia.

No app, entrada e retirada usam a mesma API. O responsável consulta seus crachás;
a equipe escolhe quem recebe e confirma identidade. Check-in legado ou vínculo
desatualizado orienta correção no painel/releitura antes de liberar.

## Evidências

- **235 testes** em 19 arquivos; typecheck e build OpenNext passaram.
- `corepack pnpm qa:kids-custody`: **77 verificações** HTTP/Firestore, incluindo
  conta ausente/duplicada/fora da igreja, conta inativa, visitante sem vínculo
  indevido, escrita direta negada, identidade/código/pessoa inválidos, cadastro
  idempotente, regularização de legado, retirada concorrente e disputa com
  alteração de responsáveis. Fixtures isoladas removidas ao fim.
- `corepack pnpm qa:kids-media`: **62 verificações** da entrega 4 passaram novamente.
- `corepack pnpm qa:registration`: cadastro/Passe/Kids e última vaga **49→50** passaram.
- Navegador: entrada fictícia, crachá/reabertura, inclusão confirmada de uma pessoa,
  rejeição de código incorreto, retirada com código correto e baixa na lista.
  Banco confirmou responsável sem UID indevido, operador real, quem recebeu e
  três auditorias (entrada, alteração, retirada). Fixture/auditorias removidas.
- Exports Hermes iOS/Android passaram. Não comprovam câmera ou instalação física.

## Pendências

P0.4 continua parcial: conferir escala, vínculo a sala/equipe/evento e identidade
cadastral da criança (entradas rápidas ainda são independentes de `Person`).
Homologar câmera, suspensão, perda de rede/retry e retirada em Android/iOS.
Retenção de fotos, reconciliação de objetos e publicação/IAM da entrega 4 permanecem.

Antes de publicar: coordenar backend, regras e versões web/app; clientes antigos
com gravação direta deixarão de registrar entrada/retirada. Regularizar check-ins
ativos antigos com a equipe. Não abrir as regras para manter clientes antigos.
