# Entrega 17 — bloqueios efetivos e verdade dos dados

Data: **08/09/2026**.

Avanço estimado: **93,70%**, ganho de **0,25 ponto percentual**.

## Resultado

O bloqueio de módulos feito pela administração da Plataforma Esdras passou a ser
aplicado também no servidor e nas regras do Firestore. Uma instituição com um
módulo explicitamente pausado não consegue contornar a interface chamando a API
ou o SDK do Firestore diretamente. Configurações antigas sem a chave continuam
habilitadas para preservar compatibilidade.

Foram cobertos Segurança Kids, eventos, jornadas/EAD, marketplace, comunicação,
Finanças, doações, IA, formulários públicos e as coleções operacionais usadas por
células, Tribos, escalas e louvor. O checkout da assinatura continua acessível
quando Finanças está pausado, permitindo regularizar ou alterar o plano.

## Verdade dos dados

As telas de células, escalas e dashboard deixaram de apresentar uma gravação
como concluída antes da resposta do Firestore:

- vínculo, remoção e exclusão em células só alteram a tela após persistência;
- abertura/encerramento de encontro e presença seguem a mesma regra;
- criação, atualização, remoção e troca de escalas só entram no estado local
  depois da gravação real;
- publicação do demonstrativo financeiro só fica marcada após sucesso;
- follow-up persistente não é concluído offline; ações apenas visuais informam
  claramente que valem somente para a sessão.

O estado de louvor agora informa `Firestore desconectado`, sem sugerir um modo de
demonstração que não existe.

## Limpeza

O arquivo `apps/web/src/lib/mock-data.ts`, com 1.481 linhas sem consumo de
produção, foi removido. A única constante ainda usada, a definição das 12 Tribos,
foi movida para um arquivo próprio sem organização fictícia. Também foram
removidos 77 trechos de agenda/repertório fictício não utilizados no mobile e 31
linhas de CSS órfão. Isso elimina cópias capazes de divergir dos dados reais.

## Validação e publicação

- `corepack pnpm test`: **369 testes em 31 arquivos**, todos aprovados;
- `corepack pnpm typecheck`: todos os 13 projetos aplicáveis aprovados;
- lint de web e mobile aprovado;
- build OpenNext/Cloudflare aprovado, com **76 rotas**;
- regras compiladas no emulador e no Firebase e publicadas sem avisos;
- Worker `alvo-church-web` publicado na versão
  `a184cfa6-eead-413e-a47f-54b403e74950`;
- `/platform-admin`: HTTP 200;
- API administrativa sem autenticação: HTTP 401;
- visita pública inválida/sem desafio: HTTP 400;
- `TURNSTILE_SECRET_KEY` permanece como segredo criptografado no Worker.

Nenhuma instituição, usuário, plano ou dado operacional de produção foi alterado
durante a validação.

## Regra comercial preservada

O plano Gratuito permanece limitado a **50 membros** em
`packages/firebase/src/plans.ts`, na validação administrativa e nos testes. Esta
entrega não mudou titularidade, plano ou cobrança de nenhuma instituição.

## Percentual

SaaS passa de 98 para 99 pela execução real do bloqueio; Comunicação/IA passa de
85 para 86 e Expansão de 95 para 96 pelos mesmos limites nos módulos específicos.
As correções de verdade dos dados melhoram uma frente web já avaliada em 100 e,
por isso, não criam pontos adicionais. Cálculo:

`93,45 + (10×1 + 10×1 + 5×1)/100 = 93,70%`.

O percentual mede o recorte do MVP. Homologação física, integrações reais de
pagamento/comunicação e migrações legadas continuam fora desta entrega.
