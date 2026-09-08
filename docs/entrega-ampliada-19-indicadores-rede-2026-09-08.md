# Entrega ampliada 19 — indicadores reais da rede

Data: **08/09/2026**

## Resultado

O snapshot diário da rede deixou de gravar zeros fixos. O Worker agora calcula,
por instituição, membros, visitantes, grupos, finanças, eventos e presenças por
consultas agregadas do Firestore. Consultas de subcoleções exigem
`organizationId`, preservando o isolamento entre instituições.

O painel consolida somente filiais ativas com snapshot disponível, informa a
cobertura `X/Y`, exibe a data da última consolidação e avisa quando uma filial
ainda aguarda o cron. Os nomes dos indicadores foram corrigidos: a antiga taxa
de “engajamento” representa a proporção de membros ativos cadastrados; presença
em grupos é média por encontro concluído e presenças em eventos são mensais.

## Regras de cálculo

- `totalMembers`: pessoas menos visitantes.
- `activeMembers`: pessoas com situação membro, líder ou voluntário.
- `newMembersThisMonth`: cadastros desde o início UTC do mês.
- `avgGroupAttendance`: presenças e primeiras visitas do mês divididas pelos
  encontros concluídos no mesmo período.
- `givingThisMonth` e `givingLastMonth`: entradas menos lançamentos anulados;
  registros legados sem situação permanecem contabilizados.
- `eventsThisMonth`: eventos publicados ou encerrados no mês.
- `totalEventAttendance`: inscrições com check-in confirmado no mês.
- `serviceAttendanceRate`: nome legado mantido no contrato; valor atual é
  `activeMembers / totalMembers`, apresentado como “Membros ativos”.

Os valores financeiros admitem centavos e são enviados ao Firestore como
`doubleValue`; contagens inteiras continuam como `integerValue`. A coleta limita
a quatro instituições simultâneas para evitar uma rajada sem controle contra as
APIs do Google.

## Validação e publicação

- **384 testes em 33 arquivos** passaram, incluindo cinco testes novos para
  janelas mensais UTC, consultas agregadas, isolamento por instituição,
  decimais e limite de concorrência.
- TypeScript passou nos 13 workspaces aplicáveis.
- Build Next/OpenNext passou com 77 rotas; o dry-run do Worker gerou o bundle.
- Seis índices compostos de finanças, eventos, encontros, presenças e check-ins
  foram publicados e chegaram ao estado `READY`.
- API publicada em `alvo-church-worker-api`, versão
  `29ee2174-583c-41b7-951e-39700c53a6f9`; `/health` respondeu saudável.
- Painel publicado em `alvo-church-web`, versão
  `19ba5036-2700-4908-9a3a-c146d4887318`; `/network` respondeu HTTP 200.
- `GOOGLE_SERVICE_ACCOUNT_JSON` e `TURNSTILE_SECRET_KEY` foram confirmados nos
  respectivos Workers remotos.

O cron está ativo em `0 6 * * *`, equivalente a 03:00 em Belém. A primeira
renovação dos dados reais após esta publicação ocorrerá na próxima execução
agendada. Não foi feita gravação manual na produção para antecipar esse ciclo.

## Percentual e limites preservados

Expansão avança de 99 para 100. Pela ponderação de 5%, o sistema passa de
**93,95% para 94,00%**, ganho de **0,05 ponto**. O avanço pequeno reflete uma
frente que já estava próxima do teto e evita aumentar artificialmente a medida.

O plano Gratuito permanece com **50 membros**. O plano Rede mantém o limite de
**50 instituições**. Permanecem fora desta entrega: QA do app em aparelhos,
conteúdo/capacitação, integração financeira real, migrações legadas e entrega de
comunicação por provedor.
