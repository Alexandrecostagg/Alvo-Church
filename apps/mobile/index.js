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
          <Text
            style={{
              color: "#f87171",
              fontSize: 18,
              fontWeight: "bold",
              marginBottom: 12,
            }}
          >
            ⚠️ Crash capturado
          </Text>
          <Text
            selectable
            style={{ color: "#ffffff", fontSize: 14, marginBottom: 10 }}
          >
            {String(e?.name || "Error")}: {String(e?.message || e)}
          </Text>
          <Text
            selectable
            style={{ color: "#93c5fd", fontSize: 11, lineHeight: 16 }}
          >
            {String(e?.stack || "sem stack").slice(0, 4000)}
          </Text>
        </ScrollView>
      );
    }
    return App ? <App /> : <View />;
  }
}

registerRootComponent(RootErrorReporter);
