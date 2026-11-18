# Google Play — atualização Android 19

Data: 17/11/2026.

- Pacote: `com.plataformaesdras.app`; versão pública `1.0.0`.
- Último AAB confirmado no Play Console: **18**, enviado em 27/10/2026 e disponível no teste interno.
- Faixa atualizada: teste interno existente; produção ainda indisponível nesta conta.
- Novo build EAS: `c4f7078d-5c24-4153-803d-5622846fdd48`, perfil `store-test`, código remoto **19**.
- Código-fonte: `1221779c1aca20daeaaaf21080445196cc326947`.
- Chave de assinatura remota existente reutilizada.
- Novo ícone: `apps/mobile/assets/generated/esdras-play-icon-512.png` (512 × 512).
- Novo banner: `apps/mobile/assets/generated/esdras-feature-graphic.png` (1024 × 500).
- Ícone e banner salvos e enviados à análise do Google. Somente essas duas mudanças constavam no resumo do envio.
- Recursos de identidade declarados como criados/editados com IA na revisão da ficha.

## Estado do AAB

Build concluído com sucesso; AAB íntegro (`unzip -t`) e assinatura validada (`jarsigner`). Certificado SHA-256 idêntico às versões anteriores:

`97:2E:DE:AD:36:87:1F:9D:DB:8F:18:CF:52:12:01:81:CA:D7:15:60:EB:76:E7:6C:D9:6E:CE:79:3D:D8:BE:C6`

SHA-256 do arquivo: `fd396a8677e349cd4a8bff371df42300d07ffc1b0bef1771ff65b8025b4e05ab`.

AAB aceito pelo Play Console e publicado na faixa **Teste interno**, confirmado como **19 (1.0.0) disponível para testadores internos** em 17/11/2026 às 18:24.

- SDK de destino: 36; API mínima: 24.
- Telefones compatíveis: 12.475; tablets: 6.561; nenhum aparelho removido.
- Instalação estimada: 17,1 MB; atualização estimada: 1,33 MB.
- Detalhes: https://play.google.com/console/u/0/developers/6634974275284956398/app/4974621366811081252/tracks/4701732869010871749/releases/6/details
- Ícone e banner da ficha seguem o fluxo separado de análise do Google; não foi atribuída aprovação antecipada.
- Teste em aparelho físico ainda não executado nesta publicação.

## Notas da versão

Nova identidade visual do EsdrasApp. Integração dos painéis de líder, pastor e rede com recepção, pessoas, jornadas, células e tribos. Melhorias em cuidado pastoral, contribuições, comunicação e marketplace. Correções de navegação, atualização de dados, permissões e segurança.

## Diagnóstico da espera

A consulta autenticada confirmou plano Free e nenhuma falha do build ou cota excedida (0/30 builds no indicador retornado). O painel público `https://expo.dev/eas-build-status` mostrou 1.539 builds Android na fila e 47,8 minutos de espera na faixa gratuita, contra média de 10,8 minutos no último dia. O pedido foi preservado para manter sua posição.
