# Backlog ativo de implementação — Plataforma Esdras

Atualizado em **12/09/2026**, após a entrega ampliada 22: **96,00% (+0,15 ponto)**.
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
| P0.2 | Conta → pessoa → Passe → parceiro | Validado localmente — entregas 3 e 21 | Administração confirma vínculo exclusivo e auditado. Parceiro vinculado valida QR/código por API, com benefício/consentimento, limite, idempotência, auditoria e resposta mínima; escrita direta fechada. QA físico segue em P1.2. |
| P0.3 | QR e fotos Kids | Validado localmente — entrega 4 | POST autenticado, Storage privado sem download token, consulta periódica; responsável/autorizado/operador/estranho, upload e exclusão física testados em 62 verificações. Retenção assistida validada na entrega 7; publicação/IAM e inventário legado pendentes. |
| P0.4 | Fluxo Kids mobile | Validado localmente — entregas 6 e 20; físico pendente | Sessões por sala/evento/equipe, horário/lotação e presença exclusiva. Criança cadastrada só usa responsáveis legais ativos da família, com conta verificada quando existente e revogação reconferida na retirada. Entrada avulsa continua explícita. Faltam legados remotos e aparelho. |
| P0.5 | Limites e proteção pública | Publicado e validado — entrega 15 | Recepção/dashboard/escalas usam API central; disputa 49→50 entre três origens validada. Público tem cota persistente, idempotência, conversão única e Turnstile com validação server-side por ação/hostname. Widget, secret criptografado, deploy e QA ao vivo confirmados. |
| P0.6 | Administração central | Publicado e validado — entregas 16–17 | Admin Esdras altera instituição, situação, plano, cobrança, módulos e usuários por API autenticada e auditada. Pausas alcançam UI, APIs e Firestore direto; último admin e contas ligadas a pessoas são preservados. Gratuito mantém 50 membros. |
| P1.1 | Verdade dos dados | Parcial — entrega 19 | EAD/eventos sem demos; portal usa dados reais; rede não permite gravação cliente e o cron calcula agregados reais com cobertura explícita. Células, escalas, follow-ups e transparência só confirmam persistência. Falta revisar dados externos. |
| P1.2 | App em aparelhos | Pendente | Preview Android/iOS com login, vínculo, revogação, QR/câmera, foto e push real; registrar resultados e bugs antes de loja. |
| P1.3 | Consolidação da LP | Parcial — entrega 22 | Oferta de 50, narrativa e direção visual próprias, marca oficial, exemplos rotulados, canonical e links legais validados; CSS copiado e componente inoperante removidos. Faltam capturas reais do produto, analytics consentido e migração de domínio. |
| P1.4 | Cobrança, comunicação e IA | Parcial — entrega 21 | Checkout/IA da entrega 7; WhatsApp manual seguro da entrega 8; rascunho de comunicado com revisão, cota e auditoria da entrega 21. Faltam sandbox Asaas, migrações e entrega por provedor/webhook. |
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

**Parcial — entrega 7 validada localmente.** Declaração privada, conferência
administrativa com referência única, ledger/auditoria atômicos e anulação manual
com histórico. CSV mensal agrega centavos sem duplicar contribuições confirmadas
e rejeita mais de 1.000 registros por origem; painel tem escopo limitado explícito.
Faltam integração bancária, relatórios contábeis completos e inventário dos legados.
Gerar PIX ou anexar comprovante não comprova recebimento do dinheiro.

## Épico 4 — Kids Security

**Parcial e bloqueador.** UUID criptográfico web/mobile integrado; mídia autenticada
e Storage privado validados na entrega 4. App restringe registro de entrada à
equipe. Responsável separado do operador,
lista confirmada e retirada atômica validados na entrega 5. Entrega 6 acrescenta
sala/evento/equipe, janela de entrada, ocupação e criança cadastrada com presença
exclusiva. Entrega 7 permite remover fotos antigas após retirada, com prévia e
auditoria. Faltam relação familiar, inventário legado remoto e QA físico.
[Evidências](entrega-ampliada-6-2026-09-05.md).
Aceite conforme P0.3/P0.4; teste unitário não substitui retirada em aparelho.

## Épico 5 — IA Pastoral

**Parcial — entregas 7 e 21.** Texto, banner e imagem compartilham cota mensal UTC,
limites persistentes por igreja/usuário, autorização e auditoria sem prompts.
Tentativa iniciada consome cota mesmo em falha; concorrência na última unidade
validada sem chamar provedor real. Comunicação agora gera rascunho curto dentro
do compositor, validado antes de consumir cota e sempre sujeito a revisão humana.
Homologar geração real, custos e sinais pastorais antes de ampliar o uso.

## Épico 6 — Louvor e escalas

**Parcial.** Repertório, setlists, repositórios de escalas/trocas e regra de
conflito estão implementados; testes de conflito passaram. Homologar cadastro,
vínculo da pessoa ao usuário, aceite/recusa/troca e repertório no app. Criação de pessoa/primeira escala consolidada na entrega 6. Não tratar a existência do tipo de troca como fluxo completo.

## Épico 7 — Marketplace e Esdras Passe

**Parcial — validação web concluída na entrega 21.** Loja, moderação e benefícios têm telas/repositórios. Fallbacks fictícios em vitrine, detalhes e moderação foram removidos na entrega 6.
Loja pendente é privada; criação pelo titular, aprovação e auditoria foram homologadas. Na entrega 10, aprovação, rejeição e suspensão passaram a uma transação de servidor com idempotência; status e logs diretos foram bloqueados. A emissão do Passe foi corrigida,
e a carteirinha mobile/vínculo seguro foram implementados na entrega 3. Na
entrega 21, parceiro vinculado passou a validar QR/código por API transacional,
sem CPF/renda/histórico, com limite, idempotência e auditoria. Falta homologar em
aparelho e estabelecimento; a consulta do app revalida a cada 60 segundos e não
invalida capturas antigas do código.
Evidências: [entrega 3](vinculo-passe-2026-09-05.md).

## Épico 8 — SaaS, organizações e white-label

**Parcial — gestão central publicada nas entregas 16–18.** Tenant, branding, planos,
módulos e checkout existem. O admin Esdras agora altera cadastro/situação, plano,
cobrança e módulos e pode mudar papel, bloquear, reativar ou remover acesso sem
vínculo cadastral. Toda mutação exige motivo e deixa auditoria privada; o último
admin ativo e contas ligadas a pessoas são preservados. Bloqueios de instituição,
usuário ou módulo alcançam a interface, as APIs e o Firestore direto.
Revisar limites nas demais entradas, provisionamento e unicidade de slug/domínio.
Checkout e webhook vinculados à ordem foram validados com provedor simulado na
entrega 7; migrar cobranças legadas e homologar sandbox real e cancelamento
financeiro no provedor.

Convites de rede agora aplicam plano e limite de 50 instituições em transação.
A sede pode reemitir, revogar e desvincular; aceite usa a instituição da sessão,
evita auto vínculo e segunda rede e abre somente indicadores agregados.

## Épico 9 — Limpeza técnica, rotas e releases

**Parcial.** Consolidação Git concluída, testes/types e build OpenNext passaram.
Wi-Fi deixou de simular sucesso e CI por aplicação/emuladores foi versionado na
entrega 6. A branch foi enviada e o painel publicado; a rota `/test` foi removida
na entrega 10. A entrega 22 reduziu o CSS da LP de 11.331 para 265 linhas e
removeu seu componente de navegação inoperante. Ainda existem rotas/LPs sobrepostas; registrar destinos e critérios
de promoção/rollback.

## Épico 10 — Formulários públicos e QR

**Parcial, não mais “novo”.** Portal `/p/[orgSlug]`, `/visit` e API
`/api/public/visit` existem; visitante público passa pelo servidor, com honeypot,
limites persistentes e idempotência desde a entrega 6. Giving usa slug real,
capacidade secreta de 48 horas e projeção pública mínima desde a entrega 7.
A entrega 15 adiciona Turnstile nos dois pontos de gravação, valida token, ação e
hostname no servidor e preserva a confirmação PIX pelo token já existente. O
secret criptografado, o deploy e o QA ao vivo foram concluídos; falta fechar o
acolhimento e o recorte de check-in adulto/página pública por evento. Não remover essas rotas
ao separar a LP institucional: pertencem à operação da plataforma.

## Épico 11 — Giving recorrente e doações

**Parcial, não mais “novo”.** `/p/[orgSlug]/give`, campanhas, intenção,
comprovante e PIX estático estão presentes. Na entrega 7, comprovante privado,
declaração idempotente, opt-out e lançamento conferido/auditado foram validados.
Faltam pagamento dinâmico confirmado, recorrência de doação e carta fiscal, conforme recorte
comercial. Assinatura SaaS em Asaas não equivale a doação recorrente da igreja.

## Épico 12 — Comunicação multicanal

**Parcial — entregas 8 e 21 validadas localmente.** WhatsApp manual prepara somente
destinatários ativos, da igreja, com telefone válido e sem opt-out. Abertura da
conversa não é contada como envio; o líder confirma destinatários e a operação
é idempotente e auditada. Perfil permite retirar/reautorizar consentimento. O
compositor gera rascunho com IA sob cota e auditoria sem conteúdo, deixando o
envio exclusivamente após revisão humana.
Push/email continuam “em breve”. Faltam entrega comprovada, webhook, retries,
agendamento e integração oficial com critério comercial.

## Épico 13 — Feature gate e menu

**Parcial, implementação presente.** Contexto de features, menu progressivo,
planos e rota de upgrade existem no web. Homologar bloqueio por rota direta e
API, paridade mobile e alterações de plano. Esconder menu não é autorização.

## Épico 14 — Camada 2, tribos, EAD e rede

**Misto: implementações parciais e expansão futura.** Scoring de tribos possui
testes; jornadas, cursos e rede têm telas e repositórios. Marketplace/rede revisados na entrega 6; loja pendente/aprovada e privacidade
homologadas. Entrega 7 vincula acesso ao curso à ordem de cobrança e revoga
após reembolso (provedor simulado). Entrega 8 remove demos, exige vínculo
conta/pessoa, valida aula/curso/entitlement e grava conclusão/medalha de modo
transacional; eventos receberam inscrição, pagamento e check-in protegidos.
Entrega 9 protege também a administração, publicação, módulos e aulas; preserva
progresso pela despublicação e fecha mutação direta. Faltam conteúdo real,
aparelhos e provedor financeiro.
Entrega 18 fecha o ciclo operacional de vínculos da rede e sua fronteira de
privacidade. Entrega 19 completa os indicadores do cron com agregações reais,
isolamento por instituição, cobertura e data visíveis; falta capacitação herdada.
Jovens, workflows, analytics avançado, missões
e capacitação ampla em rede devem receber histórias e aceite antes de entrar
na estimativa. Não anunciar toda a Camada 2 como entregue.

## Fechamento de uma entrega

Agrupar histórias maiores, mirando entregas de 7–10 pontos quando o trabalho
validado justificar, conforme solicitação do usuário. Não aumentar indicador
apenas para atingir a faixa. Guardar evidência no repositório: commit, cenário, ambiente, resultado e
limitações. Atualizar este backlog e a linha de base de porcentagem somente
quando houver nova implementação/validação. Build, publicação e homologação
são estados diferentes. Nenhum repositório ou domínio foi alterado nesta entrega.
