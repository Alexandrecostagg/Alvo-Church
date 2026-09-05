# Testes nas lojas — EsdrasApp

Atualizado em **05/09/2026**. Estado: **implementação parcial, sem homologação
em aparelhos comprovada nesta base**. Typecheck e exports JS/Hermes iOS/Android passaram;
isso não comprova build nativo assinado, instalação ou aprovação em loja.
Contas EAS/lojas não foram inspecionadas nesta revisão.

Antes do roteiro de distribuição abaixo, fechar escala/sala/evento Kids e papéis.
Dependências, vínculo/Passe e mídia Kids foram validados localmente nas entregas
1, 3 e 4. A entrega 5 integra entrada/retirada transacional e responsável separado
do operador; [evidências](kids-custodia-2026-09-05.md). QR/foto agora usam POST autenticado e Storage privado; validar câmera,
fotos, suspensão e rede em aparelho. [Entrega 4](kids-midias-privadas-2026-09-05.md). Ver [backlog ativo](backlog-mvp-implementacao-v2.md).
O app já tem registro de Expo Push Token; entrega de notificação em aparelho ainda
precisa ser comprovada. A carteirinha Passe está implementada no Perfil, com
consulta autenticada, vínculo administrativo e estados sem acesso/sem rede.
Testar suspensão/retomada, troca de conta, revogação, leitura do QR e ausência
de cartão antigo após falha em aparelho; [evidências e limites](vinculo-passe-2026-09-05.md).

Os perfis `preview` e `store-test` atualmente herdam configuração Firebase/API
de produção de `eas.json`. Preparar um ambiente de homologação próprio antes de
testar novos fluxos com dados sensíveis. Não confundir perfil de distribuição
interna com isolamento de dados. Este documento não autoriza envio às lojas.

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

- Confirmar o ambiente das variáveis `EXPO_PUBLIC_FIREBASE_*` e `EXPO_PUBLIC_WEB_API_URL`: homologação no preview de QA; produção apenas na versão deliberadamente preparada para esse ambiente.
- No Firebase Console, criar a credencial **FCM V1** do Android e enviá-la em `Expo > Credentials` para o projeto. No primeiro build iOS, permitir que o EAS crie/associe a chave APNs da conta Apple Developer.
- Instalar um build `preview` em aparelho físico, fazer login e aceitar a permissão de notificações. O app salva o `ExpoPushToken` no perfil do usuário; use o Expo Notifications Tool para o primeiro envio de teste.
- Testar criação de conta, login, recuperação de senha, leitura dos dados da igreja, câmera/QR e escolha de foto em aparelhos reais.
- Cadastrar músicas no módulo **Louvor & Cifras** do painel e vincular uma setlist ao próximo evento: o aplicativo lê esse repertório real, sem usar os conteúdos de demonstração na tela.
- Criar a política de privacidade e preencher os formulários de privacidade/dados das duas lojas de acordo com o comportamento real do app.
- Preparar textos da loja, e-mail de suporte, categoria e capturas de tela. Declarar push apenas após comprovar recebimento em aparelho; registro do token sozinho não fecha o fluxo.


## Atualização da entrega 6 — 05/09/2026

Avanço global 76,65%; mobile estimado em 75%. Aplicativo usa sessões Kids
confirmadas no painel (sala/evento/equipe/horário/capacidade), consultas do backend
e reserva de vagas transacional; salas fictícias removidas. Operador que também
é responsável conserva acesso aos crachás dos filhos. Hermes iOS/Android passou;
CI de export foi versionado, sem execução remota ou build assinado.

No QA físico, incluir operador escalado vs. outra sala, revogação durante a
sessão, entrada na última vaga, horário encerrado, responsável sem conta,
operador-responsável, câmera/foto e falha de rede. Sessão fechada não reabre.
A seleção de criança cadastral está no painel; app mantém entrada avulsa.
Não atribuir resultados físicos, recebimento de push ou distribuição nas lojas
a um export de JavaScript. Retenção de fotos e preparação remota ainda pendentes.
