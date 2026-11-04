import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { FirebaseAuthUser } from "@alvo/firebase";
export function CampaignMemberScreen({
  user,
  orgId,
  primary,
  apiOrigin,
  onBack,
}: {
  user: FirebaseAuthUser;
  orgId: string;
  primary: string;
  apiOrigin: string;
  onBack: () => void;
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const call = useCallback(
    async (body: object) => {
      const controller = new AbortController(),
        timer = setTimeout(() => controller.abort(), 20000);
      try {
        const r = await fetch(`${apiOrigin}/api/campaigns`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
          body: JSON.stringify({ organizationId: orgId, ...body }),
          signal: controller.signal,
        });
        const d = await r.json();
        if (!r.ok)
          throw Error(d.error || "Não foi possível carregar os convites.");
        return d;
      } finally {
        clearTimeout(timer);
      }
    },
    [user, orgId, apiOrigin],
  );
  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      setData(await call({ action: "missions" }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [call]);
  useEffect(() => {
    void load();
  }, [load]);
  async function create(id: string) {
    setBusy(true);
    setError("");
    try {
      await call({ action: "my-link", campaignId: id });
      await load();
      setNotice(
        "Convite criado. Compartilhe pessoalmente com quem deseja convidar.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const button = {
    padding: 14,
    borderRadius: 10,
    backgroundColor: primary,
    marginVertical: 8,
  };
  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
      refreshControl={
        <RefreshControl refreshing={busy} onRefresh={() => void load()} />
      }
    >
      <TouchableOpacity
        accessibilityRole="button"
        onPress={onBack}
        style={{ paddingVertical: 12 }}
      >
        <Text style={{ color: primary, fontWeight: "700" }}>← Voltar</Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 28, fontWeight: "800", color: "#152d25" }}>
        Meus convidados
      </Text>
      <Text style={{ lineHeight: 23, marginVertical: 12 }}>
        Sua missão de acolhimento. Cada convidado pode participar sem baixar
        aplicativo.
      </Text>
      {!!error && (
        <Text
          accessibilityRole="alert"
          style={{ color: "#9c2525", marginVertical: 12 }}
        >
          {error}
        </Text>
      )}
      {!!notice && <Text accessibilityLiveRegion="polite">{notice}</Text>}
      {busy && !data && <ActivityIndicator color={primary} />}
      <TouchableOpacity
        accessibilityRole="button"
        disabled={busy}
        style={button}
        onPress={() => void load()}
      >
        <Text style={{ color: "white", fontWeight: "700" }}>
          Atualizar campanhas
        </Text>
      </TouchableOpacity>
      {data?.campaigns.length === 0 && (
        <Text style={{ marginTop: 20 }}>
          A igreja ainda não abriu uma campanha de convites.
        </Text>
      )}
      {data?.campaigns.map((c: any) => (
        <View
          key={c.id}
          style={{
            padding: 18,
            borderWidth: 1,
            borderColor: "#cfddd5",
            backgroundColor: "white",
            borderRadius: 16,
            marginTop: 18,
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: "800" }}>{c.name}</Text>
          {c.invitesOpen === false && (
            <Text style={{ marginVertical: 8, color: primary }}>
              Convites abrem em{" "}
              {c.inviteStartDate.split("-").reverse().join("/")}
            </Text>
          )}
          <Text style={{ marginVertical: 8 }}>
            Sua missão: convidar {c.goal} pessoa(s).
          </Text>
          <Text>
            {c.event.name} ·{" "}
            {new Date(c.event.startsAt).toLocaleString("pt-BR", {
              timeZone: c.timezone,
            })}
          </Text>
          <Text style={{ marginVertical: 8 }}>{c.event.location}</Text>
          {c.link ? (
            <>
              <TextInput
                accessibilityLabel="Seu link de convite"
                value={`${apiOrigin}${c.link}`}
                editable={false}
                selectTextOnFocus
                style={{
                  borderWidth: 1,
                  borderColor: "#a6b9ad",
                  padding: 12,
                  borderRadius: 8,
                  color: "#1b4432",
                }}
              />
              <TouchableOpacity
                accessibilityRole="button"
                style={button}
                disabled={busy}
                onPress={() => {
                  void Share.share({
                    message: `Você é meu convidado para ${c.event.name}! Veja os detalhes e confirme sua presença: ${apiOrigin}${c.link}`,
                  }).catch(() =>
                    setError(
                      "Não foi possível abrir o compartilhamento. Copie seu link acima.",
                    ),
                  );
                }}
              >
                <Text style={{ color: "white", fontWeight: "700" }}>
                  Compartilhar meu convite
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              accessibilityRole="button"
              disabled={busy || c.invitesOpen === false}
              style={[button, { opacity: c.invitesOpen === false ? 0.5 : 1 }]}
              onPress={() => void create(c.id)}
            >
              <Text style={{ color: "white", fontWeight: "700" }}>
                Criar meu convite
              </Text>
            </TouchableOpacity>
          )}
          <Text style={{ fontWeight: "700", marginTop: 16 }}>
            Inscrições pelo seu convite: {c.guests.length}
            {c.hasMore ? "+" : ""}
          </Text>
          {c.guests.map((g: any) => (
            <Text key={g.id} style={{ marginTop: 10, lineHeight: 22 }}>
              {g.name} ·{" "}
              {(
                {
                  invited: "Convidado",
                  confirmed: "Presença confirmada",
                  declined: "Não irá",
                  attended: "Compareceu",
                  reserved: "Cadastro reservado",
                } as Record<string, string>
              )[g.status] || g.status}
            </Text>
          ))}
          <Text style={{ marginTop: 16, lineHeight: 21, color: "#596d60" }}>
            Cada pessoa escolhe se compartilha seu primeiro nome e sua resposta.
            O telefone fica com a equipe da igreja.
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
