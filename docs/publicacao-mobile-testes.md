# Testes nas lojas — EsdrasApp

O app mobile usa Expo/EAS e está preparado para os dois formatos de teste:

- `preview`: instala diretamente nos aparelhos (APK no Android e distribuição ad hoc no iOS).
- `store-test`: gera versões próprias para as lojas. O Android vai para o canal **Teste interno** do Google Play como rascunho; no iOS a versão é enviada ao App Store Connect e fica disponível no TestFlight após o processamento da Apple.

## Identidade definida

| Plataforma | Identificador | Nome |
| --- | --- | --- |
| Android | `com.plataformaesdras.app` | EsdrasApp |
| iOS | `com.plataformaesdras.app` | EsdrasApp |

O versionamento de loja é controlado pelo EAS para não reutilizar um número de build já enviado.

## O que o responsável precisa ter

1. Conta Google Play Console ativa (taxa única) e acesso de proprietário ou administrador.
2. Conta Apple Developer ativa (assinatura anual) e acesso ao App Store Connect.
3. Login da conta Expo `alexandrecostagg` com acesso ao projeto `d18300c4-7863-48e4-8772-9af9039099a2`.
4. Política de Privacidade publicada em uma URL pública. Ela é obrigatória para as duas lojas, pois o app possui autenticação e dados de membros.

Não coloque senhas, chaves de serviço, `google-services.json` ou `credentials.json` no repositório.

## Primeiro ciclo de teste

Com as contas conectadas e a política disponível, executar na raiz do projeto:

```bash
corepack pnpm --filter @alvo/mobile eas:store-test
```

O EAS solicitará o login caso seja necessário e poderá criar/associar as credenciais de assinatura. Depois que os dois builds terminarem, envie cada um para as lojas:

```bash
cd apps/mobile
npx eas-cli@latest submit --platform android --profile store-test
npx eas-cli@latest submit --platform ios --profile store-test
```

No Google Play Console, adicione os e-mails dos testadores no canal **Teste interno** e publique o rascunho. No App Store Connect, crie o grupo de TestFlight e inclua os testadores internos. Nenhum desses passos publica o app para o público geral.

## Antes de enviar

- Confirmar que as variáveis `EXPO_PUBLIC_FIREBASE_*` e `EXPO_PUBLIC_WEB_API_URL` apontam para produção no ambiente de build EAS.
- No Firebase Console, criar a credencial **FCM V1** do Android e enviá-la em `Expo > Credentials` para o projeto. No primeiro build iOS, permitir que o EAS crie/associe a chave APNs da conta Apple Developer.
- Instalar um build `preview` em aparelho físico, fazer login e aceitar a permissão de notificações. O app salva o `ExpoPushToken` no perfil do usuário; use o Expo Notifications Tool para o primeiro envio de teste.
- Testar criação de conta, login, recuperação de senha, leitura dos dados da igreja, câmera/QR e escolha de foto em aparelhos reais.
- Cadastrar músicas no módulo **Louvor & Cifras** do painel e vincular uma setlist ao próximo evento: o aplicativo lê esse repertório real, sem usar os conteúdos de demonstração na tela.
- Criar a política de privacidade e preencher os formulários de privacidade/dados das duas lojas de acordo com o comportamento real do app.
- Preparar textos da loja, e-mail de suporte, categoria e capturas de tela. Não declarar notificações push como funcionalidade enquanto elas permanecerem desativadas no app.
