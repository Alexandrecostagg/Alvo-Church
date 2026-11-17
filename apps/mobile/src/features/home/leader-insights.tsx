import { useEffect, useState } from "react";
import {
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { FirebaseAuthUser } from "@alvo/firebase";
import type { HomeEvolution } from "@alvo/domain";
type Props = {
  user: FirebaseAuthUser;
  orgId: string;
  apiOrigin: string;
  profile: string;
};
async function request<T>(
  p: Props,
  body: object,
  signal?: AbortSignal,
): Promise<T> {
  const r = await fetch(`${p.apiOrigin}/api/home`, {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${await p.user.getIdToken()}`,
    },
    body: JSON.stringify({
      ...body,
      organizationId: p.orgId,
      profile: p.profile,
    }),
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error || "Não foi possível carregar.");
  return data;
}
function Button({
  label,
  onPress,
  selected = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[s.button, selected && s.selected]}
    >
      <Text style={s.strong}>{label}</Text>
    </TouchableOpacity>
  );
}
export function MobileContact(
  p: Props & { personId: string; groupId?: string | null; reason: string },
) {
  const [link, setLink] = useState<{
      url: string;
      message?: string;
      address?: string;
      channel: string;
    }>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function prepare(channel: string) {
    setBusy(true);
    setError("");
    setLink(undefined);
    try {
      const r = await request<{
        url: string;
        message?: string;
        address?: string;
      }>(p, {
        action: "contact",
        personId: p.personId,
        groupId: p.groupId,
        reason: p.reason,
        channel,
      });
      setLink({ ...r, channel });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function open() {
    if (!link) return;
    const allowed =
      link.channel === "map"
        ? link.url.startsWith(
            "https://www.google.com/maps/search/?api=1&query=",
          )
        : link.url.startsWith("https://wa.me/");
    if (!allowed) return;
    try {
      await Linking.openURL(link.url);
    } catch {
      setError("Não foi possível abrir o aplicativo.");
    }
  }
  return (
    <View style={{ gap: 8 }}>
      <View style={s.wrap}>
        <Button
          disabled={busy}
          label="WhatsApp"
          onPress={() => void prepare("whatsapp")}
        />
        <Button
          disabled={busy}
          label="Mapa do endereço"
          onPress={() => void prepare("map")}
        />
      </View>
      {!!error && (
        <Text accessibilityRole="alert" style={s.note}>
          {error}
        </Text>
      )}
      {link && (
        <View style={s.box}>
          <Text style={s.text}>{link.message || link.address}</Text>
          <Button
            label={
              link.channel === "map"
                ? "Abrir Google Maps"
                : "Abrir WhatsApp com esta mensagem"
            }
            onPress={() => void open()}
          />
          <Text style={s.note}>
            Confira os dados antes de continuar. Abrir a conversa não confirma
            envio ou contato realizado.
          </Text>
        </View>
      )}
    </View>
  );
}
export function MobileLeaderInsights(
  p: Props & { care: number | null; revision: number },
) {
  const [data, setData] = useState<HomeEvolution>(),
    [error, setError] = useState(""),
    [tab, setTab] = useState("attention");
  useEffect(() => {
    const c = new AbortController();
    setData(undefined);
    setError("");
    request<HomeEvolution>(p, { action: "evolution" }, c.signal)
      .then((r) => {
        if (!c.signal.aborted) setData(r);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, [p.user, p.orgId, p.profile, p.apiOrigin, p.revision]);
  const meetings = data?.weeks.reduce((s, w) => s + w.meetings, 0) || 0,
    recorded = data?.weeks.reduce((s, w) => s + w.recorded, 0) || 0,
    present = data?.weeks.reduce((s, w) => s + w.present, 0) || 0,
    records =
      data?.weeks.reduce((s, w) => s + w.present + w.absent + w.justified, 0) ||
      0;
  return (
    <View style={s.box}>
      <Text style={s.title}>O pulso das suas células</Text>
      <View style={s.wrap}>
        <Button
          label="Atenção agora"
          selected={tab === "attention"}
          onPress={() => setTab("attention")}
        />
        <Button
          label="Evolução"
          selected={tab === "evolution"}
          onPress={() => setTab("evolution")}
        />
      </View>
      {!!error && (
        <Text accessibilityRole="alert" style={s.note}>
          {error}
        </Text>
      )}
      {!data && !error && <Text>Conferindo encontros…</Text>}
      {data && (
        <>
          <Text style={s.text}>
            Últimas 8 semanas · semana atual em andamento.
          </Text>
          {data.partial && (
            <Text style={s.note}>
              Amostra parcial: até 30 células e 100 encontros por célula (120 no
              total).
            </Text>
          )}
          <Text style={s.title}>
            {records ? `${Math.round((present / records) * 100)}%` : "—"} de
            presença nos registros
          </Text>
          <Text style={s.text}>
            {present} participações · {recorded}/{meetings} encontros com alguma
            chamada
          </Text>
          {tab === "attention" ? (
            <View style={s.alert}>
              <Text style={s.strong}>
                {p.care ?? "—"} contatos e ausências em aberto
              </Text>
              <Text style={s.strong}>
                {meetings - recorded} encontros sem chamada
              </Text>
              {data.groups
                .filter((g) => g.missing)
                .map((g) => (
                  <Text style={s.text} key={g.id}>
                    {g.name}: {g.missing} sem chamada
                  </Text>
                ))}
            </View>
          ) : (
            <>
              <Text style={s.strong}>Presenças por semana</Text>
              {data.weeks.map((w) => (
                <View
                  key={w.start}
                  accessible
                  accessibilityLabel={`${w.start}: ${w.recorded ? w.present : "sem chamada"} presenças`}
                  style={{ gap: 6 }}
                >
                  <Text style={s.text}>
                    {w.start.split("-").reverse().join("/")} ·{" "}
                    {w.recorded ? w.present : "—"}
                  </Text>
                  <View style={s.track}>
                    <View
                      style={{
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: "#387550",
                        width: `${w.recorded ? Math.max(1, (w.present / Math.max(1, ...data.weeks.map((x) => x.present))) * 100) : 0}%`,
                      }}
                    />
                  </View>
                  <Text style={s.note}>
                    {w.recorded}/{w.meetings} com chamada · {w.absent} ausências
                    registradas · {w.justified} justificadas
                  </Text>
                </View>
              ))}
            </>
          )}
          <Text style={s.note}>
            Presenças ÷ (presenças + ausências + justificativas registradas).
            Uma pessoa pode participar de vários encontros. Uma chamada iniciada
            pode estar incompleta. Sem registro não significa ausência.
          </Text>
        </>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  box: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: "#d8e5da",
  },
  title: { fontSize: 22, fontWeight: "800", color: "#214e3d" },
  strong: { fontSize: 14, fontWeight: "700", color: "#214e3d" },
  text: { fontSize: 14, lineHeight: 21, color: "#475f50" },
  note: { fontSize: 12, lineHeight: 18, color: "#6c6552" },
  button: {
    padding: 13,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#c4d6c6",
    justifyContent: "center",
  },
  selected: { backgroundColor: "#dcebdc" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  alert: { padding: 18, borderRadius: 14, backgroundColor: "#fff4dc", gap: 12 },
  track: { height: 12, backgroundColor: "#eef3ee", borderRadius: 6 },
});
