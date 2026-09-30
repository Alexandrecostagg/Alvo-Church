# Identidade aprovada — aplicar no próximo AAB

Em 28/09/2026, o usuário aprovou a marca **livro aberto com pena** apresentada
na LP. Depois, pediu expressamente para adiar a aplicação no aplicativo e no
Google Play até a próxima geração de AAB.

## Estado preservado

- LP: composição aprovada, disponível na prévia local do commit `0c648b2`.
- App: arquivos operacionais mantidos como estavam antes desta preparação.
- Google Play: versão 13 (1.0.0) confirmada como disponível no teste interno;
  nenhuma alteração de ficha, upload ou publicação efetuada nesta sessão.
- Nenhum novo build EAS foi iniciado.
- Percentuais mantidos: sistema 96,40%, mobile 97%, LP 100% do escopo funcional.

## Arte preparada

- [Símbolo vetorial de trabalho](brand/esdras-book-quill-draft.svg).
- [Prévia do ícone da loja, 512 × 512](brand/esdras-play-icon-draft.png).
- [Avatar quadrado para Instagram, 512 × 512](brand/esdras-instagram-avatar-512.png),
  derivado da mesma arte aprovada; o livro e a pena permanecem dentro da área
  de recorte circular da foto de perfil.
- [Prévia colorida do avatar, 512 × 512](brand/esdras-instagram-pena-cobre-512.png)
  e [vetor correspondente](brand/esdras-instagram-pena-cobre.svg): livro claro,
  pena em cobre `#dc7938` e fundo verde `#123f34`. Em 30/09, o usuário escolheu
  esta variante para o painel web e para as capturas de produto da LP. A troca
  da foto do perfil do Instagram ainda depende de identificar a conta oficial.
- Referência visual aprovada: `apps/lp/public/esdras-book-quill-preview.png`.

A versão vetorial foi preparada a partir da composição aprovada; conferir sua
fidelidade à LP antes de adotá-la como fonte definitiva. As artes desta pasta
não são consumidas pelo app mobile e não alteram o próximo build automaticamente.

Direção: símbolo claro sobre verde `#123f34`, livro e pena sem a antiga letra E.
Manter o nome EsdrasApp, os identificadores, a titularidade e as permissões.

## Instagram

O avatar está pronto para publicação. A sessão aberta no navegador Chrome
mostrou apenas os perfis salvos `@alvorecerstudio` e `@alvoprompter`; não foi
identificado nela um perfil oficial do Esdras. Antes de trocar a foto,
confirmar o `@` correto e ter acesso à conta. A mudança da foto do Instagram
pode ocorrer independentemente da geração do próximo AAB.

## Executar junto à próxima versão Android

Atualização de nomenclatura em 28/09: os textos do aplicativo já usam
**Sabedoria Pastoral** no código. A mudança aparecerá para os usuários após a
próxima distribuição; verificar roteiros, relatórios e mensagens de geração
nesse AAB. Nenhum novo build foi feito para esta troca de texto.

1. Gerar os ícones de app/iOS, a camada transparente do ícone adaptativo Android,
   a versão monocromática e o ícone próprio para notificações. Preservar a área
   segura do Android para não cortar o livro ou a pena.
2. Atualizar o splash nativo e as telas React Native de abertura e boas-vindas.
   Conferir `app.json`, `app.config.js` e os recursos iOS versionados: mudar só
   a configuração Expo não atualiza necessariamente o projeto nativo existente.
3. Validar transparência, contraste, recortes circular/arredondado e ausência
   da marca antiga durante a abertura. Rodar typecheck e export Android/iOS.
4. Consultar o próximo versionCode remoto no EAS, gerar AAB assinado e conferir
   a assinatura existente. A versão 13 é a referência desta consulta, não um
   motivo para fixar manualmente o próximo número.
5. Atualizar o ícone na ficha principal do Google Play e revisar o banner e
   demais imagens para localizar a marca antiga. Salvar e enviar as alterações
   pertinentes para análise, sem incluir alterações alheias pendentes.
6. Enviar o novo AAB à faixa de teste interno existente, confirmar a liberação
   aos testadores e validar a atualização em aparelho físico.
7. Atualizar a documentação de distribuição e registrar commit ao concluir.

Na preparação de 28/09 havia aproximadamente 1,4 GiB livres no disco. Reavaliar
o espaço antes de exportar/baixar o AAB; preferir a compilação EAS em nuvem.

Referências técnicas: [ícones Google Play](https://developer.android.com/distribute/google-play/resources/icon-design-specifications),
[ícones adaptativos Android](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive?hl=en)
e [splash e ícones no Expo](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/).
