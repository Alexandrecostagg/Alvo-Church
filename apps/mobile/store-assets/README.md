# Imagens Esdras — App Store

Criadas e enviadas em 02/10/2026 à ficha EsdrasApp (Apple ID 6818541001),
Português (Brasil). A Apple confirmou três capturas em cada dispositivo.

- `generated/iphone/`: três JPEGs 1284 × 2778, categoria iPhone 6,5 polegadas.
- `generated/ipad/`: três JPEGs 2732 × 2048, categoria iPad 13 polegadas.
- Sequência editorial: Início, Agenda, Célula.

Composição baseada no estilo usado no AlvoPrompter: fundo claro com formas
suaves, título em duas cores e aparelho em destaque. Marca Esdras aprovada:
livro claro, pena cobre e fundo verde. Os JPEGs são capturas de uma composição
HTML com o componente real `MainApp` renderizado em React Native Web, usando
apenas fixtures fictícias. Não são evidência de teste em aparelho iOS.

## Reproduzir a composição

Na raiz do repositório, com as dependências do workspace instaladas:

```sh
npm install --prefix /private/tmp/esdras-store-render --no-audit --no-fund --ignore-scripts react-native-web@0.21.2
ESDRAS_RN_WEB=/private/tmp/esdras-store-render/node_modules/react-native-web/dist/index.js ESDRAS_STORE_OUTPUT=/private/tmp/esdras-store-gallery node scripts/prepare-mobile-store-gallery.mjs
python3 -m http.server 3876 --bind 127.0.0.1 --directory /private/tmp/esdras-store-gallery
```

Abrir `http://127.0.0.1:3876/?device=iphone&panel=inicio` e alternar `device`
entre `iphone` e `ipad`, e `panel` entre `inicio`, `agenda` e `celula`.
Capturar somente a área da composição, no tamanho correspondente acima.
Aguardar fonte e iframe carregarem. Conferir visualmente os seis arquivos.
O script transforma o componente somente em memória; não altera o app nem
inclui fixtures no build. Chamadas Firebase/Expo são substituídas no bundle
da galeria e a função fetch é desativada para impedir uso de dados reais.

Datas, textos e dados da demonstração estão no script e devem ser revisados
nas próximas versões. O HTML fornece molduras ilustrativas dos aparelhos.
A logo da ficha Apple vem do catálogo AppIcon do build, não destes JPEGs.
