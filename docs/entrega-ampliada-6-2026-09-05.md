# Entrega 6 — operação Kids, cadastros e dados confiáveis

Entrega ampliada solicitada pelo usuário. Plano gratuito continua limitado a
**50 pessoas cadastradas**, com a mesma regra comercial de 50 membros. O
percentual global estimado passa de **69,45% para 76,65% (+7,20 pontos)**,
conforme os mesmos pesos em `entregas-2026-09-05.md`.

## Cadastros e acolhimento

Recepção, totem autenticado, atalho do dashboard e cadastro de voluntários usam
`POST /api/members`. Recepção grava pessoa, intake, jornada e duas tarefas no
mesmo commit; cadastro de voluntário grava pessoa e primeira escala juntos.
A criação direta de `people` foi fechada nas regras. `savePersonProfile` agora
somente atualiza documentos existentes; o workflow legado de gravações separadas
foi removido, com todos os consumidores migrados.

A transação consulta a contagem real de pessoas, mesmo quando `memberCount` está
desatualizado, e serializa concorrentes. O QA disputou a última vaga entre
cadastro completo, recepção e voluntário: apenas um entrou, total final 50.
Reenvio do mesmo pedido não duplica cadastro/jornada/escala. Campos são
preservados em falha; nenhuma pessoa local é anunciada como salva sem confirmação.
Um intake público pode ser integrado pela recepção uma única vez, com vínculo
preservado e bloqueio de conversões concorrentes.

O formulário público valida tipos, tamanho, telefone, e-mail, nascimento e
booleanos; preserva marketing recusado. O limite usa Firestore: cinco novos
pedidos por minuto por faixa de origem, 60 por hora e 200 por dia por igreja.
Há 256 faixas fixas para origem (hash parcial do IP fornecido pelo Cloudflare;
sem o header, origem compartilhada), mais os contadores de hora/dia. Isso limita
a quantidade de documentos e evita armazenar IP puro; colisões podem reduzir
conservadoramente a cota de usuários diferentes. `x-forwarded-for` não escolhe
uma faixa. Reiniciar a aplicação não zera esses contadores. Formulário idêntico
no mesmo dia é idempotente e não consome nova vaga; honeypot não grava.

Essas cotas protegem o cadastro público, sem criar membros automaticamente e sem
alterar a oferta gratuita. Turnstile e proteção de comprovantes ainda pendentes.
Em produção, a origem deve continuar atrás do Cloudflare, que fornece o header
confiável; a cota agregada por igreja permanece independente desse header.

## Kids por sala, evento e equipe

O painel administra sessões com uma sala Kids previamente configurada, evento
da mesma igreja, janela de entrada de até 24 horas, capacidade de 1 a 100 e
lista de até 20 contas operadoras ativas com papel habilitado. Sala e evento
ficam fixos após criação; equipe/horário/capacidade usam versão para impedir
sobrescrita concorrente. Uma sala não aceita sessões sobrepostas ou nova sessão
enquanto outra ainda tem crianças. O backend serializa esse agendamento.

Todas as novas entradas exigem sessão válida. A ocupação aumenta na transação
da entrada e diminui na retirada, uma única vez. Horário expirado bloqueia novas
entradas, mas permite concluir a retirada. Só uma sala desocupada pode ser
encerrada; não há reabertura de sessão encerrada. Administração pode recuperar
check-ins legados sem sessão; equipe comum precisa da escala nominal.

Lista, busca por código/QR, correção dos responsáveis e mídia validam o acesso
pelo servidor. O papel Kids isolado deixou de conceder leitura direta dos
check-ins de toda a igreja. Remover o operador da sessão revoga suas operações
e mídia. O responsável conserva acesso aos próprios crachás; no mobile, uma
pessoa que também é operadora continua vendo seus filhos de outras sessões.
Consultas filtram registros ativos antes do limite; índices correspondentes
foram versionados em `firestore.indexes.json` e precisam da publicação coordenada.
Web atualiza a lista a cada 30 segundos; app, a cada 60 segundos. A autorização
da mutação é sempre reavaliada, sem aguardar esse intervalo.

No painel, a administração pode selecionar uma criança/adolescente já
cadastrado. Nome vem do cadastro real e uma reserva transacional impede duas
presenças simultâneas da mesma pessoa, inclusive entre salas. A retirada libera
a reserva. Entrada avulsa continua disponível para visitantes; o nome livre não
é uma prova de identidade cadastral e não permite deduplicação segura por nome.
Nada nesse fluxo aumenta a contagem de membros. App usa as sessões confirmadas
do painel, sem salas padrão fictícias.

## Telas e privacidade

Removidos os fallbacks de pessoas, pedidos, lojas, ofertas, moderação, mentorias,
pulsos e histórico de rede nas frentes revisadas: recepção, cuidado pastoral,
marketplace/parceiros, marketplace da comunidade, minhas lojas, detalhe da loja,
moderação, rede, bem-estar e repertório. Consulta vazia fica vazia; falha de
consulta apresenta erro. Repertório deixou de semear músicas automaticamente e
o botão que injetava lojas de teste no Firestore foi removido.

Wi-Fi não transforma falha de rede em sucesso e não anuncia autorização do
roteador ao receber um cadastro. A integração de hotspot não foi entregue.
Pedido pastoral só é marcado como encaminhado/resolvido após persistência;
abrir WhatsApp é preparação manual, sem confirmação fictícia de mensagem enviada.

Pulsos, SOS e mentorias são privados ao titular/equipe pastoral. Um membro pode
registrar seu próprio pulso/SOS, mas não forjar o de outra pessoa. Loja pendente
fica acessível ao proprietário e administração; a vitrine consulta aprovadas.
Proprietário cria loja pendente e edições retornam à moderação, sem autoaprovação
ou troca de titular. Logs de moderação são privados da administração e não podem
ser alterados ou excluídos pelo cliente. Aprovação e log ainda são duas gravações
no fluxo existente; atomicidade dessa moderação é uma melhoria futura.

## Validação e CI

- 263 testes automatizados em 20 arquivos passaram.
- 91 verificações novas HTTP/Firestore passaram: três caminhos de cadastro,
  concorrência 49→50, rollback, idempotência/conversão pública, cotas, Kids por
  sessão/equipe/horário/capacidade, revogação, presença cadastral e privacidade.
- Regressões: 77 checks de custódia, 62 de mídia/Storage e 78 de Passe passaram,
  além de `qa:registration`. São 308 verificações numeradas, mais essa regressão.
- QA no navegador: sessão fictícia criada com capacidade 2; entrada 0→1,
  crachá emitido, encerramento bloqueado enquanto ocupada, retirada 1→0 e
  encerramento. Loja fictícia criada, aprovada, auditada e exibida na vitrine.
  Marketplace/bem-estar vazios também conferidos. Fixtures removidas e
  configuração Kids de QA restaurada; nenhum dado de produção usado.
- Typecheck, OpenNext do painel, LP estática e Hermes iOS/Android validados.
- CI versionado com jobs de tipos/testes, builds por aplicação e testes de
  autorização nos emuladores, permissões somente leitura e sem deploy/secrets.
  `scripts/qa-ci.mjs` inicia e encerra seu próprio servidor. Sintaxe conferida;
  **o workflow remoto ainda não foi executado**, pois não houve push.

Comando novo: `corepack pnpm qa:delivery6`. Os scripts existentes de Kids foram
ajustados para fornecer sessões nas fixtures e mantiveram seus cenários anteriores.
CI usa as versões documentadas pelas fontes oficiais:
[checkout](https://github.com/actions/checkout),
[setup-node](https://github.com/actions/setup-node) e
[setup-java](https://github.com/actions/setup-java).

## Limitações e próxima entrega

Sem publicação, push, migração remota ou teste em aparelhos físicos. Kids ainda
precisa de política/rotina de retenção de fotos, migração dos legados remotos,
conferência física de câmera/QR e validação da relação familiar cadastral além
da confirmação do operador. Autorização nominal da sessão não equivale a uma
escala de serviço aceita pelo voluntário nem certifica treinamento da equipe.

Não foram fechados todos os dados simulados do produto: EAD/eventos e outras
rotas exigem auditoria própria. Contatos compartilhados não são automaticamente
fundidos; deduplicação além de CPF ainda exige desenho. Uploads de comprovantes,
cobrança idempotente/conciliação, quotas de IA/comunicação, envios reais e QA
físico do app continuam na fila. CI e builds não certificam operação em produção.
