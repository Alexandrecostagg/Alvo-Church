import {MobileCellReport} from "../groups/cell-report";
import { MobileIntegration } from "./integration";
import { MobileContact, MobileLeaderInsights } from "./leader-insights";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  AppState,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Modal,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Crypto from "expo-crypto";
import {
  HOME_PROFILE_LABELS,
  type HomeProfile,
  type RoleHomeSnapshot,
  type HomeGroupDetail,
} from "@alvo/domain";
import type { FirebaseAuthUser } from "@alvo/firebase";

type Props = {
  user: FirebaseAuthUser;
  orgId: string;
  apiOrigin: string;
  primary: string;
};
function useApi({ user, orgId, apiOrigin }: Props, endpoint = "/api/home") {
  return useCallback(
    async <T,>(
      body: Record<string, unknown>,
      signal?: AbortSignal,
    ): Promise<T> => {
      const r = await fetch(`${apiOrigin}${endpoint}`, {
        method: "POST",
        signal,
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ ...body, organizationId: orgId }),
      });
      const result = await r.json();
      if (!r.ok)
        throw Error(
          result.error || "Não foi possível carregar. Tente novamente.",
        );
      return result;
    },
    [user, orgId, apiOrigin, endpoint],
  );
}
function Button({
  label,
  onPress,
  disabled = false,
  selected = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={[s.button, selected && s.selected, disabled && { opacity: 0.5 }]}
    >
      <Text style={s.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}
export function MobileRoleHome(
  props: Props & {
    children: ReactNode;
    externalRevision?: number;
    onAction: (key: string, profile: HomeProfile) => boolean;
  },
) {
  const call = useApi(props);
  const journeyCall = useApi(props, "/api/journeys");
  const [profile, setProfile] = useState<HomeProfile>();
  const [period, setPeriod] = useState("week"),
    [revision, setRevision] = useState(0);
  const [data, setData] = useState<RoleHomeSnapshot>();
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setData(undefined);
    setError("");
    call<RoleHomeSnapshot>(
      { action: "overview", profile, birthdayPeriod: period },
      controller.signal,
    )
      .then((r) => {
        if (!controller.signal.aborted) setData(r);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [call, profile, period, revision, props.externalRevision]);
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") setRevision((n) => n + 1);
    });
    return () => listener.remove();
  }, []);
  async function action(key: string, href: string) {
    if (key === "absence") {
      setRecording(true);
      return;
    }
    if (
      !["/groups", "/serving"].includes(href) ||
      data?.profile === "member" ||
      data?.profile === "cell_leader"
    ) {
      if (props.onAction(key, data!.profile)) return;
    }
    // These are fixed application routes. Do not forward arbitrary provider URLs.
    const webRoutes = new Set([
      "/network",
      "/members",
      "/reception",
      "/groups",
      "/campaigns",
      "/finance",
      "/giving",
      "/communication",
      "/operations",
      "/serving",
      "/me",
    ]);
    if (!webRoutes.has(href)) return;
    try {
      await Linking.openURL(`${props.apiOrigin}${href}`);
    } catch {
      setError("Não foi possível abrir a gestão web.");
    }
  }
  async function completeTask(t: RoleHomeSnapshot["tasks"][number]) {
    if (busy || !t.personId) return;
    setBusy(true);
    setError("");
    try {
      await journeyCall({
        action: "task-status",
        profile: data!.profile,
        personId: t.personId,
        taskId: t.id,
        expectedTaskRevision: t.revision || 0,
        status: "completed",
        requestId: Crypto.randomUUID(),
      });
      setRevision((n) => n + 1);
      setMessage("Acompanhamento concluído.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function contacted(id: string) {
    setBusy(true);
    setError("");
    try {
      await call({ action: "close-absence", profile: data!.profile, id });
      setRevision((n) => n + 1);
      setMessage("Contato registrado.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => setRevision((n) => n + 1)}
            tintColor={props.primary}
          />
        }
      >
        {loading && (
          <ActivityIndicator
            color={props.primary}
            accessibilityLabel="Carregando meu painel"
          />
        )}
        {!!error && (
          <Text accessibilityRole="alert" style={s.notice}>
            {error}
          </Text>
        )}
        {!loading && !data && (
          <Button
            label="Tentar novamente"
            onPress={() => setRevision((n) => n + 1)}
          />
        )}
        {data && (
          <>
            <Text style={s.title}>{HOME_PROFILE_LABELS[data.profile]}</Text>
            <Text style={s.meta}>{data.scopeLabel}</Text>
            {data.profiles.length > 1 && (
              <View style={s.wrap}>
                {data.profiles.map((p) => (
                  <Button
                    key={p}
                    label={HOME_PROFILE_LABELS[p]}
                    selected={data.profile === p}
                    onPress={() => {
                      setProfile(p);
                      setRecording(false);
                      setMessage("");
                    }}
                  />
                ))}
              </View>
            )}
            {data.warnings.map((w) => (
              <Text style={s.notice} key={w}>
                {w}
              </Text>
            ))}
            <View style={s.wrap}>
              {data.metrics.map((m) => (
                <View key={m.key} style={s.metric}>
                  <Text style={s.number}>
                    {m.value === null ? "—" : m.value}
                  </Text>
                  <Text style={s.meta}>{m.label}</Text>
                </View>
              ))}
            </View>
            {["pastoral", "administration", "cell_leader"].includes(
              data.profile,
            ) &&
              data.actions.some((a) => a.key === "groups") && (
                <MobileLeaderInsights
                  {...props}
                  profile={data.profile}
                  care={
                    data.metrics.find((m) => m.key === "care")?.value ?? null
                  }
                  revision={revision}
                />
              )}
            {data.integrationEnabled && data.profile !== "network" && (
              <MobileIntegration
                {...props}
                profile={data.profile}
                revision={revision + (props.externalRevision || 0)}
              />
            )}
            <Text style={s.heading}>Acessos rápidos</Text>
            <View style={s.wrap}>
              {data.actions.map((a) => (
                <Button
                  key={a.key}
                  label={`${a.title}${["people", "reception", "finance", "operations", "network", "campaigns"].includes(a.key) ? " · web" : ""}`}
                  onPress={() => void action(a.key, a.href)}
                />
              ))}
            </View>
            {!!message && (
              <Text accessibilityRole="alert" style={s.notice}>
                {message}
              </Text>
            )}
            {data.actions.some((a) => a.key === "absence") && (
              <View style={s.card}>
                <Text style={s.heading}>Quem precisa de cuidado</Text>
                <Text style={s.meta}>
                  Registro humano. A falta de check-in não indica ausência por
                  si só.
                </Text>
                {!data.absences.length && (
                  <Text style={s.meta}>Nenhum acompanhamento em aberto.</Text>
                )}
                {data.absences.map((a) => (
                  <View key={a.id} style={s.row}>
                    <Text style={s.strong}>{a.name}</Text>
                    <Text style={s.meta}>
                      {a.date.split("-").reverse().join("/")}
                    </Text>
                    {!!a.note && <Text style={s.meta}>{a.note}</Text>}
                    <MobileContact
                      {...props}
                      profile={data.profile}
                      personId={a.personId}
                      groupId={a.groupId}
                      reason="care"
                    />
                    <Button
                      label="Já realizei o contato"
                      disabled={busy}
                      onPress={() => void contacted(a.id)}
                    />
                  </View>
                ))}
              </View>
            )}
            {recording && (
              <Modal
                visible
                animationType="slide"
                onRequestClose={() => setRecording(false)}
              >
                <SafeAreaView style={{ flex: 1, backgroundColor: "#f4f8f4" }}>
                  <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                  >
                    <ScrollView
                      contentContainerStyle={s.content}
                      keyboardShouldPersistTaps="handled"
                    >
                      <MobileAbsence
                        {...props}
                        data={data}
                        onClose={() => setRecording(false)}
                        onSaved={() => {
                          setRecording(false);
                          setMessage(
                            "Ausência registrada para acompanhamento.",
                          );
                          setRevision((n) => n + 1);
                        }}
                      />
                    </ScrollView>
                  </KeyboardAvoidingView>
                </SafeAreaView>
              </Modal>
            )}
            {["pastoral", "administration", "cell_leader"].includes(
              data.profile,
            ) && (
              <View style={s.card}>
                <Text style={s.heading}>Aniversariantes</Text>
                <View style={s.wrap}>
                  {[
                    ["today", "Hoje"],
                    ["week", "7 dias"],
                    ["month", "Este mês"],
                  ].map(([value, label]) => (
                    <Button
                      key={value}
                      label={label}
                      selected={period === value}
                      onPress={() => setPeriod(value)}
                    />
                  ))}
                </View>
                {data.birthdays.length ? (
                  data.birthdays.map((p) => (
                    <View key={p.id} style={{ gap: 10 }}>
                      <Text style={s.meta}>
                        {p.date} · {p.name}
                      </Text>
                      <MobileContact
                        {...props}
                        profile={data.profile}
                        personId={p.id}
                        groupId={p.groupId}
                        reason="birthday"
                      />
                    </View>
                  ))
                ) : (
                  <Text style={s.meta}>Nenhum aniversário neste período.</Text>
                )}
              </View>
            )}
            {data.profile === "network" && (
              <View style={s.card}>
                <Text style={s.heading}>Igrejas da rede</Text>
                {!data.churches.length && (
                  <Text style={s.meta}>Nenhum vínculo ativo confirmado.</Text>
                )}
                {data.churches.map((c) => (
                  <View key={c.id} style={s.row}>
                    <Text style={s.strong}>{c.name}</Text>
                    <Text style={s.meta}>
                      {c.members ?? "—"} membros · {c.groups ?? "—"} células
                    </Text>
                    <Text style={s.meta}>
                      {c.date
                        ? `Consolidado: ${c.date}`
                        : "Aguardando indicadores"}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            {!!data.tasks.length && (
              <View style={s.card}>
                <Text style={s.heading}>Acompanhamentos</Text>
                {data.tasks.map((t) => (
                  <View key={t.id} style={s.card}>
                    <Text style={s.strong}>
                      {t.personName} · {t.title}
                    </Text>
                    <Text style={s.meta}>
                      {t.status === "in_progress" ? "Em andamento" : "Aberto"}
                      {t.dueAt
                        ? ` · ${new Date(t.dueAt).toLocaleString("pt-BR")}`
                        : ""}
                    </Text>
                    <Button
                      label="Registrar conclusão"
                      disabled={busy}
                      onPress={() => void completeTask(t)}
                    />
                  </View>
                ))}
              </View>
            )}
            {data.profile === "member"
              ? props.children
              : data.events.length > 0 && (
                  <View style={s.card}>
                    <Text style={s.heading}>Próximos eventos</Text>
                    {data.events.map((e) => (
                      <View style={s.row} key={e.id}>
                        <Text style={s.strong}>{e.name}</Text>
                        <Text style={s.meta}>
                          {new Date(e.startsAt).toLocaleString("pt-BR", {
                            timeZone: data.timezone,
                          })}
                        </Text>
                      </View>
                    ))}
                    <Button
                      label="Abrir agenda"
                      onPress={() => props.onAction("events", data.profile)}
                    />
                  </View>
                )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
function MobileAbsence(
  props: Props & {
    data: RoleHomeSnapshot;
    onClose: () => void;
    onSaved: () => void;
  },
) {
  const call = useApi(props),
    leader = props.data.profile === "cell_leader";
  const [groupId, setGroup] = useState(props.data.groups[0]?.id || "");
  const [people, setPeople] = useState<Array<{ id: string; name: string }>>([]),
    [personId, setPerson] = useState("");
  const [search, setSearch] = useState(""),
    [date, setDate] = useState(""),
    [note, setNote] = useState("");
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!leader || !groupId) return;
    const controller = new AbortController();
    setPeople([]);
    setPerson("");
    call<HomeGroupDetail>(
      { action: "group-detail", profile: props.data.profile, groupId },
      controller.signal,
    )
      .then((r) => {
        if (!controller.signal.aborted) setPeople(r.people);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [call, groupId, leader, props.data.profile]);
  async function searchPeople() {
    setBusy(true);
    setError("");
    setPerson("");
    try {
      const r = await call<{ people: typeof people; partial: boolean }>({
        action: "search-people",
        profile: props.data.profile,
        search,
      });
      setPeople(r.people);
      if (r.partial)
        setError("Busca rápida incompleta. Consulte o cadastro na gestão web.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      await call({
        action: "absence",
        profile: props.data.profile,
        groupId: leader ? groupId : undefined,
        personId,
        date,
        note,
      });
      props.onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={s.card}>
      <Text style={s.heading}>Registrar ausência percebida</Text>
      <Text style={s.meta}>
        Evite informações sensíveis. Este registro não envia mensagens.
      </Text>
      {leader ? (
        <View style={s.wrap}>
          {props.data.groups.map((g) => (
            <Button
              key={g.id}
              label={g.name}
              selected={groupId === g.id}
              onPress={() => setGroup(g.id)}
            />
          ))}
        </View>
      ) : (
        <>
          <TextInput
            accessibilityLabel="Buscar pessoa pelo nome"
            style={s.input}
            placeholder="Nome da pessoa"
            value={search}
            onChangeText={setSearch}
            maxLength={80}
          />
          <Button
            label="Buscar pessoa"
            disabled={busy || search.trim().length < 2}
            onPress={() => void searchPeople()}
          />
        </>
      )}
      <Text style={s.strong}>Pessoa</Text>
      <View style={s.wrap}>
        {people.map((p) => (
          <Button
            key={p.id}
            label={p.name}
            selected={personId === p.id}
            onPress={() => setPerson(p.id)}
          />
        ))}
      </View>
      <TextInput
        style={s.input}
        accessibilityLabel="Data da ausência no formato ano mês dia"
        placeholder="Data: AAAA-MM-DD"
        value={date}
        onChangeText={setDate}
        maxLength={10}
      />
      <TextInput
        style={[s.input, { minHeight: 100, textAlignVertical: "top" }]}
        accessibilityLabel="Observação opcional"
        placeholder="Observação (opcional)"
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={500}
      />
      {!!error && (
        <Text accessibilityRole="alert" style={s.notice}>
          {error}
        </Text>
      )}
      <Button
        label={busy ? "Salvando…" : "Salvar acompanhamento"}
        disabled={busy || !personId || !date}
        onPress={() => void save()}
      />
      <Button label="Cancelar" onPress={props.onClose} />
    </View>
  );
}
export function MobileScopedGroups(
  props: Props & { profile: HomeProfile; externalRevision?: number; onPrepare?: (groupId:string) => void },
) {
  const call = useApi(props);
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]),
    [groupId, setGroup] = useState("");
  const [detail, setDetail] = useState<HomeGroupDetail>(),
    [meetingId, setMeeting] = useState<string>();
  const [revision, setRevision] = useState(0),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [creating, setCreating] = useState(false);
  const [date, setDate] = useState(""),
    [time, setTime] = useState("19:30");
  const createAttempt = useRef<{ signature: string; id: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    call<{ groups: typeof groups }>(
      { action: "my-groups", profile: props.profile },
      controller.signal,
    )
      .then((r) => {
        if (!controller.signal.aborted) {
          setGroups(r.groups);
          setGroup(current=>r.groups.some(g=>g.id===current)?current:r.groups[0]?.id || "");
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [call, props.profile, revision, props.externalRevision]);
  useEffect(() => {
    setDetail(undefined);
    if (!groupId) return;
    const controller = new AbortController();
    setLoading(true);
    call<HomeGroupDetail>(
      { action: "group-detail", profile: props.profile, groupId, meetingId },
      controller.signal,
    )
      .then((r) => {
        if (!controller.signal.aborted) setDetail(r);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [call, groupId, meetingId, revision, props.profile, props.externalRevision]);
  async function create() {
    setBusy(true);
    setError("");
    const signature = `${groupId}:${date}:${time}`;
    if (createAttempt.current?.signature !== signature)
      createAttempt.current = { signature, id: Crypto.randomUUID() };
    try {
      const r = await call<{ id: string }>({
        action: "create-meeting",
        profile: props.profile,
        groupId,
        requestId: createAttempt.current.id,
        date,
        time,
      });
      createAttempt.current = null;
      setMeeting(r.id);
      setCreating(false);
      setRevision((n) => n + 1);
      setMessage("Encontro criado.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function mark(p: HomeGroupDetail["people"][number], status: string) {
    setBusy(true);
    setError("");
    try {
      await call({
        action: "attendance",
        profile: props.profile,
        groupId,
        meetingId: detail!.meetingId,
        personId: p.id,
        expectedStatus: p.status,
        status,
      });
      setRevision((n) => n + 1);
      setMessage(`Presença de ${p.name} salva.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const labels: Record<string, string> = {
    present: "Presente",
    absent: "Ausente",
    justified: "Justificou",
    first_time_guest: "Primeira visita",
  };
  return (
    <ScrollView
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={s.title}>Minhas células · liderança</Text>
      {props.onPrepare && groupId && (
        <Button label="Preparar encontro com IA" onPress={()=>props.onPrepare?.(groupId)} />
      )}
      <Text style={s.meta}>
        Somente as células em que seu cadastro está vinculado como responsável.
      </Text>
      {loading && <ActivityIndicator color={props.primary} />}
      {!!error && (
        <Text accessibilityRole="alert" style={s.notice}>
          {error}
        </Text>
      )}
      {!!message && (
        <Text accessibilityRole="alert" style={s.notice}>
          {message}
        </Text>
      )}
      <Button
        label="Atualizar encontros"
        onPress={() => setRevision((n) => n + 1)}
      />
      {!loading && !groups.length && (
        <Text style={s.meta}>
          Peça à secretaria para conferir o vínculo da sua conta e sua
          responsabilidade na célula.
        </Text>
      )}
      <View style={s.wrap}>
        {groups.map((g) => (
          <Button
            key={g.id}
            label={g.name}
            selected={groupId === g.id}
            onPress={() => {
              setGroup(g.id);
              setMeeting(undefined);
              setError("");
            }}
          />
        ))}
      </View>
      {!!groupId && (
        <Button
          label={creating ? "Fechar formulário" : "+ Novo encontro"}
          onPress={() => setCreating((v) => !v)}
        />
      )}
      {creating && (
        <View style={s.card}>
          <Text style={s.heading}>Novo encontro</Text>
          <Text style={s.meta}>Fuso: {detail?.timezone || "da igreja"}</Text>
          <TextInput
            style={s.input}
            accessibilityLabel="Data do encontro no formato ano mês dia"
            placeholder="AAAA-MM-DD"
            value={date}
            onChangeText={setDate}
            maxLength={10}
          />
          <TextInput
            style={s.input}
            accessibilityLabel="Horário do encontro"
            placeholder="HH:MM"
            value={time}
            onChangeText={setTime}
            maxLength={5}
          />
          <Button
            label="Criar encontro"
            disabled={busy || !date}
            onPress={() => void create()}
          />
        </View>
      )}
      {!!groupId&&<MobileCellReport key={groupId} apiOrigin={props.apiOrigin} user={props.user} orgId={props.orgId} groupId={groupId} primary={props.primary} draft={null}/> }
      {detail && (
        <>
          <Text style={s.heading}>Encontro</Text>
          <ScrollView horizontal>
            {detail.meetings.map((m) => (
              <Button
                key={m.id}
                label={new Date(m.startsAt).toLocaleString("pt-BR", {
                  timeZone: detail.timezone,
                })}
                selected={detail.meetingId === m.id}
                onPress={() => setMeeting(m.id)}
              />
            ))}
          </ScrollView>
          <Text style={s.meta}>
            Últimos 25 encontros. O histórico completo está na gestão web. Registro a partir de 3 horas antes, até 90
            dias depois.
          </Text>
          {!detail.meetings.length && (
            <Text style={s.meta}>Cadastre o primeiro encontro.</Text>
          )}
          {detail.people.map((p) => (
            <View key={p.id} style={s.card}>
              <Text style={s.strong}>{p.name}</Text>
              <Text style={s.meta}>
                {p.status ? labels[p.status] : "Sem registro"}
              </Text>
              <View style={s.wrap}>
                {Object.entries(labels).map(([value, label]) => (
                  <Button
                    key={value}
                    label={label}
                    selected={p.status === value}
                    disabled={busy || !detail.meetingId}
                    onPress={() => void mark(p, value)}
                  />
                ))}
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  content: { padding: 18, gap: 16, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: "800", color: "#173d30" },
  heading: { fontSize: 19, fontWeight: "700", color: "#173d30" },
  strong: { fontSize: 16, fontWeight: "700", color: "#173d30" },
  meta: { fontSize: 14, lineHeight: 21, color: "#53665d" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: {
    minWidth: 140,
    flexGrow: 1,
    flexBasis: "45%",
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#f3efdf",
    gap: 6,
  },
  number: { fontSize: 30, fontWeight: "800", color: "#173d30" },
  button: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#b5c9bc",
    borderRadius: 12,
    padding: 13,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  buttonText: { fontSize: 14, fontWeight: "600", color: "#204b3a" },
  selected: {
    backgroundColor: "#dcebdc",
    borderColor: "#235e40",
    borderWidth: 2,
  },
  card: {
    backgroundColor: "white",
    padding: 18,
    gap: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#dce5dd",
  },
  row: {
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e7ece7",
  },
  notice: {
    backgroundColor: "#fff4df",
    color: "#704c1f",
    padding: 14,
    borderRadius: 12,
    fontSize: 14,
    lineHeight: 21,
  },
  input: {
    padding: 14,
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#a5bdae",
    borderRadius: 10,
    fontSize: 16,
    color: "#173d30",
    backgroundColor: "#fff",
  },
});
