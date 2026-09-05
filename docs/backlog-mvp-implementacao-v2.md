# Backlog ativo de implementação — Plataforma Esdras

Atualizado em **05/09/2026**, após consolidação local e encerramento do Jules.
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
| P0.2 | Conta → pessoa → Passe | Parcial | Vínculo atribuído por operação autorizada, autoalteração negada, busca restrita ao tenant, carteirinha só com consentimento/benefício/código válido; testar conta sem vínculo e vínculo incorreto. |
| P0.3 | QR e fotos Kids | Parcial | Segredo fora de URL/cache público, foto em armazenamento privado com acesso temporário; testar responsável, autorizado, operador e estranho. |
| P0.4 | Fluxo Kids mobile | Pendente | Definir responsável solicitando versus operador confirmando, alinhar UI/regras; validar check-in/retirada e repetição em aparelho. |
| P0.5 | Limites e proteção pública | Parcial | Recepção/escalas usam a política transacional de pessoas; limite persistente/anti-spam e mediação segura de comprovantes. |
| P1.1 | Verdade dos dados | Parcial | Remover fallbacks de recepção, pastoral, rede, marketplace e bem-estar; vazio/erro não inventa registros; Wi-Fi não confirma falha. |
| P1.2 | App em aparelhos | Pendente | Preview Android/iOS com login, vínculo, revogação, QR/câmera, foto e push real; registrar resultados e bugs antes de loja. |
| P1.3 | Consolidação da LP | Parcial — entrega 2 | Oferta de 50 corrigida; 22 arquivos redundantes removidos, alias /landing validado em preview. Falta convergir LP ativa do painel, provas comerciais, SEO/privacidade e migração de domínio. |
| P1.4 | Cobrança, comunicação e IA | Parcial | Idempotência de checkout, validação de tenant/destinatários, opt-out e cota/rate limit uniformes; homologação sandbox. |
| P2.1 | Otimizações Jules | Pendente | Revisar os dois diffs preservados nas sessões pausadas, limites, índices e regras; medir antes/depois. |

## Épico 1 — Pessoas, famílias, identidade e jornadas

**Parcial; cadastro completo validado localmente.** `/api/members` grava
pessoa/família/vínculo em transação, reserva CPF, trata idempotência e limite,
emite Passe criptográfico com consentimento. CEP, nascimento e ficha homologados.

Falta convergir entradas de recepção/escalas; tratar deduplicação além de CPF;
completar identidade conta/pessoa, timeline e vínculos de grupo/evento/cuidado.
Não inferir que `uid` e `personId` são intercambiáveis.

## Épico 2 — Recepção e Painel Pastor

**Parcial.** Há persistência de visitante e follow-up; a interface ainda inicia
com registros demonstrativos. Migrar criação de pessoa para a política central,
retirar simulações e homologar saudação/encaminhamento por papel. Observação
pastoral não pode aparecer no painel público.

## Épico 3 — Finanças e PIX

**Parcial.** Lançamentos e contribuições têm repositórios; regras financeiras
exigem administração. PIX estático real está implementado em `/api/giving/pix`.
Faltam conciliação, auditoria imutável, relatórios/exportação completos e QA de
permissões. Gerar QR não comprova recebimento do dinheiro.

## Épico 4 — Kids Security

**Parcial e bloqueador.** UUID criptográfico web/mobile integrado; leitura por
responsável/operador testada em emuladores. QR por URL/cache, base64 de foto e
incompatibilidade entre check-in do responsável e regras de operador permanecem.
Aceite conforme P0.3/P0.4; teste unitário não substitui retirada em aparelho.

## Épico 5 — IA Pastoral

**Parcial.** APIs autenticadas e cota transacional principal existem; painel
ainda possui demonstrações. Unificar banner/texto/imagem na mesma política de
custo, limite persistente e auditoria mínima; manter revisão humana das ações
sensíveis. Homologar sinais reais e falha dos provedores.

## Épico 6 — Louvor e escalas

**Parcial.** Repertório, setlists, repositórios de escalas/trocas e regra de
conflito estão implementados; testes de conflito passaram. Homologar cadastro,
vínculo da pessoa ao usuário, aceite/recusa/troca e repertório no app. Consolidar
criação de pessoas e não tratar a existência do tipo de troca como fluxo completo.

## Épico 7 — Marketplace e Esdras Passe

**Parcial.** Loja, moderação e benefícios têm telas/repositórios. Há fallbacks
fictícios, inclusive em detalhes/moderação. A emissão do Passe foi corrigida,
mas a carteirinha mobile era apenas plano do Jules. Executar P0.2 e homologar
validação em parceiro sem expor CPF/renda/histórico; revisar revogação e auditoria.

## Épico 8 — SaaS, organizações e white-label

**Parcial.** Tenant, branding, planos, módulos e checkout existem. Gestão de
usuários restringe papéis, e a assinatura está protegida nas regras. Revisar
todas as coleções, limites por todos os pontos de entrada, provisionamento,
unicidade de slug/domínio e idempotência de cobrança. Confirmar configuração
remota apenas na etapa de homologação/deploy.

## Épico 9 — Limpeza técnica, rotas e releases

**Parcial.** Consolidação Git concluída, testes/types e build OpenNext passaram.
Ainda existem `/test`, `/wifi` com falso sucesso e rotas/LPs sobrepostas. Registrar
destino de cada rota; manter menus coerentes. Criar CI versionado por aplicação
com dependências compartilhadas, e critérios de promoção/rollback.

## Épico 10 — Formulários públicos e QR

**Parcial, não mais “novo”.** Portal `/p/[orgSlug]`, `/visit` e API
`/api/public/visit` existem; visitante público passa pelo servidor, com honeypot
e rate limit em memória. Faltam limite persistente/anti-spam, QA do acolhimento
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
testes; jornadas, cursos e rede têm telas e repositórios. Falta validar operações
de ponta a ponta e remover demos. Jovens, workflows, analytics avançado, missões
e capacitação ampla em rede devem receber histórias e aceite antes de entrar
na estimativa. Não anunciar toda a Camada 2 como entregue.

## Fechamento de uma entrega

Guardar evidência no repositório: commit, cenário, ambiente, resultado e
limitações. Atualizar este backlog e a linha de base de porcentagem somente
quando houver nova implementação/validação. Build, publicação e homologação
são estados diferentes. Nenhum repo, domínio ou deploy foi alterado nesta revisão.
