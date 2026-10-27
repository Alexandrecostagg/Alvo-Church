import { registerRootComponent } from "expo";
import React from "react";
import { Text, ScrollView, View } from "react-native";

let App;
let loadError = null;
try {
  App = require("./App").default;
} catch (e) {
  loadError = e;
}

// Diagnóstico: em vez de crashar, mostra o erro na tela (build standalone).
// Captura erros de render (Error Boundary) e erros JS não tratados (global handler).
class RootErrorReporter extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: loadError };
    try {
      if (global.ErrorUtils && global.ErrorUtils.setGlobalHandler) {
        global.ErrorUtils.setGlobalHandler((e) => {
          this.setState({ error: e });
        });
      }
    } catch (_) {}
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error) {
    this.setState({ error });
  }
  render() {
    const e = this.state.error;
    if (e) {
      return (
        <ScrollView
          style={{ flex: 1, backgroundColor: "#0b0b0b" }}
          contentContainerStyle={{ padding: 24, paddingTop: 64 }}
        >
          <Text style={{ color: "#f87171", fontSize: 18, fontWeight: "bold", marginBottom: 12 }}>
            Não foi possível abrir o aplicativo
          </Text>
          <Text style={{ color: "#ffffff", fontSize: 16, lineHeight: 24 }}>
            Feche e abra o EsdrasApp novamente. Se o problema continuar, entre em contato com contato@plataformaesdras.com.br.
          </Text>
          {__DEV__ && <Text selectable style={{ color: "#93c5fd", fontSize: 11, lineHeight: 16 }}>
            {String(e?.stack || e).slice(0, 4000)}
          </Text>}
        </ScrollView>
      );
    }
    return App ? <App /> : <View />;
  }
}

registerRootComponent(RootErrorReporter);
