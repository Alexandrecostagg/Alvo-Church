import { useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, AppState, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { createAccessMonitor, type AccessState } from "./access-monitor";

// Parent keys this boundary by UID and organization, discarding old screens.
export function MobileAccessBoundary({ check, onSignOut, onChooseInstitution, children }: {
  check: () => Promise<boolean>; onSignOut: () => void; onChooseInstitution: () => void; children: ReactNode;
}) {
  const [state, setState] = useState<AccessState>("checking");
  const [admitted, setAdmitted] = useState(false);
  const monitor = useRef<ReturnType<typeof createAccessMonitor> | null>(null);
  useEffect(() => {
    const current = createAccessMonitor(check, value => {
      setState(value);
      if (value === "active") setAdmitted(true);
      else if (value !== "checking") setAdmitted(false);
    });
    monitor.current = current;
    current.setForeground(AppState.currentState === "active");
    const subscription = AppState.addEventListener("change", value => current.setForeground(value === "active"));
    return () => { current.dispose(); subscription.remove(); monitor.current = null; };
  }, [check]);
  // Keep drafts mounted while native camera/permission dialogs suspend the app.
  // A failed/revoked validation discards the protected subtree completely.
  return <View style={{ flex: 1 }}>
    {admitted && <View style={{ flex: 1, display: state === "active" ? "flex" : "none" }}>{children}</View>}
    {state !== "active" && <View style={styles.page}>
    {state === "checking" ? <><ActivityIndicator color="#d27836" /><Text style={styles.title}>Verificando seu acesso…</Text></> : <>
      <Text style={styles.title}>{state === "blocked" ? "Acesso à instituição indisponível" : "Não foi possível confirmar seu acesso"}</Text>
      <Text style={styles.text}>{state === "blocked"
        ? "Procure a secretaria da instituição para conferir seu cadastro e a liberação de acesso."
        : "Confira sua conexão e tente novamente. Se o problema continuar, procure a secretaria da instituição ou o suporte do EsdrasApp."}</Text>
      <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => void monitor.current?.refresh()}><Text style={styles.label}>Tentar novamente</Text></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={onChooseInstitution}><Text style={styles.label}>Escolher outra instituição</Text></TouchableOpacity>
      <TouchableOpacity accessibilityRole="link" style={styles.button} onPress={() => { void Linking.openURL("mailto:contato@plataformaesdras.com.br").catch(() => {}); }}><Text style={styles.label}>contato@plataformaesdras.com.br</Text></TouchableOpacity>
    </>}
    <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={onSignOut}><Text style={styles.label}>Sair da conta</Text></TouchableOpacity>
  </View>}
  </View>;
}
const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#f7f3ea" },
  title: { fontSize: 22, fontWeight: "700", color: "#1c2433", textAlign: "center", marginVertical: 16 },
  text: { fontSize: 16, lineHeight: 24, textAlign: "center", color: "#475569", marginBottom: 16 },
  button: { paddingVertical: 14, alignItems: "center" },
  label: { color: "#92400e", fontWeight: "600", textAlign: "center" },
});
