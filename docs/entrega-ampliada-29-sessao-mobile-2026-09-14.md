# Entrega 29 — revisão e proteção da sessão mobile

Data: 14/09/2026. Escopo: EsdrasApp Android/iOS.

## Diagnóstico

Consulta autenticada ao EAS confirmou que o último Android concluído era o
AAB 12 (1.0.0), de 07/09, commit `fff1822`, build
`90d373da-a365-49a8-b5ff-ba91a669e16a`. Não há builds iOS no histórico EAS
consultado. Isso não é uma consulta ao App Store Connect nem uma confirmação
nova do estado das faixas no Play Console.

O código atual continha melhorias posteriores ao AAB 12. A validação do vínculo
ocorria somente ao montar a sessão. O Passe tinha verificação própria, mas o
restante do app podia continuar mostrando conteúdo já carregado após bloqueio.
O estado da instituição também compartilhava o componente raiz entre contas.

## Alterações

- Sessão isolada pela identidade e instituição: troca de conta descarta telas,
  dados carregados e token de notificação em memória.
- Validação da instituição e usuário diretamente no servidor, sem autorização
  por cache offline. Usuário deve ter `isActive === true` e pertencer ao tenant.
- Nova consulta ao retornar ao app e a cada 60 segundos em primeiro plano.
  Uma consulta sem resposta termina visualmente em erro após 12 segundos.
- Respostas atrasadas são ignoradas após suspensão, timeout, nova consulta ou
  descarte da sessão. Consultas periódicas bem-sucedidas não interrompem a tela.
- Conteúdo fica oculto durante a revalidação. Formulários permanecem montados
  durante a abertura da câmera/permissões; erro ou bloqueio descarta o conteúdo.
- Avisos distinguem acesso indisponível de falha de conexão. Há opções de tentar
  novamente, escolher outra instituição, sair e procurar secretaria/suporte.
- Dados e registro de push começam após a primeira validação de acesso.
- A proteção visual complementa as regras/APIs existentes; não substitui
  autorização do servidor nem garante revogação instantânea do conteúdo exibido.

## Validação

- 419 testes passaram em 40 arquivos, incluindo 16 novos cenários de acesso.
- TypeScript do mobile e do pacote Firebase aprovado.
- Exportação Hermes Android e iOS aprovada; não equivale a instalação em aparelho.
- Simuladores iOS disponíveis, todos desligados na consulta; sem execução nativa
  nesta entrega. A máquina tinha aproximadamente 9 GiB livres.
- Pendente em aparelho: login/troca de conta, bloqueio administrativo, retomada,
  câmera e seus formulários, QR Kids/Passe, fotos e entrega real de push.

## Progresso e distribuição

Mobile permanece em **97%** e global em **96,40%**. A correção fortalece um
critério já contabilizado; os testes físicos e a distribuição atualizada ainda
não justificam aumento. LP permanece em 100% do escopo atual. Gratuito: 50 membros.

O código foi distribuído no AAB 13 para testadores internos. As versões web,
LP, regras Firebase e API não são alteradas por esta entrega mobile.

## AAB 13

Código commitado e enviado: `da873ac`. Build Android 1.0.0 (13), perfil
`store-test`, solicitado no EAS com a assinatura existente em 14/09.
Identificador: `e1684b75-b21a-4666-b67f-c06733a079f0`.
[Acompanhar build](https://expo.dev/accounts/alexandrecostagg/projects/plataforma-esdras/builds/e1684b75-b21a-4666-b67f-c06733a079f0).

EAS concluiu o build em 14/09/2026 às 16:33 UTC. O Google Play aceitou o
arquivo e confirmou a versão **13 (1.0.0) disponível para testadores internos**
em 14/09, às 14:31, horário exibido no Console. A faixa fechada permanece na 12;
produção pública não foi alterada.

- Tamanho: 60.903.658 bytes.
- SHA-256: `79e81e6b1d8f2aaa43842f7fe85c4ffd11b0f1a4b9ab058af6a5dd34e22158d7`.
- `jarsigner -verify`: assinatura verificada. Avisos de certificado autoassinado,
  ausência de timestamp e ordem de entradas do ZIP; a aceitação da loja é
  verificada separadamente.
- Certificado SHA-256 igual ao AAB 12:
  `97:2E:DE:AD:36:87:1F:9D:DB:8F:18:CF:52:12:01:81:CA:D7:15:60:EB:76:E7:6C:D9:6E:CE:79:3D:D8:BE:C6`.
- Na inspeção de hoje, a faixa fechada Esdras 1 já estava na versão 12;
  o registro anterior de versão 10 em análise era histórico.

Compatibilidade conferida na revisão da loja: 12.410 telefones e 6.417 tablets,
sem dispositivos removidos em relação à versão anterior. Instalação estimada
em 16,9 MB; atualização em 5,2 MB. SDK de destino 36.

[Faixa interna](https://play.google.com/console/u/0/developers/6634974275284956398/app/4974621366811081252/tracks/4701732869010871749?tab=releases).
[Link dos testadores](https://play.google.com/apps/internaltest/4701732869010871749).
O aviso da loja informa que a atualização costuma aparecer em até uma hora,
podendo levar mais tempo. A publicação não comprova instalação ou QA físico.
