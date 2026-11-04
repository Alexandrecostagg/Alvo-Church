import { useEffect, useState } from "react";
import { ActivityIndicator, AppState, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { FirebaseAuthUser } from "@alvo/firebase";

type PassState = { status: "loading" | "unlinked" | "unavailable" | "error" } | {
  status: "active";
  pass: { name: string; code: string; organizationName: string; qrDataUrl: string };
};

// Mount with a key containing organizationId + uid so switching identity also
// discards the previous card synchronously. Never persist this response offline.
export function MemberPassCard({ user, organizationId, apiBaseUrl, primary }: {
  user: FirebaseAuthUser; organizationId: string; apiBaseUrl: string; primary: string;
}) {
  const [state, setState] = useState<PassState>({ status: "loading" });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let disposed = false;
    let sequence = 0;
    let controller: AbortController | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    function clear() {
      sequence++; controller?.abort(); clearTimeout(timeout);
      if (!disposed) setState({ status: "loading" });
    }
    async function refresh() {
      clear();
      if (disposed || AppState.currentState !== "active") return;
      const request = sequence;
      const pending = new AbortController(); controller = pending;
      timeout = setTimeout(() => pending.abort(), 12000);
      try {
        const token = await user.getIdToken();
        if (disposed || request !== sequence || pending.signal.aborted) throw new Error("Consulta encerrada");
        const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/members/pass?organizationId=${encodeURIComponent(organizationId)}`, {
          headers: { Authorization: `Bearer ${token}` }, signal: pending.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error("Passe indisponível");
        if (data.status === "active" && (typeof data.pass?.name !== "string" || typeof data.pass?.code !== "string" || typeof data.pass?.organizationName !== "string" || !data.pass?.qrDataUrl?.startsWith("data:image/png;base64,"))) throw new Error("Passe inválido");
        if (!["active", "unlinked", "unavailable"].includes(data.status)) throw new Error("Resposta inválida");
        if (!disposed && request === sequence && AppState.currentState === "active") setState(data);
      } catch {
        if (!disposed && request === sequence) setState({ status: "error" });
      } finally { if (request === sequence) clearTimeout(timeout); }
    }
    void refresh();
    const timer = setInterval(() => { if (AppState.currentState === "active") void refresh(); }, 60000);
    const subscription = AppState.addEventListener("change", status => { if (status === "active") void refresh(); else clear(); });
    return () => { disposed = true; clear(); clearInterval(timer); subscription.remove(); };
  }, [user, organizationId, apiBaseUrl, revision]);

  return <View style={styles.card}>
    <Text style={[styles.title, { color: primary }]}>Esdras Passe</Text>
    {state.status === "loading" && <><ActivityIndicator color={primary} /><Text style={styles.message}>Verificando seu Passe…</Text></>}
    {state.status === "unlinked" && <Text style={styles.message}>Peça à administração da igreja para vincular sua conta ao seu cadastro de membro.</Text>}
    {state.status === "unavailable" && <Text style={styles.message}>Passe indisponível. A administração pode conferir seu cadastro ativo, o consentimento e a habilitação dos benefícios.</Text>}
    {state.status === "error" && <Text style={styles.message}>Não foi possível verificar o Passe. Confira sua conexão e tente novamente.</Text>}
    {state.status === "active" && <>
      <Text style={styles.name}>{state.pass.name}</Text>
      <Text style={styles.message}>{state.pass.organizationName}</Text>
      <Image accessibilityLabel="QR Code do seu Esdras Passe" source={{ uri: state.pass.qrDataUrl }} style={styles.qr} />
      <Text selectable style={styles.code}>{state.pass.code}</Text>
      <Text style={styles.message}>Apresente nos parceiros participantes. A concessão do benefício depende da validação do parceiro.</Text>
    </>}
    <TouchableOpacity accessibilityRole="button" disabled={state.status === "loading"} onPress={() => setRevision(r => r + 1)} style={styles.button}>
      <Text style={{ color: primary, fontWeight: "600" }}>Atualizar Passe</Text>
    </TouchableOpacity>
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", padding: 20, borderRadius: 16, marginVertical: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 14 },
  name: { fontSize: 18, fontWeight: "600", color: "#0f172a", textAlign: "center" },
  message: { fontSize: 14, lineHeight: 21, color: "#475569", marginVertical: 8, textAlign: "center" },
  qr: { width: 220, height: 220, maxWidth: "100%", alignSelf: "center", backgroundColor: "#fff" },
  code: { fontSize: 12, textAlign: "center", color: "#334155" },
  button: { padding: 14, alignItems: "center", marginTop: 8 },
});
