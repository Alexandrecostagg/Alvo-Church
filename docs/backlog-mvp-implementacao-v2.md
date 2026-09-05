# Backlog ativo de implementação — Plataforma Esdras

Atualizado em **05/09/2026**, após a entrega ampliada 6: **76,65% (+7,20 pontos)**.
Substitui os status de junho; mantém os números dos épicos para rastreabilidade.
Responsável técnico atual: desenvolvimento local nesta tarefa. Nenhum prazo de
calendário foi estimado. [Diagnóstico e porcentagens](status-implementacao-2026-09-05.md).

## Critério de status

- **Validado localmente:** código e cenário específico testados, sem implicar deploy.
- **Parcial:** há implementação, mas faltam requisitos ou homologação.
- **Pendente:** trabalho ainda necessário, mesmo que exista desenho/tela.
- **Futuro:** fora do fechamento operacional imediato.

Não marcar um épico concluído apenas porque sua rota existe. Aceite exige fluxo
com dados reais de teste, caminho de erro e tentativa de acesso indevido quando
envolver autorização. Segurança pode bloquear a liberação de qualquer épico.

## Fila de execução

| Ordem | Item | Estado | Critério de aceite |
| --- | --- | --- | --- |
| P0.1 | Dependências de produção | Validado localmente — entrega 1 | Zero críticos/altos; 1 moderado de uuid/Xcode sem alcance identificado no uso v4. Testes, builds, pods e QA registrados em `entregas-2026-09-05.md`. |
| P0.2 | Conta → pessoa → Passe | Validado localmente — entrega 3 | Administração confirma vínculo exclusivo e auditado; regras negam autoatribuição e leitura alheia. Cartão mobile condicionado à elegibilidade; 78 verificações HTTP/regras, QR decodificado e exports iOS/Android. QA físico segue em P1.2. |
| P0.3 | QR e fotos Kids | Validado localmente — entrega 4 | POST autenticado, Storage privado sem download token, consulta periódica; responsável/autorizado/operador/estranho, upload e exclusão física testados em 62 verificações. Publicação/IAM, legado e retenção pendentes. |
| P0.4 | Fluxo Kids mobile | Validado localmente — entrega 6; físico pendente | Sessões por sala/evento/equipe, horário/lotação, presença cadastral exclusiva no painel e retirada validada no servidor; app usa as sessões. Falta relação familiar cadastral, legados remotos, retenção e aparelho. |
| P0.5 | Limites e proteção pública | Parcial — entrega 6 | Recepção/dashboard/escalas agora usam API central; disputa 49→50 entre três origens validada. Público tem cota persistente, idempotência e conversão única. Faltam Turnstile e comprovantes privados. |
| P1.1 | Verdade dos dados | Parcial — entrega 6 | Recepção, pastoral, rede, lojas/ofertas/moderação, bem-estar e repertório revisados; Wi-Fi sem falso sucesso. Falta auditar EAD/eventos e demais rotas; não declarar todo o produto limpo. |
| P1.2 | App em aparelhos | Pendente | Preview Android/iOS com login, vínculo, revogação, QR/câmera, foto e push real; registrar resultados e bugs antes de loja. |
| P1.3 | Consolidação da LP | Parcial — entrega 2 | Oferta de 50 corrigida; 22 arquivos redundantes removidos, alias /landing validado em preview. Falta convergir LP ativa do painel, provas comerciais, SEO/privacidade e migração de domínio. |
| P1.4 | Cobrança, comunicação e IA | Parcial | Idempotência de checkout, validação de tenant/destinatários, opt-out e cota/rate limit uniformes; homologação sandbox. |
| P2.1 | Otimizações Jules | Pendente | Revisar os dois diffs preservados nas sessões pausadas, limites, índices e regras; medir antes/depois. |

## Épico 1 — Pessoas, famílias, identidade e jornadas

**Parcial; cadastro completo validado localmente.** `/api/members` grava
pessoa/família/vínculo em transação, reserva CPF, trata idempotência e limite,
emite Passe criptográfico com consentimento. CEP, nascimento e ficha homologados.

Recepção/dashboard/escalas convergiram na entrega 6, com bloqueio da criação
direta e do excesso de 50. Falta tratar deduplicação além de CPF e
completar timeline e vínculos de grupo/evento/cuidado. Identidade conta/pessoa
confirmada pela administração na entrega 3, com QA de exclusividade e permissões.
Não inferir que `uid` e `personId` são intercambiáveis.

## Épico 2 — Recepção e Painel Pastor

**Parcial — entrega 6.** Recepção e totem autenticado gravam pessoa/jornada/tarefas
atomicamente e não simulam sucesso offline. Intake público é convertido uma vez.
Saudação e encaminhamento ainda precisam de QA integral por papel. Observações
pastorais não podem ser projetadas ao público.

## Épico 3 — Finanças e PIX

**Parcial.** Lançamentos e contribuições têm repositórios; regras financeiras
exigem administração. PIX estático real está implementado em `/api/giving/pix`.
Faltam conciliação, auditoria imutável, relatórios/exportação completos e QA de
permissões. Gerar QR não comprova recebimento do dinheiro.

## Épico 4 — Kids Security

**Parcial e bloqueador.** UUID criptográfico web/mobile integrado; mídia autenticada
e Storage privado validados na entrega 4. App restringe registro de entrada à
equipe. Responsável separado do operador,
lista confirmada e retirada atômica validados na entrega 5. Entrega 6 acrescenta
sala/evento/equipe, janela de entrada, ocupação e criança cadastrada com presença
exclusiva. Faltam relação familiar, legado remoto, retenção e QA físico.
[Evidências](entrega-ampliada-6-2026-09-05.md).
Aceite conforme P0.3/P0.4; teste unitário não substitui retirada em aparelho.

## Épico 5 — IA Pastoral

**Parcial.** APIs autenticadas e cota transacional principal existem; painel
teve pedidos demonstrativos removidos na entrega 6. Unificar banner/texto/imagem na mesma política de
custo, limite persistente e auditoria mínima; manter revisão humana das ações
sensíveis. Homologar sinais reais e falha dos provedores.

## Épico 6 — Louvor e escalas

**Parcial.** Repertório, setlists, repositórios de escalas/trocas e regra de
conflito estão implementados; testes de conflito passaram. Homologar cadastro,
vínculo da pessoa ao usuário, aceite/recusa/troca e repertório no app. Criação de pessoa/primeira escala consolidada na entrega 6. Não tratar a existência do tipo de troca como fluxo completo.

## Épico 7 — Marketplace e Esdras Passe

**Parcial.** Loja, moderação e benefícios têm telas/repositórios. Fallbacks fictícios em vitrine, detalhes e moderação foram removidos na entrega 6.
Loja pendente é privada; criação pelo titular, aprovação e auditoria foram homologadas. A emissão do Passe foi corrigida,
e a carteirinha mobile/vínculo seguro foram implementados na entrega 3. Homologar
validação em parceiro sem expor CPF/renda/histórico e em aparelhos; consulta do
app revalida a cada 60 segundos, não invalida capturas antigas do código.
Evidências: [entrega 3](vinculo-passe-2026-09-05.md).

## Épico 8 — SaaS, organizações e white-label

**Parcial.** Tenant, branding, planos, módulos e checkout existem. Gestão de
usuários restringe papéis, e a assinatura está protegida nas regras. Revisar
todas as coleções, limites por todos os pontos de entrada, provisionamento,
unicidade de slug/domínio e idempotência de cobrança. Confirmar configuração
remota apenas na etapa de homologação/deploy.

## Épico 9 — Limpeza técnica, rotas e releases

**Parcial.** Consolidação Git concluída, testes/types e build OpenNext passaram.
Wi-Fi deixou de simular sucesso e CI por aplicação/emuladores foi versionado na
entrega 6. A execução remota está pendente, sem push. Ainda existem `/test` e
rotas/LPs sobrepostas; registrar destinos e critérios de promoção/rollback.

## Épico 10 — Formulários públicos e QR

**Parcial, não mais “novo”.** Portal `/p/[orgSlug]`, `/visit` e API
`/api/public/visit` existem; visitante público passa pelo servidor, com honeypot,
limites persistentes e idempotência desde a entrega 6. Faltam Turnstile, QA integral do acolhimento
e recorte de check-in adulto/página pública por evento. Não remover essas rotas
ao separar a LP institucional: pertencem à operação da plataforma.

## Épico 11 — Giving recorrente e doações

**Parcial, não mais “novo”.** `/p/[orgSlug]/give`, campanhas, intenção,
comprovante e PIX estático estão presentes. Faltam pagamento dinâmico confirmado,
recorrência de doação, lançamento reconciliado e carta fiscal, conforme recorte
comercial. Assinatura SaaS em Asaas não equivale a doação recorrente da igreja.

## Épico 12 — Comunicação multicanal

**Parcial.** Templates, histórico e abertura de WhatsApp existem. Push/email
na tela de campanhas ainda estão “em breve”; o app já registra Expo Push Token.
Faltam envio/entrega comprovados, opt-out, destinatários autorizados, retries e
agendamento. SMS/WhatsApp oficial precisam de integração e critério comercial.

## Épico 13 — Feature gate e menu

**Parcial, implementação presente.** Contexto de features, menu progressivo,
planos e rota de upgrade existem no web. Homologar bloqueio por rota direta e
API, paridade mobile e alterações de plano. Esconder menu não é autorização.

## Épico 14 — Camada 2, tribos, EAD e rede

**Misto: implementações parciais e expansão futura.** Scoring de tribos possui
testes; jornadas, cursos e rede têm telas e repositórios. Marketplace/rede revisados na entrega 6; loja pendente/aprovada e privacidade
homologadas. Falta validar demais operações e remover demos de EAD/eventos. Jovens, workflows, analytics avançado, missões
e capacitação ampla em rede devem receber histórias e aceite antes de entrar
na estimativa. Não anunciar toda a Camada 2 como entregue.

## Fechamento de uma entrega

Agrupar histórias maiores, mirando entregas de 7–10 pontos quando o trabalho
validado justificar, conforme solicitação do usuário. Não aumentar indicador
apenas para atingir a faixa. Guardar evidência no repositório: commit, cenário, ambiente, resultado e
limitações. Atualizar este backlog e a linha de base de porcentagem somente
quando houver nova implementação/validação. Build, publicação e homologação
são estados diferentes. Nenhum repo, domínio ou deploy foi alterado nesta revisão.
