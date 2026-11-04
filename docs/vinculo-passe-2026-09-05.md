# Entrega 3 — vínculo de identidade e Esdras Passe

Validado localmente em 05/09/2026. Sem deploy, push, assinatura nativa ou teste
em aparelho. Regra gratuita de **50 membros** preservada e revalidada.

## Operação

Em Configurações → Usuários da organização, o administrador abre **Vincular
cadastro**, busca a pessoa pelo nome, confere sua identidade e confirma. A lista
carrega 500 cadastros por vez, com botão para ampliar a busca. Nomes iguais são
distinguidos pelo ID do cadastro. Não há associação automática por nome/e-mail.
A mesma tela permite trocar ou remover o vínculo. Só `church_admin` e
`super_admin` executam essas operações; pastor, secretaria e membro não podem.

No app, Perfil mostra **Esdras Passe**. A API deriva a conta do token Firebase,
consulta vínculo confirmado, pessoa ativa, consentimento válido e benefícios
habilitados. Entrega apenas nome, igreja, código e PNG do QR. Sem vínculo, sem
benefício ou com falha de consulta, a interface informa o estado e não mostra QR.

## Garantias implementadas

- `memberAccountLinks/{uid}` é a referência privada e confirmada pelo servidor;
  `memberAccountClaims/{personId}` reserva a pessoa para uma única conta.
- Uma transação verifica organização/contas/pessoa, troca as reservas, atualiza
  `users.personId` e grava `memberAccountAudit`. Conflitos recebem retry com
  backoff/rollback; `expectedPersonId` impede sobrescrever formulário desatualizado.
- `users.personId` é apenas espelho. Valores legados não liberam o Passe nem a
  leitura própria sem os dois documentos privados consistentes. Não houve migração
  automática de vínculos antigos. A administração deve reconfirmá-los.
- Regras negam alteração direta de `personId`, escrita dos vínculos/reservas/auditoria
  e exclusão de uma conta ainda vinculada. Campos ministeriais pessoais continuam
  editáveis; elevação do próprio cargo continua negada.
- Membros comuns não listam pessoas nem leem cadastros/validações de outros.
  A leitura individual exige vínculo confirmado; a administração operacional
  mantém acesso a pessoas. Isso não certifica todas as demais coleções do sistema.
- APIs de vínculo/Passe retornam `private, no-store`, inclusive nos erros. O QR
  é produzido no backend e vem na resposta autenticada, sem código em URL pública.
- App limpa o cartão antes de consultar, ao ir para segundo plano e na troca de
  conta/igreja. Descarta respostas antigas e verifica novamente a cada 60 segundos
  em primeiro plano; erros não mantêm o cartão anterior. Não persiste o Passe offline.

## Evidências

- `corepack pnpm test`: **192 testes**, 16 arquivos, incluindo 24 novos cenários
  de elegibilidade, minimização de dados e entradas de vínculo.
- `corepack pnpm typecheck`: todos os pacotes passaram.
- `corepack pnpm qa:member-pass`: **78 verificações** HTTP/regras em emuladores.
  Inclui vínculo legado não confiável, cargos negados, outra igreja, acesso
  alheio negado, escrita direta bloqueada, idempotência/auditoria, disputa
  simultânea por pessoa, troca de reserva, revogação, conta/igreja inativa e
  PNG do QR efetivamente decodificado com o código esperado. Fixtures isoladas
  removidas ao fim, inclusive quando o script falha.
- `corepack pnpm qa:registration`: regressão Kids responsável/operador, CPF,
  consentimento, rollback/idempotência e última vaga **49→50** passou.
- Navegador local: abrir formulário, selecionar cadastro fictício, confirmar e
  remover vínculo; mensagens e estados corretos. Cadastro temporário removido.
- Build OpenNext/Cloudflare passou. Export Hermes iOS e Android passou. Nenhum
  pacote nativo novo foi necessário; não houve instalação em aparelho.

## Limites e próxima homologação

A atualização do cartão é periódica, não uma revogação instantânea de imagens.
Capturas antigas do QR continuam possíveis: o código é uma identificação e o
parceiro precisa revalidar elegibilidade no momento do benefício. Homologação
integral do parceiro e eventual rotação/expiração do código continuam pendentes.

Testar em Android/iOS: tela/QR em diferentes tamanhos, suspensão/retomada, troca
rápida de conta, perda de rede, revogação enquanto aberto e leitura pela câmera.
A exportação JS não comprova esses comportamentos em aparelho.

Na futura publicação, coordenar regras Firestore, backend autenticado e versão
mobile; cadastrar os vínculos por confirmação administrativa. Esta entrega não
alterou regras remotas. O app distribuído deve apontar para a API correspondente.
O próximo item da fila é **QR e fotos privadas de Segurança Kids (P0.3)**.
