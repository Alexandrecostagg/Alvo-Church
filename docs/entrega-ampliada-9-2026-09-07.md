# Entrega ampliada 9 — gestão EAD, eventos e portal público

Data: **07/09/2026**  
Estado: **validada localmente**  
Avanço estimado: **89,85%**, ganho de **1,80 ponto percentual**.

## Resultado entregue

- Criação, edição, publicação, módulos e aulas da EAD passam por API autenticada,
  idempotente e auditada. Escrita direta no Firestore foi bloqueada.
- Cursos nascem como rascunho. Publicação exige módulo e aula; conteúdo publicado
  precisa ser retirado da Escola antes de mudar, preservando o progresso existente.
- Exclusão física de curso foi substituída por despublicação. Módulos e aulas só
  podem ser removidos no rascunho, com exclusão de módulo e suas aulas na mesma
  transação.
- Vídeos aceitam somente HTTPS em YouTube, Vimeo ou Cloudflare; imagem e material
  exigem URL HTTPS válida.
- Cadastro, edição e remoção de eventos passam por API autenticada, idempotente e
  auditada. Evento com inscrição é cancelado e preservado; evento vazio pode ser
  excluído.
- Cobrança não muda após a primeira inscrição, capacidade não fica abaixo dos
  inscritos e eventos encerrados ou cancelados não são reabertos.
- O portal `/p/[orgSlug]` usa nome e agenda reais. A nova rota pública
  `/p/[orgSlug]/events` projeta somente campos publicados e respeita o fuso da
  organização.
- O gerenciador EAD foi corrigido para empilhar lista e editor em telas estreitas.
- Repositórios clientes de mutação de cursos e eventos foram removidos.
- O seed local agora inclui slug e evento público verificável.

O plano gratuito permanece com **50 membros**.

## Evidências

- `corepack pnpm test`: **336 testes em 26 arquivos**.
- `corepack pnpm qa:delivery9`: **35 verificações** de autenticação, idempotência,
  publicação, vídeo hostil, escrita direta, auditoria, capacidade, cobrança,
  cancelamento e projeção pública.
- Regressão `qa:delivery8`: **43 verificações**.
- `qa:registration`: cadastro, CPF concorrente, rollback e limite 49→50 passaram.
- `corepack pnpm typecheck`: **13 projetos aplicáveis** passaram após os builds.
- OpenNext/Cloudflare do painel, LP estática e dry-run Wrangler da API passaram.
- QA visual em largura móvel confirmou o gerenciador responsivo, portal e agenda.
- `git diff --check` sem erros.

## Cálculo do avanço

| Frente | Antes | Depois | Evidência creditada |
| --- | ---: | ---: | --- |
| Fundação | 92 | 95 | Novas fronteiras de escrita, auditoria e repetição segura. |
| Operação web | 97 | 99 | Administração de eventos mediada e transições consistentes. |
| LP e aquisição | 70 | 77 | Portal deixa placeholders e publica agenda real mínima. |
| SaaS, finanças e doações | 86 | 90 | Cobrança/capacidade do evento ficam imutáveis após inscrição. |
| Tribos, jornadas, EAD, rede e marketplace | 82 | 91 | Ciclo administrativo EAD protegido e publicação coerente. |

`88,05 + (10×3 + 15×2 + 5×7 + 10×4 + 5×9) / 100 = 89,85%`.

O ganho percentual é menor porque as frentes locais se aproximam do teto. App em
aparelho, provedor de comunicação, Asaas real, Turnstile e migrações remotas não
recebem crédito por implementação local incompleta.

## Limites restantes

- Turnstile precisa de site key e secret reais para fechar proteção pública.
- Sandbox Asaas, webhook externo e migração de referências dependem da conta do
  provedor e de dados remotos.
- App, câmera, QR e notificações precisam de aparelhos físicos e builds assinados.
- EAD precisa de conteúdo real e homologação com contas de membros vinculadas.
- Comunicação ainda não comprova entrega por provedor.
- Publicação das regras e APIs desta entrega deve ser coordenada com o painel.

## Próximo marco

Preparar e executar homologação externa coordenada: Turnstile, sandbox Asaas,
provedor de comunicação, inventário/migração e aparelhos. Todo trabalho local
independente dessas credenciais ficou concluído neste recorte.
