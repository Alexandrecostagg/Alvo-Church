# Entrega ampliada 7 — finanças, cobrança, IA e retenção Kids

Data: 05/09/2026. Base: `850e7d0`, branch `codex/consolidacao-local-2026-09-05`.
Implementação e homologação locais. Gratuito mantém **50 membros**.
Avanço gerencial: **76,65% → 83,70% (+7,05 pontos)**, mesmos pesos e escopo.
Não representa prontidão para produção, percentual de tempo ou todo o PRD.

## Comportamento entregue

### Doação e financeiro

Web público, ficha administrativa e aplicativo declaram contribuições pela API.
A identidade autenticada vem do vínculo confirmado; o público usa slug registrado
e segredo criptográfico com validade de 48 horas, armazenado apenas como hash.
Repetição do mesmo pedido não cria outra contribuição. Valor tem validação de
centavos; campanha precisa pertencer à igreja. Consentimento começa desmarcado.
A declaração fica pendente até conferência administrativa, sem alegar pagamento.

JPEG/PNG até 500 KB é armazenado em caminho privado sem download token. Leitura
mediada por API verifica administração; regras negam leitura direta do objeto e
da coleção de comprovantes. Repetição e falha de gravação tratam o upload próprio.
PIX depende da configuração real; a página recebe somente a projeção pública
necessária. Configurações mostram links com slug e três QR reais.

Conferência exige referência e confirmação do extrato. Transação vincula
contribuição, ledger, campanha, intenção e auditoria; referência bancária é única
por igreja. Rejeição não cria receita. Lançamento manual exige API/idempotência;
anulação exige motivo e preserva histórico. Escritas financeiras diretas foram
fechadas. Fluxos antigos sem consumidores foram removidos do repositório Firebase.

Relatório mensal agrega centavos, exclui anulados e não conta contribuição e seu
ledger duas vezes. CSV inclui origem/referência e neutraliza fórmulas em células.
Mais de 1.000 registros por origem/mês resulta em erro explícito, sem exportação
parcial. Painel informa seu recorte de 500 lançamentos e 200 contribuições;
saldo exibido não substitui extrato bancário. Metas passam a usar campanhas reais.

### Cobrança SaaS e cursos

Checkout usa preço/plano do servidor, igreja e e-mail autorizados. Ordem durável
registra as etapas antes de criar cliente/assinatura/cobrança no Asaas. Se a
resposta se perde, uma nova tentativa consulta a referência externa; não repete
automaticamente POST com resultado incerto. Checkout não ativa o plano.

Webhook exige token próprio, verifica pagamento no provedor e vínculo com ordem,
cliente, recurso e valor. Registra evento/fingerprint e atualização atomicamente;
repetições, eventos antigos, cancelamento e reembolso são tratados. Carência não
reinicia a cada evento vencido. Curso recebe acesso pela ordem e perde acesso no
reembolso. Fatura é consultada por administrador e filtrada pelo recurso vinculado.

O adaptador de QA é injetado no teste, sem chamada ao Asaas ou chave real.
Referência legada de igreja conhecida retorna 409 para revisão/migração; referência
sem vínculo conhecido é ignorada sem ativar plano. Isso exige migração antes do
rollout: não instalar o novo webhook sobre assinaturas antigas sem preparação.

Referências consultadas: [eventos de assinatura](https://docs.asaas.com/docs/eventos-para-assinaturas),
[repetições e comportamento de webhooks](https://docs.asaas.com/docs/faq-de-webhooks)
e [consulta de assinaturas](https://docs.asaas.com/reference/listar-assinaturas).
Esses documentos orientaram o protocolo; os testes não comprovam sandbox real.

### IA

Texto, texto de banner e imagem agora compartilham `aiUsage` por mês UTC e os
mesmos limites comerciais existentes. Há frequência persistente por igreja
(10/minuto) e usuário (3/minuto), autorização por tarefa, plano e situação de
cobrança. Tarefa pastoral completa exige plano e papel apropriados; arte exige
liderança. Entrada inválida/provedor não configurado não inicia consumo.

Tentativa iniciada consome unidade mesmo se o provedor falhar: não há devolução
que permita repetir custo incerto. Auditoria guarda ator, tarefa, janela e estado,
sem prompts ou resultados. Interface explica texto/imagem como usos separados e
não repete automaticamente geração da imagem. Respostas usam limite de entrada,
erros privados e imagem limitada a 5 MB. Cliente não pode zerar os contadores.

### Kids

Retirada com foto marca elegibilidade para retenção. Administração escolhe
7/30/90/365 dias, revisa lote de até 50 retiradas antigas e confirma remoção.
Fingerprint impede executar prévia alterada. Objeto privado é removido antes de
limpar a referência; falha mantém referência para tentativa posterior. Registro
de custódia e auditoria permanecem. Foto de criança ainda presente não é elegível.
URLs externas antigas geram indicação de limpeza na origem, sem alegar exclusão
física de um serviço externo. Não há agendamento automático nesta entrega.

## Validação e evidências

- 301 testes unitários em 21 arquivos; checagem de tipos dos pacotes aplicáveis.
- `qa:delivery7`: 136 verificações HTTP, Firestore, regras e Storage; adaptador
  Asaas simulado para perda de resposta, repetição, vínculo, eventos e curso.
- Regressões: Passe 78, custódia Kids 77, mídia Kids 62, entrega 6 com 91;
  total 444 verificações numeradas, mais cadastro/concorrência no limite 49→50.
- Cota IA 49→50 disputada entre três tarefas: só uma obtém a última unidade;
  plano gratuito, papéis, suspensão, frequência e proteção dos contadores testados.
- Navegador: lançamento fictício de R$12,35, CSV e anulação com motivo; doação
  pública de R$20 pendente → conferência → um ledger; opt-out mantido; links/QR
  reais de configuração; prévia e remoção de foto Kids antiga com histórico.
- Fixtures exclusivas do teste removidas; configuração PIX anterior restaurada.
- Builds finais: OpenNext do painel, export Hermes iOS/Android e build estático
  da LP. Logs locais em `/tmp/alvo-d7-*.log`; sem artefatos/chaves versionados.
- Roteiro da entrega 7 incluído no CI versionado; execução remota ainda pendente.

## Estimativa com pesos preservados

F/I/S/V: funcionalidade até 40, integração até 25, proteção até 20, validação
até 15. Incrementos refletem evidências específicas desta entrega.

| Frente | Peso | Antes | Depois (F/I/S/V) | Evidência creditada |
| --- | ---: | ---: | --- | --- |
| Fundação | 10 | 88 | 90 (35/23/19/13) | Regras financeiras e rotina QA/CI ampliada. |
| Pessoas | 15 | 91 | 92 (37/25/19/11) | Declaração na ficha com identidade e erro validados. |
| Operação web | 15 | 85 | 92 (38/25/18/11) | Conferência, anulação, CSV, estados reais, links e QR. |
| Kids | 10 | 88 | 92 (39/24/18/11) | Remoção assistida, prévia, exclusão física e auditoria. |
| Esdras Passe | 5 | 65 | 65 (30/20/10/5) | Mantido; regressão sem crédito de funcionalidade nova. |
| Mobile | 15 | 75 | 80 (38/24/12/6) | Doação pela API e comprovante privado, falhas e export. |
| LP | 5 | 70 | 70 (35/18/9/8) | Mantido; nenhuma migração ou nova aquisição. |
| SaaS/finanças | 10 | 66 | 86 (36/24/17/9) | Ordem/webhook, ledger, recibo privado e testes simulados. |
| Comunicação/IA | 10 | 50 | 73 (28/20/17/8) | Quota unificada, autorização, auditoria e concorrência. |
| Expansão | 5 | 61 | 65 (30/17/10/8) | Vínculo/revogação de curso por cobrança; EAD não fechado. |

Cálculo: `76,65 + (10×2 + 15×1 + 15×7 + 10×4 + 15×5 + 10×20 + 10×23 + 5×4)/100 = 83,70%`.
Margem de julgamento aproximada de 10 pontos; decimais tornam a fórmula auditável,
sem representar precisão estatística. Nenhum crédito por envio de comunicação,
Asaas real, aparelho, publicação, CI remoto ou novas funcionalidades de Passe/LP.

## Pendências e preparação para publicação

1. Homologar Asaas em sandbox real; inventariar/migrar referências legadas antes
   de ativar o webhook. Troca/cancelamento self-service e recuperação de POST
   incerto sem correspondência única exigem atendimento; cobrança deletada cujo
   recurso já retorna 404 requer tratamento assistido. Não migrar por valor/preço.
2. Coordenar backend, Firestore/Storage rules, índice de retenção, web e versão
   mínima mobile. Apps antigos com escrita financeira direta serão recusados.
   Nenhuma dessas alterações foi publicada nesta entrega.
3. Inventariar fotos Kids antigas sem `photoRetentionPending`, URLs externas e
   comprovantes legados grandes; definir migração e retenção de comprovantes.
   Não houve varredura remota nem reconciliação de objetos órfãos. Se falhar também
   a limpeza de um upload cujo commit falhou, pode restar objeto para saneamento.
4. Validar câmera/QR/fotos, rede instável e revogação em aparelhos; fechar relação
   familiar cadastral Kids e validação integral do Passe em parceiros.
5. PIX é estático e conferência é humana. Integração bancária, doação recorrente,
   carta fiscal, OFX e relatórios contábeis completos continuam fora desta entrega.
6. Giving usa cotas persistentes por origem/janela e total da igreja. Turnstile
   segue pendente. Token público perdido após recarga ou expirado exige nova
   tentativa/contato com a secretaria; não há recuperação pública de comprovante.
7. IA precisa de homologação real de geração/custos. Comunicação precisa de
   destinatários, opt-out completo e entrega comprovada; EAD/eventos precisam de
   auditoria de dados/fluxos. Não houve envio, cobrança ou geração paga real.

Próximo pacote local: comunicação e auditoria de EAD/eventos, junto à preparação
dos procedimentos de migração/homologação. Mobile continua no monorepo; LP segue
candidata à extração após consolidação de sua fonte e entrada por domínio.
