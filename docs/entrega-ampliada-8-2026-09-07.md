# Entrega ampliada 8 — comunicação, EAD e eventos confiáveis

Data: **07/09/2026**  
Estado: **validada localmente, sem publicação nesta entrega**  
Avanço estimado: **88,05%**, ganho de **4,35 pontos percentuais**.

## Resultado entregue

Esta entrega remove resultados fictícios e fecha operações sensíveis que ainda
eram gravadas diretamente pelos clientes.

- WhatsApp manual agora prepara no servidor somente destinatários ativos da
  igreja, com telefone válido e sem opt-out. Abrir a conversa não conta como
  envio: o histórico só muda para confirmado após o líder selecionar quem
  efetivamente recebeu a mensagem e confirmar a ação.
- Campanhas possuem repetição segura por `requestId`, auditoria e limite de 100
  destinatários. Telefones crus não são enviados a um endpoint Twilio e não são
  persistidos no histórico exibido ao cliente.
- A pessoa pode retirar ou reautorizar o contato por WhatsApp no próprio perfil.
- EAD da igreja e capacitações pagas gravam progresso por uma API autenticada,
  que deriva a pessoa do vínculo confirmado da conta. Aula, curso e entitlement
  são conferidos no servidor; conclusão e medalha são transacionais e idempotentes.
- Cursos demonstrativos deixaram de aparecer como conteúdo real. A escola mostra
  um estado vazio até a igreja publicar um curso.
- Inscrição de membro, visitante presencial, confirmação de pagamento e check-in
  de evento passam por uma API transacional. Capacidade, papel, pagamento e
  repetição são validados no servidor, com auditoria.
- O ingresso usa QR real com `eventId|registrationId`; o leitor rejeita código de
  outro evento. O aplicativo usa as mesmas APIs de inscrição e progresso.
- URLs de vídeo no gerenciador de cursos aceitam apenas HTTPS em YouTube, Vimeo
  ou Cloudflare. Falhas de gravação não removem itens nem exibem sucesso otimista.
- Regras do Firestore fecham escrita direta em campanhas, progresso, medalhas,
  inscrições, pagamentos e presença. A exceção operacional genérica deixou de
  alcançar a árvore `events`, que anulava as regras específicas.
- Foram removidos os repositórios clientes, mocks e o endpoint Twilio sem uso que
  conflitavam com os fluxos canônicos.

O plano gratuito continua com **50 membros**.

## Evidências

- `corepack pnpm test`: **318 testes em 23 arquivos**.
- `corepack pnpm typecheck`: **13 projetos aplicáveis**.
- `corepack pnpm qa:delivery8`: **43 verificações** de autenticação, opt-out,
  destinatários, idempotência, vínculo pessoa/conta, entitlement, capacidade,
  pagamento, check-in, auditoria e negação de escrita direta.
- Regressões: entrega 7 com **136 verificações**, entrega 6 com **91** e cadastro
  concorrente de 49 para 50 membros.
- Build OpenNext do painel, export Expo iOS/Android com **766 módulos** em cada
  plataforma, dry-run Wrangler da API e build estático da LP passaram.
- QA no navegador confirmou os estados finais de Comunicação, Eventos e Escola
  EAD, sem realizar envio externo.
- `git diff --check` sem erros.

## Cálculo do avanço

Os pesos e o método definidos no diagnóstico inicial foram preservados.

| Frente | Antes | Depois | Evidência creditada |
| --- | ---: | ---: | --- |
| Fundação | 90 | 92 | Regras específicas e regressões ampliadas. |
| Pessoas | 92 | 93 | Preferência de WhatsApp e identidade reutilizada no EAD. |
| Operação web | 92 | 97 | Eventos, EAD e comunicação sem sucesso ou dados fictícios. |
| Mobile | 80 | 88 | Inscrição e progresso mediados pelo servidor nas duas plataformas. |
| Comunicação e IA | 73 | 85 | Campanha manual auditável, destinatário autorizado e opt-out. |
| Tribos, jornadas, EAD, rede e marketplace | 65 | 82 | Progresso real, entitlement e medalha; demos EAD removidas. |

`83,70 + (10×2 + 15×1 + 15×5 + 15×8 + 10×12 + 5×17) / 100 = 88,05%`.

O pacote é amplo, mas o ganho ficou abaixo da faixa desejada de 7–10 pontos
porque envio por provedor, aparelhos físicos e integrações externas não podem
receber crédito apenas por código local.

## Limites que permanecem

- WhatsApp é manual: a plataforma prepara as conversas e registra confirmação
  humana. Entrega, leitura, retry e webhook dependem de um provedor oficial.
- Push e email de campanha permanecem indisponíveis; registrar Expo Push Token
  não comprova entrega de mensagem.
- Eventos ainda precisam de homologação de câmera em aparelho, página pública
  específica e integração bancária. O crédito manual exige confirmação do líder.
- EAD precisa de conteúdo real, QA com conta de membro vinculada e homologação
  em aparelho. Exclusão de curso ainda envolve várias gravações clientes e deve
  migrar para operação atômica antes de uso intenso.
- Asaas real, migrações legadas, inventário remoto Kids, Turnstile, lojas e CI
  remoto continuam fora da comprovação local desta entrega.

## Próximo marco

Homologar em ambiente coordenado os fluxos já protegidos: aparelhos, câmera,
conta de membro vinculada, sandbox Asaas e migrações legadas. Em paralelo,
implementar o primeiro canal de comunicação com entrega comprovável e consentida,
sem alterar o limite gratuito.
