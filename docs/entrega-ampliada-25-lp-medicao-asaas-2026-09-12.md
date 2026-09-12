# Entrega 25 — aquisição mensurável e diagnóstico Asaas

## Resultado entregue

A LP passou a usar `https://plataformaesdras.com.br` como endereço canônico e
ganhou `robots.txt` e sitemap próprios. A página só mede visitas e interações
depois da escolha explícita do visitante. Os eventos aceitos são limitados pelo
servidor, não contêm nome, e-mail, telefone ou texto digitado, e são deduplicados
por sessão e dia. O administrador da Plataforma Esdras consulta os últimos sete
dias na nova aba **Aquisição**, sem acesso aos identificadores técnicos das
sessões.

O painel de plano ganhou um diagnóstico somente leitura do Asaas. A consulta
confere a credencial no provedor, procura o webhook financeiro, informa se ele
está ativo ou interrompido e combina esse resultado com o último evento salvo na
igreja. A resposta nunca devolve chaves, tokens ou URL privada. O endereço padrão
do sandbox foi atualizado para `https://api-sandbox.asaas.com/v3`; produção
continua configurada explicitamente como `https://api.asaas.com/v3`.

Após a publicação, o Cloudflare confirmou a presença dos segredos
`ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN` e `TURNSTILE_SECRET_KEY`, sem revelar seus
valores. Isso comprova a configuração do Worker, mas a validade da chave e o
estado do webhook só ficam comprovados quando uma conta autorizada de uma igreja
abre a tela de planos e recebe o diagnóstico. Nenhuma cobrança foi criada durante
esta auditoria.

## Validação e publicação

- 398 testes em 36 arquivos passaram.
- TypeScript da LP e do painel passou sem erros.
- Builds finais geraram 6 páginas da LP e 82 rotas do painel.
- O fluxo de métricas passou localmente: origem permitida, gravação, repetição
  deduplicada e rejeição de origem externa.
- Em produção, o domínio oficial e o sitemap responderam; um evento marcado
  `qa-deploy` foi gravado. A API financeira sem autenticação respondeu 401.
- LP publicada na versão `de051360-235b-497f-8887-9ae83e237c0b`.
- Painel publicado na versão `9b1cf184-cfdf-4c07-b13d-027aaabf2dd5`.

A API do Asaas permite listar webhooks por `GET /v3/webhooks`; a documentação
também orienta token de autenticação do webhook entre 32 e 255 caracteres,
resposta HTTP rápida e processamento idempotente. Referências oficiais:
[listar webhooks](https://docs.asaas.com/reference/listar-webhooks) e
[criar webhook pela API](https://docs.asaas.com/docs/criar-novo-webhook-pela-api).

## Percentual e limite

LP e aquisição: **94% → 99%**. O ganho cobre domínio canônico, descoberta por
buscadores, consentimento, medição operacional e leitura administrativa. Falta
substituir as demonstrações visuais por capturas reais aprovadas do produto.
Com peso de 5%, o sistema passa de **96,10% para 96,35%**. O diagnóstico do Asaas
melhora a evidência operacional, mas não aumenta novamente a frente SaaS, que já
está em 100% dentro deste recorte. Sandbox real, migrações legadas e processamento
assíncrono do webhook seguem no backlog. O plano Gratuito permanece com
**50 membros**.
