# Entrega 31 — app mobile, integrações e marca

Em 02/10/2026, o aplicativo recebeu a identidade aprovada para o próximo
pacote: livro aberto claro, pena cobre e fundo verde `#123f34`. Ícone padrão,
camada adaptativa Android, ícone monocromático de notificação, splash Expo,
telas de abertura/boas-vindas e recursos nativos do Xcode foram atualizados.
O identificador `com.plataformaesdras.app` e a titularidade foram preservados.
O ícone iOS é PNG 1024 × 1024 sem canal alfa; a camada adaptativa permanece
transparente e dentro da área segura. O catálogo de recursos iOS compilou com
`actool` e o workspace/scheme `EsdrasApp` foi reconhecido pelo Xcode.
`pod install --deployment --no-repo-update` concluiu com as versões travadas
no Podfile.lock (95 dependências), sem alterações versionadas.
O ícone de ficha Play (512 × 512) e a arte de destaque (1024 × 500) estão em
`apps/mobile/assets/generated/`, prontos para a atualização separada da loja.
O script `node scripts/prepare-mobile-xcode-env.mjs` extrai somente sete
variáveis públicas do `.env.local` da raiz para `apps/mobile/.env.local`
(ignorado pelo Git). O export iOS confirmou que o Expo as carregou. Executar
esse preparo novamente se a configuração Firebase/API mudar ou em outra máquina.

## Integração e comunicação

TypeScript mobile e export Hermes para Android/iOS passaram. Contra Firebase
Auth/Firestore/Storage de demonstração e a API web local, passaram 43
verificações de comunicação WhatsApp/EAD/eventos, 78 do Esdras Pass, 77 de
custódia Kids e 3 do diretório de instituições. Os testes cobriram autorização,
opt-out, isolamento de tenant, idempotência, revogação e limite do plano
Gratuito em **50 membros**. Nenhum dado de produção foi usado nesses cenários.
Na URL pública da plataforma, as rotas de comunicação, custódia Kids e
Esdras Pass responderam `401` a requisições sem login, confirmando alcance e
proteção básica sem executar operações reais.

A comunicação operacional da plataforma é o envio **manual** pelo WhatsApp.
Push e e-mail estão identificados como “em breve” no painel. O aplicativo
registra o Expo Push Token, mas não há disparo da plataforma nem recebimento
físico comprovado. Um export ou teste de API não substitui o aceite em aparelho
para câmera, notificações, suspensão/retomada e redes móveis.

## Distribuição

O EAS mantém o versionCode remoto. O AAB 14 foi cancelado ainda na fila
depois de a inspeção do pacote revelar a ausência do `google-services.json`
ignorado pelo Git. Um `.easignore` preserva as exclusões sensíveis e inclui
somente esse arquivo no upload de build. A inspeção seguinte confirmou o
arquivo Android e excluiu o diretório CocoaPods. O build **15** usa a mesma
keystore remota dos builds anteriores, perfil `store-test`, e foi concluído em
[EAS Build](https://expo.dev/accounts/alexandrecostagg/projects/plataforma-esdras/builds/098b15c3-58ab-4ad7-a5ca-305125ec0ea7).
O [AAB 15 no EAS](https://expo.dev/artifacts/eas/aouJr_vfcYY4NHQCtJhwjllr5UPgYGExFNx4SVzV_Ao.aab)
foi baixado em `apps/mobile/build/esdrasapp-v15.aab` (58 MiB; SHA-256
`fe3b354ab9ba7cf033fc8ae04d6dcdc19feabd1cf281d8e307e71e1d8d14b64d`).
O ZIP passou na verificação de integridade, `jarsigner` confirmou a assinatura,
e a impressão digital do certificado coincide com a do AAB 13 já aceito na
Play. O pacote **não** foi enviado à Play Store nesta entrega.

O projeto iOS versionado em `apps/mobile/ios/EsdrasApp.xcworkspace` tem a nova
marca e o bundle ID correto. Em complemento à entrega, o App ID foi registrado
na equipe **LCN99JS59U**, com Push Notifications correspondente ao entitlement
já existente no app. O **EsdrasApp** foi criado no App Store Connect: Apple ID
**6818541001**, idioma Português (Brasil), SKU `esdrasapp-ios`, acesso limitado.
O primeiro build iOS foi enviado em 02/10, conforme complemento abaixo.

Assinatura automática e equipe foram fixadas no projeto Xcode e no Expo;
`eas.json` recebeu o destino iOS correto. `xcodebuild -showBuildSettings`
confirmou equipe, bundle ID e assinatura automática; `plutil` validou o projeto.
O Xcode abriu o workspace e confirmou perfil gerenciado criado em 02/10/2026,
com App ID, certificado, equipe, capabilities e entitlements válidos.

Correção do diagnóstico anterior: os certificados Apple Development e Apple
Distribution instalados pertencem à **mesma equipe LCN99JS59U**, conforme OU
lido em ambos os certificados públicos. O sufixo do nome do certificado
Development foi confundido com o Team ID na análise inicial.

Após liberar caches reconstruíveis, `xcodebuild archive` e `-exportArchive`
concluíram com sucesso. A Apple confirmou o upload às **11:27 de 02/10/2026**.
O build **1 (1.0.0)** foi processado e selecionado na ficha iOS 1.0. O archive
assinado está em `apps/mobile/build/ios/EsdrasApp-1.0.0-1.xcarchive` (ignorado
pelo Git), com a logo livro/pena cobre no catálogo AppIcon.

Foram criadas e enviadas **3 imagens iPhone (1284 × 2778)** e **3 imagens iPad
(2732 × 2048)**, com composição inspirada na ficha AlvoPrompter e cores Esdras.
As telas Início, Agenda e Célula são renderizadas do componente real `MainApp`,
com fixtures fictícias e sem acesso ao backend. As duas abas do App Store Connect
confirmaram “3 de 10 capturas de tela”. Fontes e arquivos finais estão em
[store-assets](../apps/mobile/store-assets/README.md).

O upload gerou avisos não bloqueantes de dSYM ausente para frameworks pré-compilados
ExpoCameraBarcodeScanning, React, ReactNativeDependencies e Hermes. Isso limita a
simbolicação de crashes desses frameworks; não impediu a aceitação do build.
A declaração técnica de criptografia foi preenchida com “Nenhum dos algoritmos
mencionados acima”: o app usa recursos do sistema (HTTPS/Keychain), e expo-crypto
é utilizado apenas para UUIDs, sem implementação própria de algoritmos.
O TestFlight passou para **“Pronta para envio — Expira em 90 dias”**.
A associação do build à versão 1.0 foi confirmada após reabrir a ficha; a logo
colorida foi conferida visualmente na lista de apps e no TestFlight.
Não houve envio para revisão pública nem convite a testadores. Metadados de
publicação, organização do teste e QA em aparelhos continuam pendentes.
O AAB 15 também foi copiado e conferido por SHA-256 em
`/Users/alexandregomesdacosta/Downloads/esdrasapp-v15.aab`.

Estimativa funcional mantida: sistema **96,40%**, mobile **97%**, LP **100%**.
Esta entrega valida e empacota a marca, sem concluir o push nem o aceite físico.


## Complemento — cadastro para revisão pública (02/10)

O aviso “Não foi possível adicionar para revisão” corresponde aos metadados
obrigatórios da App Store, não a falha do upload iOS. Foram preenchidos e salvos:

- Nome existente EsdrasApp, subtítulo “Sua comunidade mais perto” e categoria
  primária **Estilo de vida**.
- Descrição em português, texto promocional, palavras-chave, URL de suporte
  `https://plataformaesdras.com.br/#contato` e URL de marketing.
- Copyright `2026 Alexandre Gomes da Costa` e contato de revisão com o nome do
  titular, e-mail e telefone comerciais já publicados no projeto.
- Política de privacidade
  `https://alvo-church-web.alexandrecostagg.workers.dev/privacy`, validada com HTTP 200.
- Preço inicial **zero** confirmado no assistente da Apple. A disponibilidade
  territorial ainda precisa ser configurada.
- Questionário etário concluído: classificação calculada **13+** global
  (com exceções regionais). Declarados conteúdo gerado por usuários, mural social
  sem bloqueio etário específico, temas de bem-estar e temas adultos/sensíveis
  pouco frequentes. Sem controles parentais, verificação etária, navegador
  irrestrito, chat direto, publicidade paga, apostas ou violência prevista.
  Essas respostas devem ser reavaliadas se o conteúdo oferecido pelas instituições
  mudar; o módulo Kids destina-se aos responsáveis e operadores.

### Ficha de privacidade — rascunho parcial

A Apple recebeu o inventário de 14 tipos de dados. Onze tiveram os detalhes
salvos como **Funcionalidade do app**, **vinculados à identidade** e **sem
rastreamento publicitário**: nome, e-mail, telefone, saúde (alergias do Kids),
dados de pagamento (comprovantes), outras informações financeiras (renda e
contribuições), fotos/vídeos, outros conteúdos de usuário, ID do usuário,
ID do dispositivo (push) e interações com o produto (progresso/participação).

Permanecem três tipos selecionados, mas sem concluir seus detalhes: informações
confidenciais (vínculo religioso), histórico de compras (inscrições pagas) e
outros tipos de dados (perfil ministerial/educação/ocupação). O Safari expõe
seus botões como blocos de texto agregados e os cliques não abriram os formulários;
cliques por coordenadas/rolagem retornaram ausência de janela disponível.
Foi solicitado ao usuário deixar a janela visível em primeiro plano.
A ficha permanece em rascunho, **sem publicação da etiqueta de privacidade**.
Não declarar “não coleta dados” para contornar esse bloqueio.

### Pendências antes de revisão pública

1. Concluir/publicar os três detalhes de privacidade e definir disponibilidade.
2. Conferir autorizações de conteúdos de terceiros. O titular informou que não
   sabe se existem; declaração de direitos na Apple não foi preenchida. Ver
   complemento de direitos abaixo.
3. Acesso de demonstração, com dados fictícios e vínculo funcional à instituição,
   para a equipe Apple. Campos de usuário/senha não foram inventados nem preenchidos.
4. O build 1 oferece criação de conta, mas não oferece início de exclusão dentro
   do app. A página web atual orienta contato por e-mail; esse fluxo sozinho não
   atende à orientação Apple para apps fora de setores altamente regulados.
   Implementar fluxo efetivo e validá-lo em novo build antes da revisão pública.
5. Homologação em aparelho, revisão da moderação/denúncia do mural e atualização
   da política para refletir explicitamente Kids/fotos/alergias, perfil ministerial
   e provedores utilizados no conteúdo de Sabedoria Pastoral.

Referências oficiais consultadas:
[privacidade](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/)
e [exclusão de conta](https://developer.apple.com/support/offering-account-deletion-in-your-app/).
Nenhuma solicitação de revisão pública foi enviada nesta etapa.
Percentuais funcionais mantidos: sistema **96,40%**, mobile **97%**, LP **100%**;
eles não medem o preenchimento da ficha Apple nem certificam aprovação da loja.

## Complemento — direitos de conteúdo da Escola (02/10)

O titular não confirmou ter as autorizações. A inspeção do código encontrou
consentimentos específicos para fotos Kids, contato e dados do Esdras Passe,
mas nenhum aceite de direitos autorais na publicação de cursos. No mobile,
`CursosScreen` abre os vídeos cadastrados pela instituição; no painel, o gestor
informa capa, vídeos externos e materiais de apoio. Os consentimentos de dados
pessoais não comprovam direitos sobre esses materiais.

Foi implementado no gerenciamento web um aceite explícito por publicação e por
atualização de curso publicado. O responsável informa a autoria ou referência
das licenças/autorizações e confirma que pode disponibilizar todo o curso pelo
Esdras. A API exige booleano verdadeiro, versão atual e referência preenchida;
registra conta autenticada, data do servidor, texto da declaração e snapshot do
conteúdo na auditoria privada existente. As informações de autorização não são
incluídas no documento de curso lido pelos alunos. Alterações no formulário
limpam o aceite; não há aceite previamente marcado. Rascunhos e retirada da
Escola continuam disponíveis sem declarar direitos. O backend recusa snapshots
excessivos antes de qualquer escrita e preserva a idempotência.

Limites: trata-se de declaração do responsável, não de verificação independente
da licença. Cursos legados não são automaticamente regularizados ou retirados
do ar. Não foram inspecionados comprovantes externos nem o catálogo de produção.
Este controle cobre cursos institucionais; não constitui aceite geral para o
mural, eventos ou catálogo global da plataforma. O build iOS 1 e AAB 15 não foram
regerados; esta alteração foi implantada no painel/API web.

Antes de preencher Direitos de conteúdo na Apple:

1. Levantar os materiais efetivamente acessíveis no app e seus responsáveis.
2. Para conteúdo próprio, registrar autoria e autorização da instituição/autores;
   para terceiros, guardar a licença ou autorização aplicável ao uso no app.
3. Sem comprovação, retirar o curso da Escola ou substituir seus materiais por
   conteúdo próprio/autorizado; não basta um link público nem dar crédito.
4. Publicar novamente apenas após conferência, registrando a declaração. Revisar
   também conteúdo fora da Escola, inclusive materiais cadastrados por usuários.
5. Responder à Apple conforme o catálogo real e as autorizações comprovadas.
   Não selecionar “não contém” apenas porque os vídeos abrem em outro aplicativo.

Fonte: [Apple — Content Rights](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information).
Validação: 25 testes de URLs/publicação/auditoria e TypeScript web aprovados.
O roteiro integrado `verify-qa-delivery9.ts` foi atualizado, mas não executado
nesta etapa. Build Next/OpenNext e deploy Cloudflare concluídos, versão
`0bc3ad01-aa8c-4d87-ac91-44cf48298958`. O módulo JavaScript público confirmou o
novo formulário e a versão da declaração; API sem credencial retornou HTTP 401.
O aviso de Turnstile ausente no ambiente local foi conferido: o segredo continua
cadastrado no Worker remoto (somente os nomes foram consultados). Conferência
visual autenticada ainda pendente. Percentuais funcionais
mantidos: sistema **96,40%**, mobile **97%**, LP **100%**.

## Complemento — cursos arquivados por solicitação do titular (02/10)

Após o titular solicitar catálogo vazio durante os testes, foram inventariados
e exportados os **6 cursos institucionais** e **12 programas da plataforma**
presentes no Firebase `alvo-church`. A cópia contém **169 documentos**: 18 raízes,
9 módulos e 142 aulas. Os documentos preservam os tipos Firestore, identificadores,
textos e URLs originais. Vídeos e PDFs externos não foram baixados; seus links
foram preservados. O arquivo não equivale a cópia binária desses materiais.

Antes de remover qualquer documento foram criadas e conferidas duas cópias:

- `.local-backups/courses-2026-10-02/` na raiz deste projeto, ignorada pelo Git;
- `/Users/alexandregomesdacosta/Downloads/Esdras-cursos-arquivados-2026-10-02/`.

Ambas contêm `courses.json`, `courses.sha256`, `LEIA-ME.txt` e o comprovante
`archived.json`. SHA-256 do JSON:
`e627837e5bc4090a0380ca06fe75c859b49f7665b9590cb8be71246d7db24087`.
**São arquivos valiosos, não reconstruíveis pelo build: preservar em limpezas.**
Não versionar nem publicar seu conteúdo.

A remoção ocorreu em um único commit atômico Firestore, com precondições de
`updateTime` e nova comparação do inventário contra o backup. A consulta posterior
confirmou zero cursos nos dois catálogos e nenhum dos 169 documentos arquivados
remanescente. Nenhum documento de pessoa, progresso, pagamento ou entitlement
foi modificado. Os cursos foram retirados para todos os usuários, sem condição
especial para a revisão Apple. Sessões já abertas podem manter a lista em memória;
fechar/reabrir o app atualiza o catálogo.

Ferramenta versionada: `scripts/course-archive.mjs`, com modos `backup`, `archive`,
`verify` e `restore-drafts`. O último exige checksum válido, restaura **como
rascunho**, mantém os IDs e recusa sobrescrever documentos existentes. Executar
da raiz do projeto com `service-account.json` já existente. Instruções estão
também no LEIA-ME da cópia. Seis testes `node --test scripts/course-archive.test.mjs`
passaram, cobrindo escopo, revisão, checksum e restauração sem republicação.

Não executar seeds de cursos para repor o catálogo sem revisão dos direitos.
A restauração/publicação só deve ocorrer após conferir autoria e autorizações;
o painel institucional exige a declaração adicionada nesta entrega. Esvaziar
cursos não comprova direitos sobre imagens, mural ou outros conteúdos do app.
A resposta de Direitos de conteúdo na Apple não foi alterada automaticamente.
Não houve novo build mobile ou deploy de código: o catálogo é remoto. Estimativas
funcionais mantidas: sistema **96,40%**, mobile **97%**, LP **100%**; nenhuma
conclusão de aprovação da loja foi atribuída a esses percentuais.
