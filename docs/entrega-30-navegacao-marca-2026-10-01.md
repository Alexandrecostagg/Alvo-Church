# Entrega 30 — navegação do painel e marca demonstrativa

Em 01/10/2026, a navegação da dashboard para Recepção, Cuidado Pastoral e
Finanças foi revisada após a reprodução de uma área central vazia no Safari.
As três telas usavam uma animação de entrada no contêiner principal; ela foi
removida dessas telas. O carregamento da rota, da permissão e do componente
agora apresenta um estado visível com identificação do módulo.

O provedor de planos passou a aproveitar a assinatura canônica já incluída no
snapshot do tenant, eliminando uma leitura repetida do Firestore antes de
liberar os módulos. Para assinaturas legadas sem `plan` canônico, permanece a
consulta ao documento original, preservando a regra de acesso. O estado de
plano fica vinculado ao ID da organização ativa durante trocas de tenant.

A organização demonstrativa `org_alvo_demo` ainda tinha “Getro Church” no
registro de organização e no branding de produção. Os campos de nome e marca
foram corrigidos para “Plataforma Esdras / Esdras” numa transação limitada a
esse tenant. O slug legado foi preservado para não quebrar endereços públicos.
O seed local foi alinhado para impedir que uma nova carga restaure o nome
anterior. Identificadores antigos de passes não foram alterados.

Validação: 419 testes em 40 arquivos; TypeScript e build OpenNext concluídos;
após o deploy, a sessão autenticada no Safari exibiu o conteúdo de Recepção,
Cuidado Pastoral e Finanças. A navegação exibiu o indicador de carregamento
quando necessário e não permaneceu vazia. Worker web publicado na versão
`3175363b-d301-49a5-8ba9-e3076b4483c9`.

Estimativa funcional mantida: sistema **96,40%**, mobile **97%**, LP **100%**.
Esta entrega corrige confiabilidade e identidade visual, sem adicionar um
novo módulo. O plano Gratuito segue limitado a **50 membros**.
