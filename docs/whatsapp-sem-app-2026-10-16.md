# Participação sem aplicativo — WhatsApp e portal público

Implementação de 16/10/2026. O código mantém o painel e o app; acrescenta caminhos no navegador e na API oficial do WhatsApp que usam as mesmas coleções de eventos, visitantes, presença e pedidos de cuidado.

## Percursos implementados

- `/p/{slug}`: portal com agenda, contribuições, recepção, cuidado e vínculo do WhatsApp.
- `/p/{slug}/visit`: cadastro sem conta, protegido por Turnstile; triagem pela recepção antes de criar pessoa/jornada/tarefas. O consentimento negativo é preservado na integração ao cadastro.
- `/p/{slug}/care`: pedido privado, sem conta, em `prayerRequests`; não publica no mural.
- `/p/{slug}/events`: inscrição sem conta, limitada à capacidade, idempotente e deduplicada pelo telefone dentro do evento. Evento pago permanece com pagamento pendente. Nenhum pagamento é executado pelo bot.
- `/p/{slug}/connect`: vínculo de uso único para membros. Exige conta autenticada no navegador e vínculo pessoa/conta já conferido pela secretaria. Não exige instalação do aplicativo. Código aleatório de 128 bits, expiração de 10 minutos e uso único; gerar novo código invalida o anterior.
- WhatsApp: `MENU`, `AGENDA`, `VISITANTE Nome`, `ORACAO pedido`, `INSCREVER id`, `CONFIRMAR`, `CANCELAR`, `HUMANO`, `SAIR`, `VOLTAR`, `VINCULAR código`, `MINHA CELULA`, `PRESENCA grupo encontro` e `DUVIDA pergunta` (opcional com IA).
- Presença: somente do próprio membro vinculado, em célula à qual pertence, dentro de uma janela de três horas do encontro; não sobrescreve chamada já registrada pela liderança. O registro identifica `selfReported` e origem WhatsApp. Consulta de encontros limitada a 100 células e 30 encontros agendados por célula; a liderança continua podendo registrar presença pelo painel.
- Atualização cadastral e busca de célula encaminham à equipe humana. O bot não altera cadastro com base apenas no telefone.

## Configuração da plataforma (servidor web)

Segredos devem ser configurados no ambiente do servidor/Worker web. Nunca usar `NEXT_PUBLIC_` para tokens ou gravá-los nas configurações da igreja.

| Variável | Finalidade |
|---|---|
| `PUBLIC_APP_ORIGIN` | Origem HTTPS canônica do painel, sem caminho. Base dos links enviados pelo bot. |
| `WHATSAPP_APP_SECRET` | App Secret da aplicação Meta para verificar HMAC-SHA256 do corpo original. |
| `WHATSAPP_VERIFY_TOKEN` | Segredo escolhido pela plataforma para o desafio GET do webhook. |
| `WHATSAPP_GRAPH_VERSION` | Versão da Graph API suportada pela conta, formato `vNN.N`; não há versão fixa no código. |
| `WHATSAPP_PROCESS_TOKEN` | Segredo longo e aleatório para o processador periódico. |
| `WHATSAPP_CHANNELS_JSON` | Lista de números autorizados e seus vínculos de organização. |

Formato de `WHATSAPP_CHANNELS_JSON` (valores ilustrativos, não credenciais):

```json
[
  {
    "organizationId": "org_exemplo",
    "phoneNumberId": "123456789012345",
    "publicPhone": "5562999990000",
    "accessToken": "CONFIGURAR_COMO_SEGREDO",
    "templates": ["lembrete_evento"]
  }
]
```

Um número por igreja e um vínculo por número nesta versão. Duplicidades são rejeitadas. O `phone_number_id` do webhook é resolvido exclusivamente nesta lista; um `organizationId` recebido no corpo jamais seleciona a igreja. Usar números habilitados na WhatsApp Business Platform e templates já aprovados para o idioma e componentes definidos. A implementação suporta texto e parâmetros textuais no corpo de templates; templates com cabeçalho/mídia/botões parametrizados não estão incluídos.

Configure na Meta o callback HTTPS `/api/whatsapp/webhook`, o verify token e a assinatura do campo `messages`. O POST valida `X-Hub-Signature-256` antes de interpretar o JSON. Referências primárias: [verificação de webhooks](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/webhooks/start/) e [mensagens de texto](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/messages/text/). O SDK antigo é arquivado; não foi instalado ou utilizado. O envio usa HTTP diretamente na Graph API configurada.

## Configuração pela igreja

Na tela **Comunicação → Participação pelo WhatsApp**, a equipe pode:

- configurar nome, saudação, Bíblia, pastores, história, projetos, contribuições e preferências da assistente;
- ativar/desativar atendimento, IA geral, eventos, cuidado, visitantes e presença;
- ver conversas, assumir atendimento humano e encerrá-lo;
- enviar texto na janela de atendimento ou template aprovado, inclusive com agendamento;
- conferir estados da fila e processar pendências manualmente.

Todos os recursos automáticos começam desativados. A indicação “configurado” confirma a presença da configuração local; não prova validade do token nem homologação do número.

## Processamento periódico

O Worker `apps/worker-api` mantém o cron diário de snapshots e ganha um cron por minuto para a fila do WhatsApp. Quando não há configuração, este cron não faz requisições.

Configurar no Worker:

- `WHATSAPP_PROCESS_ORIGIN`: mesma origem HTTPS do painel;
- `WHATSAPP_PROCESS_TOKEN`: mesmo segredo configurado no servidor web;
- `WHATSAPP_PROCESS_ORGANIZATIONS`: opcional, IDs separados por vírgula. Para mais de 20 canais, distribuir por organização é obrigatório; o endpoint não aceita percorrer silenciosamente só as primeiras igrejas.

O cron chama `POST /api/whatsapp/process`. Também há botão de processamento manual na Comunicação. A fila processa lotes pequenos; não é um serviço de campanhas em massa.

## Estados, recuperação e privacidade

- `pending` → `sending` → `accepted` → `sent` → `delivered` → `read`.
- `failed`: recusa explícita do provedor; `uncertain`: timeout/erro com resultado desconhecido; `sending` persistente pode indicar interrupção após o envio. Não repetir automaticamente esses registros. Conferir no provedor antes de uma nova tentativa explícita.
- `blocked`: opt-out, automação desativada ou template não permitido; `expired`: texto fora da janela de atendimento.
- Callbacks atrasados não rebaixam mensagem lida/entregue. Recibos que chegam antes da confirmação local são preservados.
- Reentrega do webhook não repete a operação nem um envio já aceito/incerto. O recibo do pedido é persistido antes da resposta.
- A interface não apresenta abertura de `wa.me` como envio ou entrega. Atalhos internos passam por conferência atual de opt-out no servidor.
- Conversas não dão acesso a outras pessoas ou cadastros. Histórico no contato guarda até 20 entradas; o servidor restringe sua consulta à equipe autorizada.
- Pedidos de oração não são enviados automaticamente à IA ao abrir a tela. Gerar sugestão exige ação da liderança e informa o uso de Gemini/Groq. `DUVIDA` usa IA apenas para informações gerais e consome a mesma cota mensal da igreja. Não há interpretação de áudio nesta versão; mídia encaminha para atendimento humano.
- O contexto institucional é aplicado também às tarefas de IA existentes. Campos livres são referências subordinadas às regras do sistema e não autorizam operações.
- `whatsapp*`, `participationAttempts` e `settings/pastoralAssistant` possuem acesso direto restrito; publicar `firestore.rules` e `firestore.indexes.json` faz parte da implantação.

## Implantação e homologação

1. Executar testes, typecheck e build; publicar as regras e o índice `whatsappOutbox(status, scheduledAt)` do Firestore junto com a API e interface.
2. Provisionar os segredos do web e do Worker, vincular o webhook na Meta e ativar apenas a igreja de homologação.
3. Com um número de teste permitido, validar menu, confirmação/cancelamento, cadastro de visitante, cuidado privado, inscrição e opt-out.
4. Com conta de teste vinculada à pessoa, validar código de uso único, revogação de vínculo e presença somente na própria célula.
5. Conferir status reais de entrega/leitura, expiração de janela, template aprovado e agendamento pelo cron.
6. Somente depois anunciar quais operações estão disponíveis pelo WhatsApp. O número real e a entrega na Meta não são comprovados por mocks locais.

Os fluxos de cadastro público mantêm triagem humana; o bot não transforma automaticamente todo telefone em membro. Formulário/WhatsApp é um canal adicional sobre o produto existente.

## Validação concluída nesta entrega

- Regressão: **515 testes aprovados em 52 arquivos** (`corepack pnpm exec vitest run`).
- Typecheck de todos os pacotes, web, mobile e Worker aprovado (`corepack pnpm typecheck`).
- Build de produção Next.js aprovado; build OpenNext/Cloudflare aprovado (`corepack pnpm build:cloudflare:web`). O aviso preexistente de migração de middleware para proxy permanece.
- `corepack pnpm qa:whatsapp` aprovado com Firestore e Auth reais nos emuladores e Graph API simulada. Valida confirmação/cancelamento, duplicidade, cuidado privado, visitante, inscrição, opt-out, última vaga concorrente, rejeição de igreja inválida, vínculo verificado e presença própria.
- As regras reais do emulador negaram a um membro comum leitura de conversas, configurações privadas e tentativas de participação.
- Navegador: pedido privado enviado e confirmado, inscrição sem login com comprovante, configuração institucional salva e aviso de conexão pendente conferidos.
- Nenhuma mensagem real foi enviada. Não houve publicação em produção ou configuração de credenciais Meta nesta entrega. A ativação depende do provisionamento do número, dos segredos, da publicação das regras/índice e do teste com o provedor real.
