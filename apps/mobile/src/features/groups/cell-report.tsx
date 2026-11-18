import { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import * as Crypto from "expo-crypto";
import type { FirebaseAuthUser } from "@alvo/firebase";
type Props = {
  apiOrigin: string;
  user: FirebaseAuthUser;
  orgId: string;
  groupId: string;
  primary: string;
  draft: string | null;
};
export function MobileCellReport({
  user,
  orgId,
  groupId,
  primary,
  draft,
  apiOrigin,
}: Props) {
  const [data, setData] = useState<any>(),
    [meetingId, setMeeting] = useState<string>(),
    [revision, refresh] = useState(0),
    [text, setText] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const lock = useRef(false),
    attempt = useRef<{ signature: string; id: string } | null>(null);
  async function call(body: any, signal?: AbortSignal) {
    const base = apiOrigin.replace(/\/$/, "");
    const r = await fetch(`${base}/api/groups`, {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${await user.getIdToken()}`,
      },
      body: JSON.stringify({ ...body, organizationId: orgId }),
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error || "Não foi possível concluir.");
    return d;
  }
  useEffect(() => {
    const c = new AbortController();
    setData(undefined);
    setText("");
    call({ action: "detail", groupId, meetingId }, c.signal)
      .then((d) => {
        if (!c.signal.aborted) {
          setData(d);
          setText(d.report?.text || "");
        }
      })
      .catch((e) => {
        if (!c.signal.aborted) setNotice(e.message);
      });
    return () => c.abort();
  }, [user, orgId, groupId, meetingId, revision]);
  async function mutate(action: string) {
    if (lock.current || !data?.meeting) return;
    lock.current = true;
    setBusy(true);
    setNotice("");
    const body = {
      action,
      groupId,
      meetingId: data.meeting.id,
      expectedRevision:
        action === "save-report"
          ? data.report?.revision || 0
          : data.meeting.revision,
      ...(action === "save-report" ? { text } : {}),
    };
    const signature = JSON.stringify(body);
    if (attempt.current?.signature !== signature)
      attempt.current = { signature, id: Crypto.randomUUID() };
    try {
      await call({ ...body, requestId: attempt.current.id });
      attempt.current = null;
      setNotice(
        action === "save-report"
          ? "Relatório salvo para a liderança."
          : "Encontro encerrado. Registros pendentes foram preservados.",
      );
      refresh((n) => n + 1);
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const button = (label: string, onPress: () => void, disabled = false) => (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || busy}
      onPress={onPress}
      style={[
        s.button,
        { borderColor: primary, opacity: disabled || busy ? 0.5 : 1 },
      ]}
    >
      <Text>{label}</Text>
    </Pressable>
  );
  return (
    <View style={s.panel}>
      <Text style={s.title}>Relatório do encontro</Text>
      <Text>
        Escolha a data. O relatório salvo fica disponível à liderança na web e
        no app.
      </Text>
      {!!notice && <Text accessibilityRole="alert">{notice}</Text>}
      {!data && <Text>Carregando…</Text>}
      {data && (
        <>
          <Text>{data.group.name}</Text>
          {data.meetings.map((m: any) => (
            <View key={m.id}>
              {button(
                `${m.id === data.meeting?.id ? "✓ " : ""}${new Date(m.startsAt).toLocaleString("pt-BR", { timeZone: data.timezone })}`,
                () => setMeeting(m.id),
              )}
            </View>
          ))}
          {!data.meeting && (
            <Text>Crie primeiro um encontro na chamada da célula.</Text>
          )}
          {data.partial && (
            <Text>Histórico parcial. Consulte a gestão web.</Text>
          )}
          {data.meeting && (
            <>
              <Text>
                {data.summary.present} presentes · {data.summary.absent}{" "}
                ausentes · {data.summary.pending} sem registro.
              </Text>
              <TextInput
                accessibilityLabel="Relatório revisado do encontro"
                multiline
                editable={!busy}
                maxLength={12000}
                value={text}
                onChangeText={setText}
                style={s.input}
                placeholder="Descreva o encontro…"
              />
              {draft &&
                button("Usar rascunho da IA neste encontro", () =>
                  setText(draft),
                )}
              {button(
                busy ? "Salvando…" : "Salvar relatório revisado",
                () => void mutate("save-report"),
                !text.trim(),
              )}
              {data.meeting.status === "scheduled" &&
                button(
                  "Encerrar encontro",
                  () => void mutate("close-meeting"),
                  Date.parse(data.meeting.startsAt) > Date.now(),
                )}
            </>
          )}
        </>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  panel: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#cbd8ce",
    borderRadius: 12,
    gap: 10,
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: "700" },
  input: {
    minHeight: 160,
    borderWidth: 1,
    borderColor: "#9bab9f",
    borderRadius: 8,
    padding: 12,
    textAlignVertical: "top",
    fontSize: 16,
  },
  button: {
    padding: 12,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 8,
    marginVertical: 4,
  },
});
