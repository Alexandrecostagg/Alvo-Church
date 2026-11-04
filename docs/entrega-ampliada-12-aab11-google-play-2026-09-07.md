# Entrega ampliada 12 — AAB 11 no teste interno do Google Play

Data: **07/09/2026**

Avanço estimado: **92,15%**, ganho de **0,45 ponto percentual**.

## Resultado

- Um novo App Bundle Android foi gerado pelo EAS a partir do commit `3549cc5`,
  perfil `store-test`, sem build Gradle local.
- O EAS incrementou o código de versão de 10 para **11** e manteve a versão do
  app em `1.0.0` e o pacote `com.plataformaesdras.app`.
- O AAB foi aceito pelo Google Play e publicado somente na faixa **Teste interno**.
- A faixa está ativa e mostra a versão **11 (1.0.0)** como disponível para
  testadores internos desde 07/09/2026 às 13:44.
- Produção, titularidade, proprietário, tipo da conta e permissões administrativas
  não foram alterados.

## Evidências técnicas

| Verificação | Resultado |
| --- | --- |
| Build EAS | `09b1a8a7-ff7e-45b5-9735-f6da053be46f` |
| Artefato EAS | `https://expo.dev/artifacts/eas/0fiiShgLmGyYS8vxvV0yeyF2GjCD3azygLBU89-dx4Q.aab` |
| AAB | versão 11 (`1.0.0`), 58 MB antes do processamento da loja |
| SHA-256 do arquivo recebido | `c991d61e3ecd373d30039637fae0e1e76dd4b55cd24d2d39ee37ce9200db8607` |
| Assinatura | `jarsigner -verify`: válida |
| Certificado | mesmo SHA-256 das versões 10 e 11: `97:2E:DE:AD:36:87:1F:9D:DB:8F:18:CF:52:12:01:81:CA:D7:15:60:EB:76:E7:6C:D9:6E:CE:79:3D:D8:BE:C6` |
| TypeScript mobile | passou |
| Export Android/Hermes | 766 módulos, bundle de 4 MB, passou |
| SDK de destino no Play | 36 |
| Compatibilidade | 12.410 telefones, 6.417 tablets, sem dispositivos removidos |
| Instalação estimada pelo Play | 16,8 MB; 7,3 MB menor que a versão anterior |

O artefato permanece disponível no EAS. A cópia temporária local foi removida
depois da publicação para evitar duplicação e poupar disco.

## Espaço em disco

O volume de dados tinha 11 GiB livres antes do build e 9,5 GiB ao final, com 96%
de ocupação. O build remoto evitou baixar Gradle/NDK. O maior item descartável
identificado no projeto é `apps/mobile/ios/Pods` (cerca de 1,4 GiB), mantido porque
ainda é útil ao trabalho iOS; o `node_modules` da raiz ocupa cerca de 3,2 GiB.

## Limites e próximo aceite

- A publicação comprova geração, assinatura, aceitação e distribuição interna do
  pacote; ainda não comprova instalação nem os fluxos em aparelho físico.
- O próximo aceite mobile é instalar a versão 11 pelo link interno e executar o
  roteiro de login, Esdras Passe, Segurança Kids, eventos, contribuições, câmera,
  fotos, suspensão e falha de rede.
- A versão 10 continua em revisão na faixa fechada `Esdras 1`; esta entrega não a
  promove nem modifica produção.
- As duas listas existentes permanecem selecionadas no teste interno. A regra do
  plano gratuito segue em **50 membros**.

## Percentual

A frente mobile passa de 91 para 94 pontos pela geração atual, compatibilidade,
assinatura e publicação interna confirmadas. Não há crédito de QA físico.

Com peso de 15% para mobile, o ganho global é:

`91,70 + (15 × 3) / 100 = 92,15%`.
