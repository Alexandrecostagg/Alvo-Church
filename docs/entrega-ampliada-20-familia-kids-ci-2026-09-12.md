# Entrega 20 — família oficial no Kids e CI integral

Data: **12/09/2026**  
Branch: `codex/consolidacao-local-2026-09-05`  
Base: `d1de495`

## Problema corrigido

O fluxo diferenciava criança cadastrada de entrada avulsa, mas aceitava os
mesmos campos livres de responsável nos dois casos. Assim, uma criança existente
podia receber uma lista de retirada sem relação com a família registrada pela
instituição. Além disso, o CI remoto falhava desde a ativação obrigatória do
Turnstile porque a massa de QA ainda chamava o formulário público sem desafio.

## Comportamento entregue

- Criança cadastrada exige família ativa e associação explícita da criança.
- A recepção escolhe somente entre pessoas adultas, ativas e marcadas como
  responsáveis legais na família.
- Nome, telefone, pessoas autorizadas e acesso ao app são derivados no servidor;
  dados livres enviados pelo navegador não substituem o cadastro.
- O acesso pelo app só é concedido quando conta, vínculo e reserva exclusiva da
  pessoa concordam entre si.
- A retirada consulta novamente a família. Uma revogação feita durante a sessão
  bloqueia a liberação até a equipe atualizar os responsáveis.
- Entrada avulsa continua aceitando responsável conferido manualmente, sem criar
  pessoa nem consumir vaga adicional do plano.
- O editor de custódia também usa a lista familiar para check-ins cadastrados.
- A API de consulta não devolve e-mail nem telefone familiar e exige equipe
  escalada na sessão.

## CI corrigido

O desafio sintético só é aceito quando o projeto é `demo-alvo-qa` e os emuladores
de Firestore e Auth estão ativos. O token é vinculado à ação `public_visit` ou
`public_giving`; ação divergente é recusada sem acesso à rede. Produção continua
usando o Siteverify da Cloudflare e falha fechada. A matriz integrada agora roda
as entregas 8, 9 e 10, que existiam mas estavam fora do workflow.

## Evidências locais

- **385 testes em 33 arquivos:** aprovados.
- TypeScript: **13 workspaces** aprovados.
- Build Next 16.3.4: **77 rotas** geradas, incluindo `/api/kids/custody`.
- Emuladores Auth, Firestore e Storage: ciclo integral aprovado.
- QA de custódia: 77 verificações.
- QA de mídia Kids: 62 verificações.
- QA ampliado da entrega 6: **101 verificações**, dez a mais que a base.
- QA da entrega 7: 136 verificações.
- QA das entregas 8, 9 e 10: 43, 35 e 20 verificações.
- Disputa 49→50 e contador final: preservados.

## Percentual

Pessoas e famílias avança de **93% para 95%** pelo uso operacional do vínculo
familiar. Segurança Kids avança de **92% para 96%** pela fonte autoritativa,
revalidação na retirada e cobertura de abuso. O cálculo ponderado é:

`94,00 + (15 × 2 + 10 × 4) / 100 = 94,70%`.

O ganho é **0,70 ponto**. O plano gratuito permanece com **50 membros**.

## Limites restantes

- Relações familiares antigas precisam estar completas para crianças cadastradas;
  o bloqueio orienta a equipe a procurar a secretaria.
- Instalação e retirada em aparelho físico continuam sem homologação registrada.
- Migração de check-ins legados e revisão de mídia antiga ainda exigem operação
  coordenada no ambiente real.
- Cobrança em sandbox, comunicação por provedor e validação ponta a ponta do
  Esdras Passe ainda são as maiores oportunidades para aproximar o sistema de 100%.

Commit, execução remota do GitHub Actions e versão do Worker serão acrescentados
após a publicação desta entrega.
