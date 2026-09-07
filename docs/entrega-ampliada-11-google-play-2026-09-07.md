# Entrega ampliada 11 — teste do EsdrasApp no Google Play

Data: **07/09/2026**
Estado: **configuração corrigida e reenviada para revisão**
Avanço estimado: **91,70%**, ganho de **0,45 ponto percentual**.

## Problema confirmado

O Play Console recusou o app em 24/08/2026 por violação dos requisitos do
console. A declaração de recursos financeiros marcava **Pagamentos com smartphone
e carteiras digitais**, categoria que direcionou o app para um tipo que precisa
ser distribuído por uma conta de organização.

Essa declaração não descrevia o comportamento atual. O aplicativo gera um BR
Code PIX estático com a chave da igreja e registra uma contribuição pendente
para conferência administrativa. Ele não oferece conta, carteira digital,
transferência, crédito, investimento ou outro produto financeiro.

## Correção executada

- A declaração de recursos financeiros foi alterada para **Meu app não oferece
  recursos financeiros**.
- As 16 mudanças pendentes, incluindo a correção de conteúdo e a versão 10 da
  faixa fechada `Esdras 1`, foram enviadas novamente à revisão do Google.
- A titularidade, o tipo da conta, o proprietário e as permissões administrativas
  não foram alterados.
- A faixa de teste interno permanece ativa com a versão 8 e foi liberada para as
  duas listas de e-mail já existentes: 2 + 24 cadastros, dentro do limite de cem
  participantes dessa faixa.

## Estado verificado

| Item | Estado em 07/09/2026 |
| --- | --- |
| Pacote Android | `com.plataformaesdras.app` |
| AAB mais recente | versão 10 (`1.0.0`), aceito pelo Play Console |
| Teste interno | ativo; versão 8 disponível para testadores internos |
| Teste fechado `Esdras 1` | versão 10 em análise |
| Testadores | duas listas selecionadas, 26 cadastros brutos |
| Link do teste interno | `https://play.google.com/apps/internaltest/4701732869010871749` |
| Link do teste fechado | `https://play.google.com/apps/testing/com.plataformaesdras.app` |

O número de cadastros pode incluir endereços repetidos entre listas. Participação
efetiva e instalação continuam em 0 até que cada testador aceite o convite com a
mesma conta Google usada no aparelho.

## Evidências e limites

- A conta Expo/EAS `alexandrecostagg` foi confirmada.
- Os builds Android de loja 8, 9 e 10 foram concluídos pelo EAS com o mesmo pacote.
- O Play Console lista os três como App Bundle; a versão 10 está ativa e vinculada
  ao teste fechado, o que afasta falha de formato, pacote ou upload do AAB.
- A revisão pode levar até sete dias segundo o aviso apresentado pelo console.
- O teste interno já permite instalação da versão 8. A versão 10 só fica disponível
  na faixa fechada depois que o Google concluir a análise.
- Nenhuma instalação ou execução em aparelho foi realizada nesta entrega.

Política oficial consultada: [Requisitos do Play Console](https://support.google.com/googleplay/android-developer/answer/10788890).

## Cálculo do avanço

A frente mobile passa de 88 para 91 pontos pela comprovação de AAB assinado no
Play Console, faixa interna ativa, testadores configurados e correção reenviada.
O crédito fica restrito à validação/operação; teste físico e aprovação da versão
10 permanecem pendentes.

`91,25 + (15 × 3) / 100 = 91,70%`.

## Próximo marco

Após a aprovação, aceitar o convite com uma conta das listas, instalar a versão
10 pelo Google Play e executar o roteiro físico de login, Passe, câmera, QR,
Segurança Kids, doação, eventos, troca de conta e falha de rede.
