# Entrega ampliada 13 — vínculo por instituição e marca mobile

Data: **07/09/2026**

Avanço estimado: **92,45%**, ganho de **0,30 ponto percentual**.

## Resultado

- O usuário autenticado deixa de digitar um código e escolhe a instituição em
  uma lista pesquisável pelo nome.
- A escolha só conclui o vínculo quando a conta já existe e está ativa no tenant
  da instituição. Esse cadastro é a validação necessária; não foi criada uma
  segunda etapa de aprovação pela secretaria.
- Quando a conta não é encontrada, o app orienta confirmar o mesmo e-mail usado
  no cadastro, procurar a secretaria/liderança da igreja e, se necessário,
  contatar o suporte do EsdrasApp em `contato@plataformaesdras.com.br`.
- O diretório expõe apenas identificador, slug e nome da instituição para contas
  autenticadas. A regra do Firestore foi publicada no projeto `alvo-church`.
- O ícone adaptativo Android foi reduzido para a área segura e recuperou a
  transparência exigida pelo sistema. Ícone e splash iOS também usam a marca
  atual do EsdrasApp.
- Onze arquivos antigos ou duplicados da marca Alvo foram excluídos para evitar
  que builds futuros voltem a usar o logo descontinuado.

## Evidências

| Verificação | Resultado |
| --- | --- |
| Diretório seguro | 6 testes unitários e 3 verificações no emulador |
| Suite completa | 28 arquivos e 346 testes passaram |
| TypeScript mobile | passou |
| Export Android/Hermes | 767 módulos, bundle de 4 MB, passou |
| Configuração Expo | ícone EsdrasApp, splash atual e adaptive icon com fundo `#111827` |
| Transparência do foreground | canal alpha entre 0 e 255; 900.917 pixels transparentes |
| Regras Firestore | release `cloud.firestore`, ruleset `19eb2cd8-2cff-4bb6-946a-bda6a6f75d53` |
| Código | commits `e315292` e `079eb5a`, enviados ao GitHub |

O diretório de produção continha cinco instituições distintas, embora uma delas
possuísse dois slugs. O cliente elimina a duplicação pelo identificador da
instituição e ordena os nomes em português.

## Limites e próximo aceite

- A versão 11 continua sendo a disponível no teste interno. O AAB 12 ainda
  precisa ser compilado e enviado para que estas mudanças cheguem aos aparelhos.
- O build EAS requer autorização explícita para transferir o código ao serviço
  externo. Não existe keystore Android local neste repositório para produzir um
  pacote de loja equivalente sem o EAS.
- Depois da versão 12 no teste interno, validar em aparelho o ícone no launcher,
  o splash, a busca de instituições, o vínculo válido e as três orientações do
  estado sem cadastro.
- O volume de dados tem aproximadamente 9,3 GiB livres; o build remoto evita
  baixar Gradle/NDK localmente.
- A regra gratuita permanece em **50 membros**.

## Percentual

A frente mobile passa de 94 para 96 pontos pelo vínculo pesquisável, tratamento
de suporte, configuração de marca e proteção publicada. Ainda não há crédito
por geração da versão 12, instalação ou QA físico.

Com peso de 15% para mobile, o ganho global é:

`92,15 + (15 × 2) / 100 = 92,45%`.
