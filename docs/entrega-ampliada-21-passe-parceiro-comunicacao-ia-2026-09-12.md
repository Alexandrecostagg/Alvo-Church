# Entrega 21 — validação do Passe e rascunhos de comunicação com IA

Data: **12/09/2026**  
Branch: `codex/consolidacao-local-2026-09-05`  
Base: `14071c5`

## Problemas corrigidos

A emissão do Esdras Passe já comprovava a identidade do próprio membro, mas a
validação no parceiro não tinha um fluxo operacional seguro. A coleção de
validações ainda aceitava gravação direta de administrador da igreja e o código
completo aparecia no histórico. Na Comunicação, as mensagens manuais eram
seguras, porém a liderança precisava escrever cada texto fora da tela apesar de
a plataforma já possuir cota, autorização e auditoria comuns de IA.

## Esdras Passe no parceiro

- A rota `/marketplace/validate` oferece área própria ao responsável pelo
  parceiro, com seleção do benefício, código e leitura de QR a partir da câmera
  ou galeria do aparelho.
- Conta, vínculo exclusivo com pessoa, reserva da pessoa, parceiro e benefício
  ativo são reconferidos no servidor em cada tentativa.
- Código duplicado, Passe revogado, parceiro inativo, benefício pausado/expirado
  e auto validação são recusados.
- Cada tentativa aceita identificador idempotente. Reuso com outros dados é
  bloqueado e a aprovação gera trilha de auditoria.
- Limites persistentes de 20 tentativas por minuto e 500 por dia por parceiro
  reduzem enumeração de códigos, inclusive quando o código não existe.
- O parceiro recebe somente primeiro nome, elegibilidade e benefício. CPF, telefone,
  endereço, renda e conteúdo pastoral não saem do cadastro.
- Novos históricos guardam apenas os quatro últimos caracteres do Passe; o
  código completo deixa de ser persistido na validação.
- Gravação direta de validação, contador ou auditoria foi fechada nas regras do
  Firestore. A aprovação passa exclusivamente pela API transacional.

## Comunicação e IA

- O compositor de WhatsApp ganhou “Criar rascunho com IA”, com objetivo,
  público, detalhes confirmados e escolha de tom.
- O texto volta ao campo normal para revisão humana; a IA não envia mensagens.
- O novo uso compartilha cota mensal, limite por minuto, autorização por plano e
  auditoria já existentes. Objetivo e detalhes são validados antes de consumir
  cota.
- O log de IA registra ator, tarefa e resultado operacional, sem salvar prompt
  ou resposta. A tela orienta a não incluir dados pessoais ou pastorais.
- O prompt de sistema proíbe inventar datas, endereços, links, resultados e
  promessas e limita o texto a um rascunho curto.

## Evidências

- **393 testes em 35 arquivos**, todos aprovados.
- TypeScript aprovado nos **13 workspaces** cobertos.
- Build Next 16.3.4 aprovado com **79 rotas**, incluindo
  `/api/members/pass/validate` e `/marketplace/validate`.
- **41 verificações novas** em Auth/Firestore emulados: vínculo do parceiro,
  isolamento, plano, benefício, código ausente/duplicado, revogação, auto validação,
  privacidade, idempotência, fraude direta, contador privado e limite de 50.
- Bateria regressiva integral aprovada: cadastro 49→50, Passe do membro,
  custódia/mídia Kids e entregas 6–10.
- Revisão visual aprovada em desktop e viewport móvel de **390 × 844**.

## Percentual

O Esdras Passe avança de **65% para 82%** por possuir validação operacional,
autorizada, auditada e testada em parceiro. Comunicação/IA avança de **86% para
89%** pela geração integrada, revisão humana e validação anterior ao consumo.

`94,70 + (5 × 17 + 10 × 3) / 100 = 95,85%`.

O ganho global é **1,15 ponto**. O plano gratuito permanece com **50 membros**.
Como restam apenas 5,30 pontos no denominador antes desta entrega, ganhos globais
de 7–10 pontos deixaram de ser matematicamente possíveis sem aumentar o escopo.

## Limites restantes

- Leitura da câmera foi validada no navegador responsivo e por decodificação de
  QR em teste; falta homologação presencial em aparelho e estabelecimento.
- O código atual é estável. Capturas antigas permanecem utilizáveis enquanto o
  membro mantiver elegibilidade; Passe rotativo exigiria outra estratégia.
- WhatsApp continua manual, com confirmação explícita do líder. Push, email,
  webhook, retries e entrega comprovada por provedor continuam pendentes.
- A geração exige ao menos um provedor configurado e plano com cota. Não houve
  chamada paga ao provedor nesta validação local.

## Publicação

- Commit principal: `587e4d9`.
- Worker `alvo-church-web`: versão
  `afb66973-a44d-4b25-aa44-efd3a0e43ce1`; tela respondeu 200 e API sem sessão, 401.
- Os secrets de DeepSeek, Groq e Turnstile permaneceram configurados no Worker.
- A primeira execução remota encontrou uma virada de minuto no teste antigo de
  cota pública depois que a nova suíte aumentou a duração. O teste foi reancorado
  no minuto corrente sem alterar a regra do produto. O commit `e85af54` passou
  integralmente no GitHub Actions
  [`34697158629`](https://github.com/Alexandrecostagg/Alvo-Church/actions/runs/34697158629).
- As regras Firestore compilaram e foram publicadas no projeto `alvo-church`.
