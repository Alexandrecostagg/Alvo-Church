# Entrega ampliada 10 — marketplace seguro e LP verificável

Data: **07/09/2026**
Estado: **validada, publicada e sincronizada**
Avanço estimado: **91,25%**, ganho de **1,40 ponto percentual**.

## Resultado entregue

- Aprovação, rejeição e suspensão de lojas passam por API autenticada, com papel
  permitido, organização ativa, transições válidas e motivo limitado.
- Mudança da loja, histórico de moderação e registro idempotente são gravados na
  mesma transação. Repetições devolvem o resultado anterior e tentativas
  reutilizadas com outra ação são recusadas.
- Administradores não alteram mais o status nem forjam logs pelo cliente. O
  proprietário continua podendo criar e reenviar a própria loja como pendente,
  sem editar campos de moderação, identidade ou criação.
- A rota pública de diagnóstico `/test` foi removida.
- A LP deixou de afirmar números de clientes, membros, satisfação e depoimentos
  sem fonte. Exemplos visuais agora são identificados como ilustrativos.
- Trial, prazo de resposta, migração automática, notificações automáticas e
  backups não comprovados deixaram de ser apresentados como fatos.
- A LP preserva a oferta gratuita de **50 membros**, acrescenta canonical e links
  diretos para privacidade e exclusão de conta.
- Componentes sem uso de contagem e depoimentos foram removidos das duas cópias
  ainda necessárias para o deploy atual e o build estático separado.

## Evidências

- `corepack pnpm qa:delivery10`: **20 verificações** de autenticação, papel,
  idempotência, transição, motivo, auditoria e bloqueio de escrita direta.
- `corepack pnpm test`: **340 testes em 27 arquivos**.
- Testes focados de marketplace, eventos e portal: **12 testes**.
- Typecheck do painel e da LP passou.
- Build do painel passou com a nova API e sem a rota `/test`.
- Export estático da LP gerou somente `/` e o alias `/landing`.
- QA visual confirmou hierarquia, rótulos de demonstração, oferta de 50 membros,
  CTAs e links legais na LP.
- `git diff --check` sem erros.

## Publicação

- Implementação registrada no commit `4d361f2` e enviada à branch
  `codex/consolidacao-local-2026-09-05` no remoto.
- Artefato OpenNext reconstruído e painel/API publicados no Worker
  `alvo-church-web`, versão `994c25a5-fabf-4ee3-bfc5-a5061c442ec6`.
- Regras do Firestore compiladas e liberadas no projeto `alvo-church`.
- Verificação HTTP confirmou `/landing` com o conteúdo atualizado, `/test` em
  `404` e a nova API em `401` com `private, no-store` sem autenticação.

## Cálculo do avanço

| Frente | Antes | Depois | Evidência creditada |
| --- | ---: | ---: | --- |
| Fundação | 95 | 97 | Nova fronteira transacional e bloqueio de logs forjados. |
| Operação web | 99 | 100 | Moderação administrativa íntegra e rota de teste removida. |
| LP e aquisição | 77 | 86 | Prova honesta, exemplos rotulados, canonical e links legais. |
| SaaS, finanças e doações | 90 | 94 | Moderação por tenant, papel, transição e repetição segura. |
| Tribos, jornadas, EAD, rede e marketplace | 91 | 95 | Ciclo de moderação de lojas protegido no servidor. |

`89,85 + (10×2 + 15×1 + 5×9 + 10×4 + 5×4) / 100 = 91,25%`.

O percentual não recebe crédito por conversão sem medição nem por integrações
externas ainda ausentes.

## Limites restantes

- Prova social real depende de clientes e resultados autorizados para publicação.
- Domínio definitivo, analytics consentido e operação independente da LP ainda
  precisam de decisão e configuração externa.
- Turnstile, sandbox Asaas, migrações remotas e comunicação por provedor dependem
  de credenciais ou dados externos.
- App, QR, câmera, notificações e lojas precisam de aparelhos e contas de
  distribuição.
- Marketplace ainda precisa de conteúdo real e homologação com comerciantes.

## Próximo marco

Homologar o que depende de ambiente externo e dados reais. O trabalho local deste
recorte ficou concluído e documentado sem alterar o limite gratuito.
