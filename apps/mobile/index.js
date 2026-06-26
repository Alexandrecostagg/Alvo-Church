import { registerRootComponent } from "expo";

let App;
try {
  App = require("./App").default;
} catch (e) {
  const { Text, View } = require("react-native");
  console.error("TOP LEVEL CRASH:", e?.message, e?.stack);
  App = function ErrorApp() {
    return (
      <View style={{ flex: 1, padding: 40, paddingTop: 80 }}>
        <Text style={{ color: "red", fontSize: 16, fontWeight: "bold" }}>Erro no carregamento:</Text>
        <Text style={{ color: "red", fontSize: 13, marginTop: 8 }}>{String(e?.message)}</Text>
      </View>
    );
  };
}

registerRootComponent(App);
