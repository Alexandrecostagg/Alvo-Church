import { useEffect, useRef, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import * as Crypto from "expo-crypto";
import type { FirebaseAuthUser } from "@alvo/firebase";
import {
  TRIAL_LABELS,
  getTribeDisplayLabel,
  type TribeSnapshot,
  type TribeTrial,
} from "@alvo/domain";
import type { TribeCode } from "@alvo/types";
export function MobileTribes({
  user,
  orgId,
  apiOrigin,
  primary,
  onBack,
}: {
  user: FirebaseAuthUser;
  orgId: string;
  apiOrigin: string;
  primary: string;
  onBack: () => void;
}) {
  const [data, setData] = useState<TribeSnapshot>(),
    [revision, refresh] = useState(0),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const [area, setArea] = useState(""),
    [purpose, setPurpose] = useState(""),
    [editing, setEditing] = useState<TribeTrial | null>(null),
    [feedback, setFeedback] = useState(""),
    [interest, setInterest] = useState("continue");
  const lock = useRef(false),
    attempt = useRef<{ signature: string; id: string } | null>(null);
  async function call(body: Record<string, unknown>, signal?: AbortSignal) {
    const r = await fetch(`${apiOrigin.replace(/\/$/, "")}/api/tribes`, {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${await user.getIdToken()}`,
      },
      body: JSON.stringify({
        ...body,
        scope: "personal",
        organizationId: orgId,
      }),
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error || "Não foi possível concluir.");
    return d;
  }
  useEffect(() => {
    const c = new AbortController();
    setData(undefined);
    setError("");
    call({ action: "snapshot" }, c.signal)
      .then((d) => {
        if (!c.signal.aborted) setData(d);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, [user, orgId, revision]);
  async function mutate(body: Record<string, unknown>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    const signature = JSON.stringify(body);
    if (attempt.current?.signature !== signature)
      attempt.current = { signature, id: Crypto.randomUUID() };
    try {
      await call({ ...body, requestId: attempt.current.id });
      attempt.current = null;
      setNotice("Salvo. Sua decisão já está disponível para a liderança.");
      setEditing(null);
      setPurpose("");
      refresh((n) => n + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const button = (title: string, fn: () => void, disabled = false) => (
    <Pressable
      accessibilityRole="button"
      disabled={busy || disabled}
      onPress={fn}
      style={[
        s.button,
        { borderColor: primary, opacity: busy || disabled ? 0.5 : 1 },
      ]}
    >
      <Text style={{ color: primary, fontWeight: "700" }}>{title}</Text>
    </Pressable>
  );
  return (
    <ScrollView
      contentContainerStyle={s.page}
      keyboardShouldPersistTaps="handled"
    >
      {button("← Voltar", onBack)}
      <Text style={s.title}>Meu lugar para servir</Text>
      <Text>
        Explore uma área da sua igreja, combine uma experiência e conte como
        foi.
      </Text>
      {!!notice && (
        <Text accessibilityLiveRegion="polite" style={s.notice}>
          {notice}
        </Text>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      {busy && <Text accessibilityLiveRegion="polite">Salvando…</Text>}
      {button("Atualizar", () => refresh((n) => n + 1))}
      {!data && !error && <Text>Carregando…</Text>}
      {data && (
        <>
          <View style={s.card}>
            <Text style={s.heading}>Minha referência</Text>
            <Text>
              {data.people[0]?.tribe
                ? getTribeDisplayLabel(data.people[0].tribe as TribeCode)
                : "Ainda sem referência ministerial"}
            </Text>
            <Text>
              Você pode experimentar áreas diferentes da sua tribo. Nenhum
              convite altera automaticamente sua escala.
            </Text>
            {!data.linked && (
              <Text>
                Peça à secretaria para vincular sua conta ao cadastro.
              </Text>
            )}
          </View>
          {data.linked && data.servingEnabled && (
            <View style={s.card}>
              <Text style={s.heading}>Quero experimentar</Text>
              {!data.areas.length && (
                <Text>
                  A igreja ainda precisa cadastrar as áreas de serviço.
                </Text>
              )}
              {data.areas.map((a) => (
                <View key={a.id}>
                  {button(
                    `${area === a.id ? "✓ " : ""}${a.name}${a.tribe && a.tribe === data.people[0]?.tribe ? " · relacionada à minha tribo" : ""}`,
                    () => setArea(a.id),
                  )}
                  {area === a.id && (
                    <Text>
                      {a.summary} {a.roles.join(" · ")}
                      {a.tribe === data.people[0]?.tribe && a.tribe
                        ? " — Relação configurada pela liderança."
                        : ""}
                    </Text>
                  )}
                </View>
              ))}
              <TextInput
                accessibilityLabel="Meu interesse"
                placeholder="O que gostaria de experimentar? (opcional)"
                multiline
                maxLength={500}
                value={purpose}
                onChangeText={setPurpose}
                style={s.input}
              />
              {button(
                "Registrar meu interesse",
                () => void mutate({ action: "request", areaId: area, purpose }),
                !area,
              )}
            </View>
          )}
          {!data.servingEnabled && (
            <Text>
              O módulo de Escalas precisa estar disponível para novas
              experiências.
            </Text>
          )}
          <Text style={s.heading}>Minhas experiências</Text>
          {!data.trials.length && (
            <Text>Seus interesses e convites aparecerão aqui.</Text>
          )}
          {data.trials.map((t) => (
            <View key={t.id} style={s.card}>
              <Text style={s.heading}>{t.areaName}</Text>
              <Text style={s.badge}>{TRIAL_LABELS[t.status]}</Text>
              <Text>{t.purpose}</Text>
              {!!t.scheduledAt && (
                <Text>
                  {new Date(t.scheduledAt).toLocaleString("pt-BR", {
                    timeZone: data.timezone,
                  })}{" "}
                  · {data.timezone}
                </Text>
              )}
              {t.responseSource === "leadership_record" && (
                <Text>
                  Resposta registrada pela liderança: {t.responseNote}
                </Text>
              )}
              {!!t.feedback && <Text>Seu retorno: {t.feedback}</Text>}
              {!!t.outcome && <Text>Próximo passo: {t.outcome}</Text>}
              {t.status === "invited" &&
                button(
                  "Aceitar convite",
                  () =>
                    void mutate({
                      action: "accept",
                      id: t.id,
                      revision: t.revision,
                    }),
                )}
              {["requested", "invited", "accepted"].includes(t.status) &&
                button(
                  t.status === "requested"
                    ? "Retirar interesse"
                    : "Não posso participar",
                  () =>
                    void mutate({
                      action: "decline",
                      id: t.id,
                      revision: t.revision,
                    }),
                )}
              {t.status === "accepted" &&
                Date.parse(t.scheduledAt) <= Date.now() &&
                button("Contar como foi", () => {
                  setEditing(t);
                  setFeedback("");
                  setInterest("continue");
                })}
              {editing?.id === t.id && (
                <View>
                  <TextInput
                    accessibilityLabel="Como foi a experiência"
                    placeholder="Como foi a experiência?"
                    multiline
                    maxLength={1000}
                    value={feedback}
                    onChangeText={setFeedback}
                    style={s.input}
                  />
                  {[
                    ["continue", "Quero continuar"],
                    ["explore", "Quero experimentar outra área"],
                    ["pause", "Prefiro pausar"],
                  ].map(([id, title]) => (
                    <View key={id}>
                      {button(`${interest === id ? "✓ " : ""}${title}`, () =>
                        setInterest(id),
                      )}
                    </View>
                  ))}
                  {button(
                    "Salvar retorno",
                    () =>
                      void mutate({
                        action: "feedback",
                        id: t.id,
                        revision: t.revision,
                        feedback,
                        interest,
                      }),
                    !feedback.trim(),
                  )}
                  {button("Cancelar", () => setEditing(null))}
                </View>
              )}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: { padding: 20, gap: 14, paddingBottom: 50 },
  title: { fontSize: 28, fontWeight: "800", color: "#183b30" },
  heading: { fontSize: 20, fontWeight: "700", color: "#183b30" },
  card: {
    padding: 18,
    borderWidth: 1,
    borderColor: "#d4e1d8",
    borderRadius: 16,
    backgroundColor: "#fff",
    gap: 12,
  },
  button: {
    minHeight: 48,
    justifyContent: "center",
    padding: 14,
    borderWidth: 1,
    borderRadius: 10,
    marginVertical: 4,
  },
  input: {
    minHeight: 110,
    textAlignVertical: "top",
    padding: 14,
    borderWidth: 1,
    borderColor: "#a8bdb2",
    borderRadius: 10,
    fontSize: 17,
  },
  notice: { padding: 14, backgroundColor: "#e6f5ed", color: "#154334" },
  error: { padding: 14, backgroundColor: "#fff0e9", color: "#a23619" },
  badge: { color: "#17624e", fontWeight: "700" },
});
