import { useEffect, useState } from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import type { FirebaseAuthUser } from "@alvo/firebase";
import {
  INTEGRATION_STAGES,
  INTEGRATION_LABELS,
  type IntegrationSummary,
  type PersonalIntegration,
} from "@alvo/domain";
export function MobileIntegration({
  user,
  orgId,
  apiOrigin,
  profile,
  revision,
}: {
  user: FirebaseAuthUser;
  orgId: string;
  apiOrigin: string;
  profile: string;
  revision: number;
}) {
  const [result, setResult] = useState<{
    key: string;
    summary?: IntegrationSummary;
    integration?: PersonalIntegration;
    error?: string;
    unlinked?: boolean;
  }>();
  const [tab, setTab] = useState("current");
  const personal = profile === "member",
    key = `${orgId}:${user.uid}:${profile}:${revision}`;
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const r = await fetch(
          `${apiOrigin}${personal ? "/api/mobile/member" : "/api/journeys"}`,
          {
            method: "POST",
            signal: controller.signal,
            headers: {
              "content-type": "application/json",
              Authorization: `Bearer ${await user.getIdToken()}`,
            },
            body: JSON.stringify({
              organizationId: orgId,
              action: personal ? "journey" : "summary",
              profile,
            }),
          },
        );
        const data = await r.json();
        if (!r.ok)
          throw Error(data.error || "Não foi possível carregar a integração.");
        if (!controller.signal.aborted)
          setResult(
            personal
              ? {
                  key,
                  integration: data.integration,
                  unlinked: data.status === "unlinked",
                }
              : { key, summary: data },
          );
      } catch (e) {
        if (!controller.signal.aborted)
          setResult({ key, error: (e as Error).message });
      }
    })();
    return () => controller.abort();
  }, [key, apiOrigin, user, orgId, profile, personal]);
  const data = result?.key === key ? result : undefined;
  const summary = data?.summary,
    integration = data?.integration;
  return (
    <View style={s.card}>
      <Text style={s.title}>
        {personal ? "Minha integração" : "Integração das pessoas"}
      </Text>
      {!data && <Text>Carregando integração…</Text>}
      {data?.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {data.error} Puxe o painel para atualizar.
        </Text>
      )}
      {data?.unlinked && (
        <Text>
          Peça à secretaria para vincular sua conta ao cadastro de membro.
        </Text>
      )}
      {integration && (
        <>
          <Text style={s.strong}>{integration.label}</Text>
          {integration.notice && <Text>{integration.notice}</Text>}
          <Text>
            Célula:{" "}
            {integration.cells.map((g) => g.name).join(", ") ||
              "Ainda sem célula vinculada"}
          </Text>
          {INTEGRATION_STAGES.map((st, i) => {
            const index = integration.stage
              ? INTEGRATION_STAGES.indexOf(integration.stage)
              : -1;
            return (
              <Text key={st} style={i === index ? s.strong : s.meta}>
                {i < index ? "✓ " : i === index ? "→ " : "○ "}
                {INTEGRATION_LABELS[st]}
              </Text>
            );
          })}
          <Text style={s.meta}>
            Sua liderança registra as etapas realizadas. Para combinar o próximo
            passo, converse com ela.
          </Text>
        </>
      )}
      {summary && (
        <>
          {summary.partial && (
            <Text style={s.error}>
              Consulta parcial: os números podem não incluir todos os registros.
            </Text>
          )}
          <View style={s.tabs}>
            {[
              ["current", "Situação atual"],
              ["history", "Evolução"],
            ].map(([id, label]) => (
              <TouchableOpacity
                key={id}
                accessibilityRole="button"
                accessibilityState={{ selected: tab === id }}
                onPress={() => setTab(id)}
                style={s.button}
              >
                <Text>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {tab === "current" ? (
            <>
              <Text>
                {summary.total} pessoas · {summary.needsContact} sem contato
                concluído
              </Text>
              <Text>
                {summary.withoutCell} sem célula · {summary.ready} decisões de
                membresia · {summary.pending} tarefas pendentes
              </Text>
              {summary.stages.map((st) => (
                <View
                  key={st.key}
                  accessible
                  accessibilityLabel={`${st.label}: ${st.value}`}
                >
                  <Text>
                    {st.label}: {st.value}
                  </Text>
                  <View style={s.track}>
                    <View
                      style={[
                        s.bar,
                        {
                          width: `${(100 * st.value) / Math.max(1, summary.total)}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </>
          ) : (
            <>
              <Text style={s.meta}>
                Transições registradas após a atualização, nas últimas oito
                semanas (UTC). O histórico antigo não é estimado.
              </Text>
              {summary.weeks.map((w) => (
                <View key={w.date}>
                  <Text>
                    {w.date.split("-").reverse().join("/")}: {w.transitions}{" "}
                    avanços · {w.completed} conclusões
                  </Text>
                  <View style={s.track}>
                    <View
                      style={[
                        s.bar,
                        {
                          width: `${(100 * w.transitions) / Math.max(1, ...summary.weeks.map((x) => x.transitions))}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </>
          )}
        </>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  card: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#fffdf8",
    borderWidth: 1,
    borderColor: "#d7e5dc",
    gap: 12,
  },
  title: { fontSize: 21, fontWeight: "800", color: "#173d30" },
  strong: { fontWeight: "700", color: "#175a3f", fontSize: 16 },
  meta: { color: "#526159", fontSize: 13, lineHeight: 20 },
  error: { color: "#a22e1b" },
  tabs: { flexDirection: "row", gap: 12 },
  button: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#b4cdbf",
    borderRadius: 9,
  },
  track: {
    height: 9,
    backgroundColor: "#e7eee9",
    borderRadius: 5,
    marginTop: 6,
  },
  bar: { height: 9, backgroundColor: "#26735a", borderRadius: 5 },
});
