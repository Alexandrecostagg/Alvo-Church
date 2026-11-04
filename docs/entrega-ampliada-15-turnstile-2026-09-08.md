# Entrega 15 — proteção Turnstile dos formulários públicos

Data: **08/09/2026**
Avanço estimado: **93,05%**, ganho de **0,45 ponto percentual**.

## Resultado

- O cadastro público de visitantes e a criação de intenção PIX exigem agora
  um token Turnstile verificado pelo servidor antes de gravar qualquer dado.
- O servidor confere sucesso, ação esperada e hostname permitido. O IP recebido
  diretamente da borda Cloudflare é enviado ao Siteverify; cabeçalhos de proxy
  controlados pelo cliente não selecionam a identidade do limite.
- Cada desafio recebe um UUID de idempotência para repetição segura da chamada
  ao Siteverify. Tokens ausentes, grandes demais, expirados, reutilizados ou de
  outra ação são recusados com uma mensagem que permite nova tentativa.
- Em produção, ausência do secret falha fechada. Em desenvolvimento, as chaves
  oficiais de teste da Cloudflare permitem validar a integração sem CAPTCHA real.
- A confirmação de pagamento não exige um segundo desafio: ela continua
  protegida pela intenção secreta de 48 horas, já validada antes de gerar o PIX.
- O widget é reiniciado após falha e os dados digitados permanecem no formulário.
  A CSP passou a permitir somente scripts e frames do domínio oficial do Turnstile.

## Configuração externa preparada

Foi criado no Cloudflare o widget gerenciado `Esdras formularios publicos`, com
os hostnames:

- `alvoprompter.com.br`;
- `www.alvoprompter.com.br`;
- `alvo-church-web.alexandrecostagg.workers.dev`.

A site key pública está no ambiente de produção e foi encontrada no bundle
OpenNext. O secret foi gravado somente como binding criptografado
`TURNSTILE_SECRET_KEY` no Worker e não foi colocado no repositório. O
`wrangler.jsonc` declara esse binding como obrigatório; uploads futuros devem
falhar antes da publicação caso ele não esteja configurado.

O código e o secret foram publicados na versão
`aab95130-2590-4ef9-b658-fbb5962fc4ee` do Worker `alvo-church-web`.

## Validação

- `corepack pnpm test`: **358 testes em 29 arquivos passaram**;
- 12 testes novos cobrem configuração incompleta, token inválido, ação, hostname, IP,
  UUID de repetição e indisponibilidade do Siteverify;
- `corepack pnpm typecheck`: passou nos 13 projetos com esse script;
- `corepack pnpm build:cloudflare:web`: gerou o Worker OpenNext e 75 páginas;
- `git diff --check`: sem erro de whitespace;
- varredura do repositório: nenhuma ocorrência da chave privada.
- produção recusou token ausente/inválido com HTTP 400 e mensagem recuperável;
- o widget real mostrou `Sucesso!` nas telas de visita e de contribuição;
- uma visita com desafio real percorreu a API e terminou no caminho honeypot,
  sem escrita no Firestore;
- a contribuição validou o widget com ação `public_giving`; a instituição
  inexistente usada no QA manteve o botão PIX indisponível e impediu qualquer
  criação financeira.

O build manteve o aviso conhecido do Next sobre `middleware` e avisos de APIs
do Edge Runtime dentro do próprio Next; não houve falha de compilação.

## Cálculo e limites

A fundação sobe de 97 para 99 pela verificação server-side, restrição de origem,
falha fechada e binding obrigatório. LP/aquisição sobe de 86 para 89 porque os
formulários públicos ganharam proteção, recuperação visual e QA ao vivo. SaaS,
finanças e doações sobe de 94 para 95 pela proteção publicada da intenção PIX.
O cálculo é `92,60 + (10×2 + 5×3 + 10×1)/100 = 93,05%`.

Ainda falta uma intenção PIX completa com uma instituição real que possua chave
configurada; esse teste criaria um registro financeiro e não foi usado como
atalho para o percentual. A regra comercial do plano gratuito permanece
exatamente em **50 membros**.

Referências oficiais:
[validação server-side](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/),
[renderização no cliente](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/),
[chaves de teste](https://developers.cloudflare.com/turnstile/troubleshooting/testing/) e
[CSP](https://developers.cloudflare.com/turnstile/reference/content-security-policy/), além da
[declaração de secrets obrigatórios no Wrangler](https://developers.cloudflare.com/workers/wrangler/configuration/#secrets).
