# Entrega 4 — QR e fotos privadas Kids

Implementação local em 05/09/2026. Não houve deploy, alteração de bucket remoto,
push ou teste em aparelhos. Gratuito permanece com **50 membros**.

## Mudanças

`GET /api/kids/qr?data=...` foi desativado (410 e `private, no-store`). Web e app
usam POST autenticado com organização, ID do check-in e tipo de mídia. O servidor
consulta o cadastro e gera o QR; não aceita um segredo arbitrário informado pelo
cliente. Resposta traz imagem em data URL e validade de 60 segundos, sem foto,
nome, alergia ou dados de terceiros misturados ao QR.

Responsável, pessoa autorizada e operador Kids podem consultar mídia de um
check-in ativo. O servidor respeita os cargos operacionais e `qrGeneratorRoles`,
e revalida a autorização depois de carregar/gerar a imagem. Conta/igreja inativa,
retirada, cancelamento ou remoção do vínculo impedem uma nova consulta.

Web e app descartam a imagem antes de atualizar, ao ocultar/suspender a tela e
na troca de identidade; consultam novamente a cada 30 segundos em primeiro plano.
Falha de rede não mantém a imagem anterior. Isso não impede capturas de tela:
a retirada precisa validar o check-in atual, nunca apenas a imagem impressa.

Fotos novas são JPEG/PNG de até 500 KB, anexadas por operador com confirmação da
autorização do responsável. A API limita o corpo antes de interpretar JSON e
verifica formato/MIME/assinatura básica. Não é uma análise biométrica nem um
serviço de sanitização completa da imagem.

O arquivo fica em `kids-private/{org}/{hash-do-checkin}/{uuid}` no Storage;
nenhuma URL ou download token permanente é emitido. O hash evita expor o ID/token
em caminhos de registros mobile antigos. Novos check-ins mobile já têm ID separado
do segredo. Regras Storage negam acesso direto ao namespace, inclusive de admins;
a API usa uma credencial de serviço e verifica cada leitura. Metadados do objeto
e respostas HTTP são privados e não cacheáveis.

`photoPath`, `photoUrl`, consentimento e autor de upload não podem ser forjados
pelo cliente Firestore. Upload substitui o arquivo anterior; remoção exclui o objeto e revoga a
referência, preservando a possibilidade de repetir após falha do Storage e
recusando limpar uma referência que foi substituída durante a operação. Fotos legadas embutidas ou em URL não são exibidas;
upload/remoção elimina o campo legado daquele check-in, sem varrer produção.

Painel: anexo/remoção no crachá recém-criado e na identificação de retirada.
App: captura local, upload após a entrada persistida e leitura privada nas telas.
Se o upload falhar, informa que a entrada foi registrada e não deve ser repetida.
O formulário de entrada fica restrito à equipe; responsáveis consultam crachás.
A associação correta ao responsável e a retirada transacional seguem no P0.4.

Foi necessário separar o cache OAuth por escopo: um token de Firestore não pode
ser reutilizado para Storage. Teste cobre emissão distinta e reutilização correta.

## Evidências

- 222 testes automatizados, incluindo política Kids, entradas limitadas, caminhos
  de objeto e separação do cache OAuth; typecheck e build OpenNext passaram.
- `corepack pnpm qa:kids-media`: 62 verificações HTTP/Firestore/Storage locais,
  incluindo QR decodificado, leitura de responsável/autorizado/operador, estranho,
  outra igreja, conta inativa, retirada, MIME falso, SVG, tamanho, consentimento,
  escrita direta negada, objeto sem token público, substituição e remoção física.
- `corepack pnpm qa:registration`: regressão Kids/cadastro/Passe e última vaga
  49→50 passou. Nenhuma política comercial foi ampliada.
- Navegador: entrada fictícia, QR autenticado, estado sem foto, imagem de teste
  anexada via API, exibição na identificação e remoção pela interface. Fixture
  e objeto removidos. Seleção/câmera em aparelhos ainda não homologadas.
- Exports Hermes iOS e Android passaram. Não houve build nativo assinado.

`qa:emulators` agora inclui Storage na porta 9199; Auth 9099 e Firestore 8080.
Todos os scripts são limitados à demo local e removem os dados exclusivos do teste.

## Pendências de publicação e operação

Publicar regras, backend e clientes de forma coordenada; versões antigas com
GET do QR devem ser atualizadas. Verificar IAM/bucket privado e permissão Storage
da conta de serviço no ambiente real. Esta entrega não auditou configuração remota.

Definir retenção das fotos após retirada e reconciliação de objetos privados
órfãos em falhas excepcionais de upload/exclusão. A mídia de check-in encerrado
já fica indisponível na API, mas não há expurgo automático por prazo nesta entrega.
Revisar imagens/URLs legadas e eventual cache antigo na publicação; não houve
migração nem limpeza de dados de produção.

Homologar câmera, foto, suspensão/retomada e perda de rede em Android/iOS. Fechar
vínculo do responsável, escala/sala, retirada atômica e prevenção de repetição no
P0.4. Não interpretar a proteção de mídia como aceite completo da Segurança Kids.
