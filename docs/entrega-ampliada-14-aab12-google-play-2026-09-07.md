# Entrega ampliada 14 — AAB 12 no teste interno do Google Play

Data: **07/09/2026**

Avanço estimado: **92,60%**, ganho de **0,15 ponto percentual**.

## Resultado

- O EAS gerou o App Bundle Android a partir do commit `fff1822`, com código de
  versão **12**, versão `1.0.0` e pacote `com.plataformaesdras.app`.
- O pacote inclui o vínculo por lista pesquisável de instituições, as orientações
  de suporte, o ícone Android corrigido e o splash atual do EsdrasApp.
- O Google Play aceitou o AAB e publicou a versão **12 (1.0.0)** somente na faixa
  **Teste interno**, disponível desde 07/09/2026 às 15:18.
- Produção, titularidade, proprietário, tipo de conta e permissões administrativas
  permaneceram intactos.

## Evidências técnicas

| Verificação | Resultado |
| --- | --- |
| Build EAS | `90d373da-a365-49a8-b5ff-ba91a669e16a` |
| Artefato EAS | `https://expo.dev/artifacts/eas/juHz_WXe5-LzCWdp0VN1hV3rU6fqyBJ3vXCkC1zGaSY.aab` |
| Commit do build | `fff182289925070d92453efe452e3ff6a2e0ba87` |
| AAB | versão 12 (`1.0.0`), 58 MB antes do processamento da loja |
| SHA-256 | `273bf6a03ec8a756f047ac21e60201ec7b4d80e3e53bd01a84d1e1c5be001fcd` |
| Assinatura | `jarsigner -verify`: válida |
| Certificado | mesmo SHA-256 das versões 10–12: `97:2E:DE:AD:36:87:1F:9D:DB:8F:18:CF:52:12:01:81:CA:D7:15:60:EB:76:E7:6C:D9:6E:CE:79:3D:D8:BE:C6` |
| SDK de destino | 36 |
| Compatibilidade | 12.410 telefones e 6.417 tablets; nenhum removido |
| Instalação estimada | 16,8 MB; aumento estimado de apenas 6,45 KB |

## Limites e próximo aceite

- O Google Play informa que atualizações internas costumam aparecer em até uma
  hora. O aparelho pode exigir atualização manual da página da loja.
- Instalar a versão 12 pelo link interno e confirmar o ícone no launcher, o
  splash, a busca de instituições, o vínculo de uma conta cadastrada e a ajuda
  para uma conta ausente.
- Continuam pendentes os testes físicos completos de Esdras Passe, Segurança
  Kids, eventos, contribuições, câmera, fotos, suspensão e falha de rede.
- A regra gratuita permanece em **50 membros**.

## Percentual

A frente mobile passa de 96 para 97 pontos pela geração assinada, aceitação da
loja e distribuição interna da versão que contém a entrega 13. Instalação e QA
físico continuam sem crédito.

Com peso de 15% para mobile, o ganho global é:

`92,45 + (15 × 1) / 100 = 92,60%`.
