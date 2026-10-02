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
marca e o bundle ID correto. Há certificados Apple Development e Apple
Distribution instalados, porém vinculados a **equipes diferentes**; nenhuma
`DEVELOPMENT_TEAM` foi fixada para evitar trocar a titularidade do app.
Para arquivar e enviar pelo Xcode, selecionar a equipe proprietária do
identificador na aba Signing & Capabilities, confirmar o provisioning profile,
arquivar em Product > Archive e distribuir para App Store Connect. A compilação
nativa completa, assinatura e upload à Apple ainda não foram executados; há
aproximadamente 3 GiB livres no disco ao fim da entrega, insuficientes para presumir que um
archive React Native caberá com segurança.

Estimativa funcional mantida: sistema **96,40%**, mobile **97%**, LP **100%**.
Esta entrega valida e empacota a marca, sem concluir o push nem o aceite físico.
