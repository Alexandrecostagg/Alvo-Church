# Entrega 18 — gestão segura da rede de instituições

Data: **08/09/2026**.

Avanço estimado: **93,95%**, ganho de **0,25 ponto percentual**.

## Resultado

O convite de uma instituição para uma rede deixou de ser uma gravação direta do
navegador. A administração da sede cria um código aleatório de dez caracteres,
válido por 30 dias, e o backend reserva esse código por hash numa transação. A
operação valida sede ativa, papel administrativo, plano Rede ou Enterprise,
idempotência e lotação antes de criar o convite e atualizar o contador oficial.

O plano Rede continua limitado a **50 instituições ativas ou convidadas**. Um
convite pendente ocupa uma vaga para impedir ultrapassagem por convites paralelos.

## Aceite e administração

A tela `/join/[code]` não pede mais o ID da sede. O administrador entra na conta
da instituição que receberá o vínculo; o servidor deriva essa instituição da
sessão e impede auto vínculo, convite expirado, reutilização do código e ingresso
simultâneo em duas redes. O login preserva o retorno para o convite.

A sede agora pode:

- reemitir um convite pendente, invalidando o código anterior;
- revogar um convite e liberar a vaga;
- desvincular uma instituição ativa e encerrar imediatamente a leitura dos seus
  indicadores agregados;
- consultar a auditoria privada dessas operações.

## Privacidade e limpeza

A sede pode ler somente os documentos diários de indicadores consolidados da
filial vinculada. Cadastros individuais de membros continuam isolados no tenant.
Claims, tentativas idempotentes e vínculo global são inacessíveis ao cliente.
Escritas diretas em afiliadas e snapshots foram fechadas nas regras.

Foram removidos o fluxo cliente antigo de criação/aceite, três arquivos órfãos do
gravador de snapshots no navegador e os repositórios substituídos. Isso também
elimina o risco de um navegador sobrescrever o snapshot produzido pelo cron.

O PIX autenticado passou a verificar o módulo `giving`, corrigindo uma associação
indevida com o módulo financeiro.

## Validação e publicação

- `corepack pnpm test`: **379 testes em 32 arquivos**, todos aprovados;
- 10 testes específicos cobrem criação, plano, limite 50, aceite único,
  expiração, auto vínculo, segunda rede, reingresso após desvinculação,
  reemissão e desvinculação;
- `corepack pnpm typecheck`: 13 projetos aprovados;
- lint web e Worker API aprovado;
- build Next.js e OpenNext aprovado, com **77 rotas**;
- regras compiladas no dry run e publicadas no Firebase;
- Worker `alvo-church-web` publicado na versão
  `d525bde0-939a-48d6-8676-3931ba1aec24`;
- `/join/ABCDEFGHJK` e `/network`: HTTP 200;
- APIs de rede e PIX sem autenticação: HTTP 401;
- os oito segredos remotos permanecem vinculados, inclusive Turnstile.

Nenhum convite, vínculo, instituição, plano, usuário ou dado operacional real foi
criado ou alterado durante o QA ao vivo.

## Percentual

SaaS passa de 99 para 100 pela aplicação transacional de plano, lotação e
contador. Expansão passa de 96 para 99 porque o módulo de rede agora possui
convite, aceite, reemissão, revogação, desvinculação e leitura agregada com
fronteira de tenant. Cálculo:

`93,70 + (10×1 + 5×3)/100 = 93,95%`.

O percentual mede o recorte do MVP. O cron de snapshots ainda não consolida
todos os indicadores financeiros, eventos e presença; capacitação distribuída
pela sede, homologação em aparelhos e integrações externas permanecem abertas.
