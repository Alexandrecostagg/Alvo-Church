# Campanhas de convidados

Implementação local iniciada em 03/11/2026. Novas campanhas usam envio manual assistido por padrão, sem chamada à API da Meta. A retomada da conexão Meta continua em `whatsapp-meta-retomada.md`; a opção de automação paga permanece separada e não é provisionada por este módulo.

## Uso

1. Publique um evento gratuito, futuro, com nome, local, data e capacidade revisados.
2. Em Eventos → Campanhas de convites (ou Convites no menu), crie o rascunho. Escolha Manual assistido e informe o WhatsApp da igreja usado pela equipe. Defina a abertura dos convites, o primeiro lembrete, o intervalo de 1 a 30 dias, o horário/fuso e as metas. Confira o calendário: até 15 mensagens por convidado nos 90 dias anteriores ao evento, encerrando até a véspera. Revise cada texto e sua versão para presença confirmada. A opção API automática possui configuração e teto separados.
3. Salve o rascunho e marque a revisão dos textos e do calendário antes de publicar. A abertura ocorre automaticamente na data configurada; antes dela o membro vê a data, mas não consegue criar o convite e a inscrição pública fica bloqueada. Conteúdo e dados do evento ficam fixos. Mudanças no evento bloqueiam novas inscrições e envios: pause a campanha e prepare outra. O administrador continua conseguindo consultar os registros.
4. Membros com vínculo de conta validado criam seu próprio link em Meus convidados, pela web ou pelo app mobile. O membro vê apenas o primeiro nome e a resposta quando a pessoa autoriza; telefones ficam com a equipe.
5. O convidado abre o link, informa nome/telefone e escolhe separadamente se deseja lembretes e compartilhar sua resposta. A inscrição não depende de baixar app ou aceitar mensagens. Ele recebe uma página pessoal para responder e um QR diferente para a pulseira/recepção.
6. A página pessoal permite confirmar, recusar, pedir atendimento, interromper mensagens e imprimir uma faixa com QR. Guarde esse endereço; é uma credencial pessoal. O QR da pulseira não permite alterar a resposta nem consultar dados sem autenticação da equipe.
7. A equipe registra orações e contatos no painel. No dia, pode ler a pulseira pela câmera, leitor conectado ou colar o código INV. Confira e confirme o check-in. Janela: 12 horas antes até 24 horas depois. A capacidade do evento é respeitada; o registro vai para a inscrição do evento e a ficha de visitante, sem transformar a pessoa em membro.

## Envio manual assistido

- A fila do dia fica disponível a partir do horário escolhido, até o fim do dia local, apenas nas datas do calendário e com a campanha ativa. Não acumula lembretes de dias passados.
- A equipe escolhe Preparar mensagem, confere destinatário, texto e conta da igreja aberta no WhatsApp/WhatsApp Web, abre a conversa com texto preenchido (ou copia) e toca em Enviar no próprio WhatsApp. O link não escolhe nem comprova a conta remetente.
- A autorização do cadastro é necessária. Não há dependência de webhook para comprovar o número no modo manual; a equipe confere o destinatário. Cancelamento, desistência, comparecimento, atendimento pendente e preferências globais impedem novas preparações.
- A primeira mensagem informada como enviada para cada pessoa apresenta quem a convidou, mesmo em inscrição tardia. As demais usam o texto do dia e a versão para presença confirmada.
- Preparar, abrir a conversa e copiar não contam como envio. Já enviei exige declaração explícita da equipe; o histórico registra autor, etapa e horário. Isso não comprova entrega ou leitura. Pular hoje não impede etapas futuras.
- A reserva dura 10 minutos e impede que duas sessões preparem o mesmo contato simultaneamente. Uma reserva expirada pode ser retomada; a anterior não pode concluir a nova reserva. A finalização é idempotente. Paginação em lotes de 50 mantém acesso aos mais de 800 convidados.
- A equipe lê as respostas no WhatsApp e usa Registrar resposta recebida para confirmação, desistência, atendimento ou SAIR. SAIR também marca o opt-out global do número nessa instituição; a equipe não pode reativar consentimento pelo formulário administrativo. O próprio convidado continua podendo responder/cancelar pela página pessoal.
- Nenhuma mensagem é enviada em segundo plano, nenhum modelo Meta é exigido e nenhuma tarefa é criada na caixa da API para inscrições manuais. O custo/limite de IA do plano permanece separado. O trabalho de tocar em Enviar continua humano em cada contato.
- Campanhas antigas sem modo explícito preservam seu comportamento de API. Rascunhos podem trocar para Manual assistido; campanhas abertas mantêm o modo e conteúdo fixos.
- Referência oficial do link de conversa e texto preenchido: https://faq.whatsapp.com/5913398998672934/?locale=pt_BR.

## API automática e retomada da Meta

- A autorização no formulário não prova a posse do telefone. Quando houver canal oficial, o convidado deve abrir o WhatsApp pela sua página e enviar `CAMPANHA <código pessoal>`. O webhook com assinatura validada verifica o número remetente exato.
- Respostas: `CONFIRMAR CONVITE`, `RECUSAR CONVITE`, `FALAR COM A EQUIPE`, `SAIR`. Mensagens livres dentro da conversa da campanha vão para atendimento humano e pausam os lembretes; não são enviadas à IA.
- A primeira mensagem efetivamente entregue menciona o membro que convidou. As seguintes usam a versão de texto correspondente à resposta atual. A aceitação pela API não é tratada como entrega.
- Conclua o provisionamento seguro do canal por instituição, os requisitos atuais da Meta e a assinatura do webhook. Cadastre os modelos no WhatsApp Manager com o texto numérico e a ordem de variáveis exibidos no painel. Vincule os nomes e inclua-os na lista permitida do canal. A plataforma não cria nem presume aprovação de modelos.
- Envios requerem módulo Comunicação habilitado, canal com `paidMessagesEnabled`, modelos permitidos e autorização explícita do teto por campanha. Teto é quantidade de tentativas; não estima nem substitui a cobrança do provedor. Falhas e resultados incertos podem consumir o teto.
- No máximo 10 campanhas com envios simultâneos por instituição. O processador existente roda a cada minuto, prepara até 20 etapas por campanha e tenta até 10 mensagens por instituição. Em uma campanha isolada de 800 convidados elegíveis, o limite nominal exige pelo menos 80 minutos; há janela de 4 horas, sujeita ao provedor e às demais mensagens da instituição.
- As etapas seguem as datas do calendário, no fuso da igreja. Intervalo 1 significa diário; 2 significa dia sim, dia não; 7 significa semanal. A frequência e o período escolhidos constam da autorização do convidado. Inscritos tardios não recebem dias anteriores. Etapas com mais de 4 horas de atraso são descartadas. Convidados sem prova do telefone, com pedido de atendimento, desistência, comparecimento ou opt-out não recebem.
- Preferências globais do contato também impedem envio. Concluir um atendimento de campanha limpa o atendimento global apenas se a conversa corresponder àquele convidado e campanha. VOLTAR no atendimento geral não desfaz o opt-out de uma campanha.
- Não há reenvio automático de mensagens em estado incerto. A equipe deve reconciliar com o provedor antes de qualquer ação manual.

## Persistência e autorização

Campanhas e convidados ficam em `organizations/{org}/invitationCampaigns/{campaign}/guests`. Convites de membros, tentativas de inscrição, tickets, planejamento, recibos e auditoria são escritos somente pelo servidor. As regras Firestore permanecem fechadas para os clientes. Identificadores públicos são aleatórios e guardados por hash nas coleções de resolução; telefone e identidade do convidado não aparecem no QR.

Contadores são distribuídos em 16 documentos por campanha. A lista administrativa é paginada em lotes de 50, com cursor por ID; não limita o total a 50. O membro vê até 200 inscrições do próprio convite com indicação de mais registros. A Recepção apresenta os cadastros mais recentes; o painel da campanha mantém a lista completa.

O planejamento é separado da caixa de saída WhatsApp. IDs determinísticos, transações e conferência final de consentimento, estado, prazo, modelo e teto evitam duplicidade e envios após cancelamento. A aceitação, entrega e leitura têm recibos idempotentes. Antes de publicar, inclua os índices novos de `campaignDeliveries` presentes em `firestore.indexes.json`.

## Validação

- `pnpm qa:campaigns`: contratos HTTP/autenticação, inscrição, privacidade entre membros e igrejas, confirmação de telefone, respostas, fila, orçamento, recibos, opt-out, check-in, capacidade, regras de cliente, paginação e cadastros tardios.
- `pnpm qa:campaigns --scale`: mesma validação com 800 novos convidados fictícios e 12.000 etapas, além das pessoas usadas nos casos de teste.
- Ambos exigem emuladores `demo-alvo-qa`, bloqueiam toda rede externa e limpam seus próprios registros. Em QA local o dispatcher de campanhas grava `test_mode` e não chama o provedor.
- Testes de domínio estão em `packages/domain/src/invitation-campaign.test.ts`. Os contratos entram na rotina `scripts/qa-ci.mjs`.
- A leitura por câmera e o recebimento real em aparelhos/WhatsApp exigem reteste com equipamento e canal oficial. Bundles mobile não equivalem a uma instalação de loja.

## IA para variar a sequência

O bloco Criar textos variados com IA recebe objetivo, tom e dias restantes de cada etapa. Não consulta nem envia a lista de convidados, nomes de membros, telefones ou respostas. Os campos {{convidado}}, {{membro}}, {{igreja}}, {{evento}}, {{data}}, {{horario}} e {{local}} continuam sendo preenchidos localmente pelo servidor na preparação de cada envio individual.

A Sabedoria Pastoral usa os provedores existentes (Gemini/Groq) e sua cota compartilhada: uma geração da sequência inteira consome uma unidade; tentativas iniciadas no provedor também contam em caso de falha. A prévia contém dados fictícios, e Aplicar ao rascunho não salva nem envia mensagens. A igreja precisa revisar, aprovar e salvar os textos.

São rejeitadas respostas incompletas, etapas fora de ordem, assuntos/textos repetidos, campos desconhecidos, telefones/links inventados e uso de amanhã fora da véspera. A validação não substitui a revisão humana. Em falhas, os textos anteriores são preservados. Mudanças nos textos removem o nome do modelo correspondente; a IA nunca cria nem aprova modelos na Meta.

A identificação da igreja, o nome do convidado, o membro na primeira etapa e a opção SAIR são acrescentados pelo aplicativo. A IA escreve o texto central de assuntos distintos. A orientação sobre mostrar o QR à recepção é inserida pelo aplicativo em uma etapa próxima ao encontro, sem delegar esse fluxo à IA. Uma resposta inválida permite uma única tentativa automática de correção dentro da mesma unidade de cota (usando o modelo maior existente no Groq quando configurado); persistindo o erro, nenhum texto é substituído. A primeira mensagem usa a data absoluta do evento, pois também atende quem se inscreveu depois do início da sequência.

O contrato de envio permanece o dos modelos aprovados, com parâmetros individuais. A IA ajuda a escrever os modelos antes de sua aprovação; não pode substituir livremente o corpo aprovado a cada envio fora da janela de atendimento. Referência oficial consultada em 03/11/2026: https://whatsappbusiness.com/policy/.
