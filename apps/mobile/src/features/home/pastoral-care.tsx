import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from "react-native";
import type { FirebaseAuthUser } from "@alvo/firebase";
import type { RoleHomeSnapshot } from "@alvo/domain";
export function MobilePastoralCare({
  user,
  orgId,
  apiOrigin,
  profile,
  care,
  onChanged,
}: {
  user: FirebaseAuthUser;
  orgId: string;
  apiOrigin: string;
  profile: string;
  care: NonNullable<RoleHomeSnapshot["care"]>;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<any>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const generation = useRef(0),
    lock = useRef(false);
  useEffect(() => {
    generation.current++;
    setDetail(undefined);
    setError("");
    return () => {
      generation.current++;
    };
  }, [orgId, user.uid, profile, care.asOf]);
  async function call(body: Record<string, unknown>) {
    const r = await fetch(apiOrigin + "/api/pastoral", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${await user.getIdToken()}`,
      },
      body: JSON.stringify({ ...body, organizationId: orgId, profile }),
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error || "Não foi possível consultar.");
    return d;
  }
  async function open(id: string) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setDetail(undefined);
    const g = generation.current;
    try {
      const r = await call({ action: "detail", requestId: id });
      if (g === generation.current) setDetail(r.request);
    } catch (e) {
      if (g === generation.current) setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function update(action: string) {
    if (!detail || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const g = generation.current;
    try {
      await call({ action, requestId: detail.id, revision: detail.revision });
      if (g === generation.current) {
        setDetail(undefined);
        onChanged();
      }
    } catch (e) {
      if (g === generation.current) setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <View style={s.card}>
      <Text style={s.heading}>
        {profile === "cell_leader"
          ? "Cuidados atribuídos a mim"
          : "Prioridades pastorais"}
      </Text>
      <Text>{care.scope}</Text>
      <Text style={s.meta}>
        {care.summary.open} abertos · {care.summary.urgent} urgentes ·{" "}
        {care.summary.overdue} com prazo vencido
        {profile !== "cell_leader"
          ? ` · ${care.summary.unassigned} sem responsável`
          : ""}
      </Text>
      {care.partial && <Text>Amostra limitada. Consulte a fila na web.</Text>}
      {!care.requests.length && <Text>Nenhum pedido aberto neste escopo.</Text>}
      {care.requests.map((r) => (
        <TouchableOpacity
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void open(r.id)}
          style={s.button}
          key={r.id}
        >
          <Text style={s.strong}>{r.personName}</Text>
          <Text>
            {r.priority === "urgent"
              ? "Urgente"
              : r.priority === "important"
                ? "Importante"
                : "Normal"}{" "}
            · {r.ownerName || "Sem responsável"}
          </Text>
          {r.dueAt && (
            <Text>Prazo: {new Date(r.dueAt).toLocaleDateString("pt-BR")}</Text>
          )}
        </TouchableOpacity>
      ))}
      {busy && <Text>Processando…</Text>}
      {!!error && <Text accessibilityRole="alert">{error}</Text>}
      {detail && (
        <View style={s.detail}>
          <Text style={s.heading}>{detail.personName}</Text>
          <Text>{detail.message}</Text>
          <Text style={s.meta}>
            Responsável: {detail.ownerName || "Não atribuído"}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            style={s.button}
            disabled={busy}
            onPress={() => void update("contact")}
          >
            <Text>Registrar contato realizado</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            style={s.button}
            disabled={busy}
            onPress={() => void update("resolve")}
          >
            <Text>Concluir acompanhamento</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            style={s.button}
            onPress={() => setDetail(undefined)}
          >
            <Text>Fechar relato</Text>
          </TouchableOpacity>
        </View>
      )}
      <TouchableOpacity
        accessibilityRole="link"
        style={s.button}
        onPress={() =>
          void Linking.openURL(
            apiOrigin + "/pastoral-ai?profile=" + profile,
          ).catch(() => setError("Não foi possível abrir a fila."))
        }
      >
        <Text>Fila completa, triagem e encaminhamento · web</Text>
      </TouchableOpacity>
    </View>
  );
}
const s = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderColor: "#d8e1ec",
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 12,
    marginVertical: 12,
  },
  heading: { fontWeight: "700", fontSize: 20, color: "#172337" },
  strong: { fontWeight: "700", color: "#172337" },
  meta: { color: "#526176", lineHeight: 22 },
  button: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  detail: {
    padding: 14,
    backgroundColor: "#f3f6fa",
    borderRadius: 12,
    gap: 12,
  },
});
