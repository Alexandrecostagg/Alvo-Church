import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import {
  createFirebaseRuntimeConfigFromEnv,
  fetchOrganizationBySlug,
  fetchTenantRuntimeSnapshot,
  fetchEvents,
  fetchGroups,
  isFirebaseWebRuntimeConfigured,
  registerWithFirebaseMobileEmailPassword,
  signInWithFirebaseMobileEmailPassword,
  signOutFromFirebaseMobile,
  subscribeToFirebaseMobileAuthState,
  type FirebaseAuthUser
} from "@alvo/firebase";
import type { Event, Group, Organization, OrganizationSettingsSnapshot, TenantRuntimeSnapshot } from "@alvo/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen =
  | "splash"
  | "welcome"
  | "login"
  | "register"
  | "link-institution"
  | "main";

type Tab = "inicio" | "celula" | "agenda" | "perfil";

// ─── Config ───────────────────────────────────────────────────────────────────

const runtimeEnv =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

const firebaseConfig = createFirebaseRuntimeConfigFromEnv(runtimeEnv, "EXPO_PUBLIC");

const BRAND_COLOR = "#d27836";
const BRAND_DARK = "#1c2433";
const BRAND_SURFACE = "#f7f3ea";
const BRAND_ACCENT = "#e8dcc7";

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // linked institution
  const [linkedOrg, setLinkedOrg] = useState<Organization | null>(null);
  const [tenantRuntime, setTenantRuntime] = useState<TenantRuntimeSnapshot | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [dataReady, setDataReady] = useState(false);

  const configured = isFirebaseWebRuntimeConfigured(firebaseConfig);

  // auth listener
  useEffect(() => {
    if (!configured) {
      setAuthReady(true);
      setScreen("welcome");
      return;
    }

    const unsub = subscribeToFirebaseMobileAuthState(firebaseConfig, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser) {
        setScreen("main");
      } else {
        setScreen("welcome");
      }
    });

    return () => unsub();
  }, [configured]);

  // load tenant data when logged in
  useEffect(() => {
    if (!user || !configured) {
      setDataReady(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        // Use linked org or fallback to default
        const orgId = linkedOrg?.id ?? "org_alvo_demo";
        const context = { organizationId: orgId };
        const [snapshot, nextEvents, nextGroups] = await Promise.all([
          fetchTenantRuntimeSnapshot(firebaseConfig, context),
          fetchEvents(firebaseConfig, context, 8),
          fetchGroups(firebaseConfig, context, 8)
        ]);
        if (!cancelled) {
          setTenantRuntime(snapshot);
          setEvents(nextEvents);
          setGroups(nextGroups);
          setDataReady(true);
        }
      } catch {
        if (!cancelled) setDataReady(true);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [user, linkedOrg, configured]);

  async function handleSignOut() {
    try {
      await signOutFromFirebaseMobile(firebaseConfig);
      setLinkedOrg(null);
      setTenantRuntime(null);
      setEvents([]);
      setGroups([]);
      setDataReady(false);
      setScreen("welcome");
    } catch {}
  }

  if (!authReady || screen === "splash") {
    return <SplashScreen />;
  }

  if (screen === "welcome") {
    return (
      <WelcomeScreen
        onLogin={() => setScreen("login")}
        onRegister={() => setScreen("register")}
      />
    );
  }

  if (screen === "login") {
    return (
      <LoginScreen
        configured={configured}
        onBack={() => setScreen("welcome")}
        onSuccess={() => setScreen("main")}
        onRegister={() => setScreen("register")}
      />
    );
  }

  if (screen === "register") {
    return (
      <RegisterScreen
        configured={configured}
        onBack={() => setScreen("welcome")}
        onSuccess={() => setScreen("link-institution")}
        onLogin={() => setScreen("login")}
      />
    );
  }

  if (screen === "link-institution") {
    return (
      <LinkInstitutionScreen
        configured={configured}
        onLink={(org) => {
          setLinkedOrg(org);
          setScreen("main");
        }}
        onSkip={() => setScreen("main")}
      />
    );
  }

  // main app
  return (
    <MainApp
      user={user!}
      tenantRuntime={tenantRuntime}
      events={events}
      groups={groups}
      dataReady={dataReady}
      linkedOrg={linkedOrg}
      onSignOut={handleSignOut}
    />
  );
}

// ─── Splash ───────────────────────────────────────────────────────────────────

function SplashScreen() {
  return (
    <SafeAreaView style={s.fill}>
      <StatusBar style="light" />
      <View style={[s.fill, s.center, { backgroundColor: BRAND_DARK }]}>
        <View style={s.logoMark}>
          <Text style={s.logoText}>A</Text>
        </View>
        <ActivityIndicator color={BRAND_COLOR} style={{ marginTop: 32 }} />
      </View>
    </SafeAreaView>
  );
}

// ─── Welcome ──────────────────────────────────────────────────────────────────

function WelcomeScreen({
  onLogin,
  onRegister
}: {
  onLogin: () => void;
  onRegister: () => void;
}) {
  return (
    <SafeAreaView style={s.fill}>
      <StatusBar style="dark" />
      <View style={[s.fill, { backgroundColor: BRAND_SURFACE }]}>
        <View style={s.welcomeHero}>
          <View style={[s.logoMark, { backgroundColor: BRAND_COLOR }]}>
            <Text style={s.logoText}>A</Text>
          </View>
          <Text style={s.welcomeTitle}>Bem-vindo{"\n"}à sua Igreja</Text>
          <Text style={s.welcomeSubtitle}>
            Conecte-se, cresça e sirva com a sua comunidade de fé.
          </Text>
        </View>

        <View style={s.welcomeActions}>
          <Pressable
            style={({ pressed }) => [s.btnPrimary, pressed && s.btnPressed]}
            onPress={onRegister}
          >
            <Text style={s.btnPrimaryText}>Criar conta</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.btnSecondary, pressed && s.btnPressed]}
            onPress={onLogin}
          >
            <Text style={s.btnSecondaryText}>Já tenho conta</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────

function LoginScreen({
  configured,
  onBack,
  onSuccess,
  onRegister
}: {
  configured: boolean;
  onBack: () => void;
  onSuccess: () => void;
  onRegister: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email.trim() || !password || loading) return;
    try {
      setLoading(true);
      setError(null);
      await signInWithFirebaseMobileEmailPassword({
        config: firebaseConfig,
        email: email.trim(),
        password
      });
      onSuccess();
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.fill}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={s.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.screenHeader}>
          <TouchableOpacity onPress={onBack} hitSlop={12}>
            <Text style={s.backBtn}>← Voltar</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.formContent} keyboardShouldPersistTaps="handled">
          <Text style={s.screenTitle}>Entrar</Text>
          <Text style={s.screenSubtitle}>Acesse sua conta para continuar.</Text>

          {!configured && (
            <View style={s.warningBox}>
              <Text style={s.warningText}>Firebase não configurado. Use variáveis EXPO_PUBLIC_*.</Text>
            </View>
          )}

          <View style={s.formGroup}>
            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={s.formGroup}>
            <Text style={s.label}>Senha</Text>
            <TextInput
              style={s.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
              secureTextEntry
            />
          </View>

          {error && <Text style={s.errorText}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [s.btnPrimary, pressed && s.btnPressed, loading && s.btnDisabled]}
            onPress={submit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnPrimaryText}>Entrar</Text>
            }
          </Pressable>

          <TouchableOpacity onPress={onRegister} style={s.linkRow}>
            <Text style={s.linkText}>Não tem conta? <Text style={s.linkBold}>Criar conta</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Register ─────────────────────────────────────────────────────────────────

function RegisterScreen({
  configured,
  onBack,
  onSuccess,
  onLogin
}: {
  configured: boolean;
  onBack: () => void;
  onSuccess: () => void;
  onLogin: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim() || !email.trim() || !password || loading) return;
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter ao menos 6 caracteres.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await registerWithFirebaseMobileEmailPassword({
        config: firebaseConfig,
        email: email.trim(),
        password,
        displayName: name.trim()
      });
      onSuccess();
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.fill}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={s.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.screenHeader}>
          <TouchableOpacity onPress={onBack} hitSlop={12}>
            <Text style={s.backBtn}>← Voltar</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.formContent} keyboardShouldPersistTaps="handled">
          <Text style={s.screenTitle}>Criar conta</Text>
          <Text style={s.screenSubtitle}>Preencha seus dados para começar.</Text>

          {!configured && (
            <View style={s.warningBox}>
              <Text style={s.warningText}>Firebase não configurado. Use variáveis EXPO_PUBLIC_*.</Text>
            </View>
          )}

          <View style={s.formGroup}>
            <Text style={s.label}>Nome completo</Text>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="Seu nome"
              placeholderTextColor="#9ca3af"
              autoCapitalize="words"
            />
          </View>

          <View style={s.formGroup}>
            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={s.formGroup}>
            <Text style={s.label}>Senha</Text>
            <TextInput
              style={s.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="#9ca3af"
              secureTextEntry
            />
          </View>

          <View style={s.formGroup}>
            <Text style={s.label}>Confirmar senha</Text>
            <TextInput
              style={s.input}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Repita a senha"
              placeholderTextColor="#9ca3af"
              secureTextEntry
            />
          </View>

          {error && <Text style={s.errorText}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [s.btnPrimary, pressed && s.btnPressed, loading && s.btnDisabled]}
            onPress={submit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnPrimaryText}>Criar conta</Text>
            }
          </Pressable>

          <TouchableOpacity onPress={onLogin} style={s.linkRow}>
            <Text style={s.linkText}>Já tem conta? <Text style={s.linkBold}>Entrar</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Link Institution ─────────────────────────────────────────────────────────

function LinkInstitutionScreen({
  configured,
  onLink,
  onSkip
}: {
  configured: boolean;
  onLink: (org: Organization) => void;
  onSkip: () => void;
}) {
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    const value = slug.trim().toLowerCase().replace(/\s+/g, "-");
    if (!value || loading) return;
    try {
      setLoading(true);
      setError(null);
      const org = await fetchOrganizationBySlug(firebaseConfig, value);
      if (!org) {
        setError("Igreja não encontrada. Verifique o código e tente novamente.");
        return;
      }
      onLink(org);
    } catch {
      setError("Erro ao buscar a igreja. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.fill}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={s.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={s.formContent} keyboardShouldPersistTaps="handled">
          <View style={s.institutionIcon}>
            <Text style={s.institutionEmoji}>⛪</Text>
          </View>
          <Text style={s.screenTitle}>Vincular Igreja</Text>
          <Text style={s.screenSubtitle}>
            Insira o código ou slug da sua igreja para conectar sua conta à comunidade.
          </Text>

          <View style={s.infoBox}>
            <Text style={s.infoText}>
              O código da sua igreja é fornecido pelo líder ou secretaria.{"\n"}
              Exemplo: <Text style={s.infoCode}>getro-church</Text>
            </Text>
          </View>

          <View style={s.formGroup}>
            <Text style={s.label}>Código da Igreja</Text>
            <TextInput
              style={s.input}
              value={slug}
              onChangeText={setSlug}
              placeholder="ex: minha-igreja"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {error && <Text style={s.errorText}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [s.btnPrimary, pressed && s.btnPressed, loading && s.btnDisabled]}
            onPress={search}
            disabled={loading || !configured}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnPrimaryText}>Buscar e vincular</Text>
            }
          </Pressable>

          <TouchableOpacity onPress={onSkip} style={s.linkRow}>
            <Text style={s.linkText}>Fazer isso depois</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

function MainApp({
  user,
  tenantRuntime,
  events,
  groups,
  dataReady,
  linkedOrg,
  onSignOut
}: {
  user: FirebaseAuthUser;
  tenantRuntime: TenantRuntimeSnapshot | null;
  events: Event[];
  groups: Group[];
  dataReady: boolean;
  linkedOrg: Organization | null;
  onSignOut: () => void;
}) {
  const [tab, setTab] = useState<Tab>("inicio");

  const orgName = tenantRuntime?.organization?.displayName
    ?? tenantRuntime?.organization?.name
    ?? linkedOrg?.displayName
    ?? linkedOrg?.name
    ?? "Minha Igreja";

  const primaryColor = (tenantRuntime?.settings?.branding?.primaryColor ?? BRAND_COLOR);

  const firstName = user.displayName?.split(" ")[0] ?? "Membro";
  const userGroups = groups.slice(0, 3);
  const nextEvents = events.slice(0, 5);

  return (
    <SafeAreaView style={s.fill}>
      <StatusBar style="dark" />
      <View style={[s.fill, { backgroundColor: "#f8f9fa" }]}>
        {/* Header */}
        <View style={[s.mainHeader, { backgroundColor: primaryColor }]}>
          <View>
            <Text style={s.mainHeaderGreeting}>Olá, {firstName} 👋</Text>
            <Text style={s.mainHeaderOrg}>{orgName}</Text>
          </View>
          <View style={[s.avatarCircle, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
            <Text style={s.avatarText}>
              {(user.displayName ?? user.email ?? "M")[0].toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Content */}
        <View style={s.fill}>
          {tab === "inicio" && (
            <HomeTab
              user={user}
              primaryColor={primaryColor}
              events={nextEvents}
              groups={userGroups}
              dataReady={dataReady}
              orgName={orgName}
            />
          )}
          {tab === "celula" && (
            <CelulaTab groups={userGroups} primaryColor={primaryColor} dataReady={dataReady} />
          )}
          {tab === "agenda" && (
            <AgendaTab events={nextEvents} primaryColor={primaryColor} dataReady={dataReady} />
          )}
          {tab === "perfil" && (
            <PerfilTab
              user={user}
              orgName={orgName}
              linkedOrg={linkedOrg}
              primaryColor={primaryColor}
              onSignOut={onSignOut}
            />
          )}
        </View>

        {/* Bottom Tab Bar */}
        <View style={s.tabBar}>
          {([
            { id: "inicio", label: "Início", icon: "🏠" },
            { id: "celula", label: "Célula", icon: "🤝" },
            { id: "agenda", label: "Agenda", icon: "📅" },
            { id: "perfil", label: "Perfil", icon: "👤" }
          ] as const).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={s.tabItem}
              onPress={() => setTab(item.id)}
            >
              <Text style={[s.tabIcon, tab === item.id && { opacity: 1 }]}>
                {item.icon}
              </Text>
              <Text style={[s.tabLabel, tab === item.id && { color: primaryColor, fontWeight: "700" }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Home Tab ─────────────────────────────────────────────────────────────────

function HomeTab({
  user,
  primaryColor,
  events,
  groups,
  dataReady,
  orgName
}: {
  user: FirebaseAuthUser;
  primaryColor: string;
  events: Event[];
  groups: Group[];
  dataReady: boolean;
  orgName: string;
}) {
  const nextEvent = events[0];

  return (
    <ScrollView contentContainerStyle={s.tabContent} showsVerticalScrollIndicator={false}>
      {!dataReady && (
        <View style={s.loadingRow}>
          <ActivityIndicator color={primaryColor} />
          <Text style={s.loadingLabel}>Carregando dados da sua igreja...</Text>
        </View>
      )}

      {/* Next service card */}
      {nextEvent ? (
        <View style={[s.card, s.nextServiceCard, { borderLeftColor: primaryColor }]}>
          <Text style={s.cardEyebrow}>PRÓXIMO EVENTO</Text>
          <Text style={s.cardTitle}>{nextEvent.name}</Text>
          <Text style={s.cardMeta}>
            {formatDate(nextEvent.startsAt)} · {formatHour(nextEvent.startsAt)}
          </Text>
          <Pressable style={[s.cardCta, { backgroundColor: primaryColor }]}>
            <Text style={s.cardCtaText}>Fazer check-in</Text>
          </Pressable>
        </View>
      ) : dataReady ? (
        <View style={[s.card, { borderLeftColor: primaryColor, borderLeftWidth: 3 }]}>
          <Text style={s.cardTitle}>Nenhum evento próximo</Text>
          <Text style={s.cardMeta}>Fique atento às novidades da sua igreja.</Text>
        </View>
      ) : null}

      {/* Quick actions */}
      <Text style={s.sectionTitle}>Acesso rápido</Text>
      <View style={s.quickActionsGrid}>
        {([
          { icon: "✅", label: "Check-in", sub: "Registrar presença" },
          { icon: "🙏", label: "Pedido de\noração", sub: "Enviar para líderes" },
          { icon: "📖", label: "Devocional", sub: "Leitura do dia" },
          { icon: "💰", label: "Dízimos", sub: "Contribuições" }
        ] as const).map((item) => (
          <Pressable key={item.label} style={s.quickAction}>
            <Text style={s.quickActionIcon}>{item.icon}</Text>
            <Text style={s.quickActionLabel}>{item.label}</Text>
            <Text style={s.quickActionSub}>{item.sub}</Text>
          </Pressable>
        ))}
      </View>

      {/* My groups */}
      {groups.length > 0 && (
        <>
          <Text style={s.sectionTitle}>Minha Célula</Text>
          {groups.slice(0, 1).map((g) => (
            <View key={g.id} style={[s.card, { borderLeftColor: primaryColor, borderLeftWidth: 3 }]}>
              <Text style={s.cardTitle}>{g.name}</Text>
              <Text style={s.cardMeta}>
                {g.meetingDayOfWeek != null ? weekdayNumLabel(g.meetingDayOfWeek) : "Dia a definir"}{" "}
                {g.meetingTime ? `· ${g.meetingTime}` : ""}
              </Text>
              <Pressable style={[s.cardCta, { backgroundColor: primaryColor }]}>
                <Text style={s.cardCtaText}>Confirmar presença</Text>
              </Pressable>
            </View>
          ))}
        </>
      )}

      {/* Journey progress */}
      <Text style={s.sectionTitle}>Minha Jornada</Text>
      <View style={s.card}>
        <View style={s.journeyRow}>
          <View style={s.journeyStep}>
            <View style={[s.journeyDot, { backgroundColor: primaryColor }]} />
            <Text style={s.journeyStepLabel}>Visitante</Text>
            <Text style={[s.journeyStepStatus, { color: primaryColor }]}>Concluído</Text>
          </View>
          <View style={[s.journeyLine, { backgroundColor: primaryColor }]} />
          <View style={s.journeyStep}>
            <View style={[s.journeyDot, { backgroundColor: primaryColor }]} />
            <Text style={s.journeyStepLabel}>Conectado</Text>
            <Text style={[s.journeyStepStatus, { color: primaryColor }]}>Atual</Text>
          </View>
          <View style={[s.journeyLine, { backgroundColor: "#e5e7eb" }]} />
          <View style={s.journeyStep}>
            <View style={[s.journeyDot, { backgroundColor: "#e5e7eb" }]} />
            <Text style={s.journeyStepLabel}>Servindo</Text>
            <Text style={s.journeyStepStatusMuted}>Em breve</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Célula Tab ───────────────────────────────────────────────────────────────

function CelulaTab({
  groups,
  primaryColor,
  dataReady
}: {
  groups: Group[];
  primaryColor: string;
  dataReady: boolean;
}) {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(groups[0] ?? null);
  const [presenceConfirmed, setPresenceConfirmed] = useState(false);
  const [prayerText, setPrayerText] = useState("");
  const [prayerSent, setPrayerSent] = useState(false);

  const announcements = [
    "Próxima reunião: confirme sua presença até quarta.",
    "Estudo desta semana: Filipenses 4:4-7.",
    "Lembre-se de trazer um amigo novo na próxima semana!"
  ];

  return (
    <ScrollView contentContainerStyle={s.tabContent} showsVerticalScrollIndicator={false}>
      {!dataReady && (
        <View style={s.loadingRow}>
          <ActivityIndicator color={primaryColor} />
          <Text style={s.loadingLabel}>Carregando células...</Text>
        </View>
      )}

      {groups.length === 0 && dataReady && (
        <View style={[s.card, s.emptyCard]}>
          <Text style={s.emptyIcon}>🤝</Text>
          <Text style={s.emptyTitle}>Nenhuma célula encontrada</Text>
          <Text style={s.emptyMeta}>Entre em contato com sua liderança para ser adicionado a uma célula.</Text>
        </View>
      )}

      {groups.length > 0 && (
        <>
          {/* Group selector */}
          <Text style={s.sectionTitle}>Selecionar Célula</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow}>
            {groups.map((g) => (
              <Pressable
                key={g.id}
                style={[s.chip, selectedGroup?.id === g.id && { backgroundColor: primaryColor }]}
                onPress={() => { setSelectedGroup(g); setPresenceConfirmed(false); }}
              >
                <Text style={[s.chipText, selectedGroup?.id === g.id && { color: "#fff" }]}>
                  {g.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}

      {selectedGroup && (
        <>
          {/* Group info */}
          <View style={[s.card, { borderLeftColor: primaryColor, borderLeftWidth: 3 }]}>
            <Text style={s.cardTitle}>{selectedGroup.name}</Text>
            <Text style={s.cardMeta}>
              {selectedGroup.meetingDayOfWeek != null ? weekdayNumLabel(selectedGroup.meetingDayOfWeek) : "Dia a definir"}{" "}
              {selectedGroup.meetingTime ? `· ${selectedGroup.meetingTime}` : ""}
            </Text>
          </View>

          {/* Presence */}
          <Text style={s.sectionTitle}>Presença</Text>
          <View style={s.card}>
            {presenceConfirmed ? (
              <View style={s.confirmedRow}>
                <Text style={[s.confirmedIcon, { color: primaryColor }]}>✓</Text>
                <Text style={s.confirmedText}>Presença confirmada!</Text>
              </View>
            ) : (
              <Pressable
                style={[s.btnPrimary, { backgroundColor: primaryColor }]}
                onPress={() => setPresenceConfirmed(true)}
              >
                <Text style={s.btnPrimaryText}>Confirmar presença</Text>
              </Pressable>
            )}
          </View>

          {/* Announcements */}
          <Text style={s.sectionTitle}>Avisos</Text>
          {announcements.map((a, i) => (
            <View key={i} style={s.announcementCard}>
              <Text style={[s.announcementDot, { color: primaryColor }]}>●</Text>
              <Text style={s.announcementText}>{a}</Text>
            </View>
          ))}

          {/* Prayer request */}
          <Text style={s.sectionTitle}>Pedido de Oração</Text>
          <View style={s.card}>
            {prayerSent ? (
              <View style={s.confirmedRow}>
                <Text style={[s.confirmedIcon, { color: primaryColor }]}>🙏</Text>
                <Text style={s.confirmedText}>Pedido enviado! Sua liderança irá orar por você.</Text>
              </View>
            ) : (
              <>
                <TextInput
                  style={s.prayerInput}
                  value={prayerText}
                  onChangeText={setPrayerText}
                  placeholder="Escreva seu pedido de oração aqui..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <Pressable
                  style={[s.btnPrimary, { backgroundColor: primaryColor, marginTop: 12 }]}
                  onPress={() => { if (prayerText.trim()) setPrayerSent(true); }}
                >
                  <Text style={s.btnPrimaryText}>Enviar pedido</Text>
                </Pressable>
              </>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

// ─── Agenda Tab ───────────────────────────────────────────────────────────────

function AgendaTab({
  events,
  primaryColor,
  dataReady
}: {
  events: Event[];
  primaryColor: string;
  dataReady: boolean;
}) {
  const staticEvents = [
    { id: "s1", name: "Culto de Celebração", startsAt: nextWeekday(0, 18), type: "culto" },
    { id: "s2", name: "Reunião de Célula", startsAt: nextWeekday(3, 19.5), type: "celula" },
    { id: "s3", name: "Treinamento de Líderes", startsAt: nextWeekday(1, 20), type: "formacao" }
  ];
  const displayEvents = events.length > 0 ? events : staticEvents;

  return (
    <ScrollView contentContainerStyle={s.tabContent} showsVerticalScrollIndicator={false}>
      {!dataReady && (
        <View style={s.loadingRow}>
          <ActivityIndicator color={primaryColor} />
          <Text style={s.loadingLabel}>Carregando agenda...</Text>
        </View>
      )}

      <Text style={s.sectionTitle}>Próximos Eventos</Text>

      {displayEvents.map((event) => (
        <View key={event.id} style={s.agendaCard}>
          <View style={[s.agendaDateBox, { backgroundColor: primaryColor }]}>
            <Text style={s.agendaDay}>{formatWeekday(event.startsAt)}</Text>
            <Text style={s.agendaDayNum}>{formatDayNum(event.startsAt)}</Text>
          </View>
          <View style={s.agendaInfo}>
            <Text style={s.agendaTitle}>{event.name}</Text>
            <Text style={s.agendaTime}>{formatHour(event.startsAt)}</Text>
            <View style={[s.agendaBadge, { backgroundColor: `${primaryColor}20` }]}>
              <Text style={[s.agendaBadgeText, { color: primaryColor }]}>
                {eventKindLabel(event.type)}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Perfil Tab ───────────────────────────────────────────────────────────────

function PerfilTab({
  user,
  orgName,
  linkedOrg,
  primaryColor,
  onSignOut
}: {
  user: FirebaseAuthUser;
  orgName: string;
  linkedOrg: Organization | null;
  primaryColor: string;
  onSignOut: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={s.tabContent} showsVerticalScrollIndicator={false}>
      {/* Avatar */}
      <View style={s.profileHeader}>
        <View style={[s.profileAvatar, { backgroundColor: primaryColor }]}>
          <Text style={s.profileAvatarText}>
            {(user.displayName ?? user.email ?? "M")[0].toUpperCase()}
          </Text>
        </View>
        <Text style={s.profileName}>{user.displayName ?? "Membro"}</Text>
        <Text style={s.profileEmail}>{user.email}</Text>
      </View>

      {/* Church info */}
      <Text style={s.sectionTitle}>Minha Igreja</Text>
      <View style={[s.card, { borderLeftColor: primaryColor, borderLeftWidth: 3 }]}>
        <Text style={s.cardTitle}>{orgName}</Text>
        {linkedOrg?.slug ? (
          <Text style={s.cardMeta}>Código: {linkedOrg.slug}</Text>
        ) : (
          <Text style={s.cardMeta}>Igreja não vinculada</Text>
        )}
      </View>

      {/* Info cards */}
      <Text style={s.sectionTitle}>Minha Conta</Text>
      {([
        { label: "Status", value: "Membro ativo" },
        { label: "Jornada", value: "Conectando" },
        { label: "Tribo", value: "A definir" }
      ] as const).map((item) => (
        <View key={item.label} style={s.infoRow}>
          <Text style={s.infoRowLabel}>{item.label}</Text>
          <Text style={s.infoRowValue}>{item.value}</Text>
        </View>
      ))}

      {/* Sign out */}
      <Pressable
        style={({ pressed }) => [s.btnDanger, pressed && s.btnPressed]}
        onPress={onSignOut}
      >
        <Text style={s.btnDangerText}>Sair da conta</Text>
      </Pressable>
    </ScrollView>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAuthError(err: unknown): string {
  if (!(err instanceof Error)) return "Erro desconhecido.";
  const msg = err.message;
  if (msg.includes("email-already-in-use")) return "Este e-mail já está cadastrado.";
  if (msg.includes("invalid-email")) return "E-mail inválido.";
  if (msg.includes("wrong-password") || msg.includes("invalid-credential")) return "Senha incorreta.";
  if (msg.includes("user-not-found")) return "Usuário não encontrado.";
  if (msg.includes("weak-password")) return "Senha muito fraca.";
  if (msg.includes("network-request-failed")) return "Sem conexão com a internet.";
  return "Erro: " + msg.split(":").pop()?.trim();
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });
  } catch { return iso; }
}

function formatHour(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

function formatWeekday(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").toUpperCase();
  } catch { return "???"; }
}

function formatDayNum(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "numeric" });
  } catch { return ""; }
}

function weekdayNumLabel(dow: number): string {
  const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  return days[dow] ?? "Dia " + dow;
}

function eventKindLabel(type: string): string {
  const map: Record<string, string> = {
    culto: "Culto", celula: "Célula", formacao: "Formação",
    worship: "Culto", cell: "Célula", training: "Formação"
  };
  return map[type.toLowerCase()] ?? type;
}

function nextWeekday(dow: number, hour: number): string {
  const d = new Date();
  const diff = (dow - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  d.setHours(Math.floor(hour), (hour % 1) * 60, 0, 0);
  return d.toISOString();
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },

  // Splash
  logoMark: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: BRAND_COLOR, alignItems: "center", justifyContent: "center"
  },
  logoText: { color: "#fff", fontSize: 36, fontWeight: "800" },

  // Welcome
  welcomeHero: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 32, paddingTop: 48
  },
  welcomeTitle: {
    fontSize: 32, fontWeight: "800", color: BRAND_DARK,
    textAlign: "center", marginTop: 24, lineHeight: 40
  },
  welcomeSubtitle: {
    fontSize: 16, color: "#6b7280", textAlign: "center",
    marginTop: 12, lineHeight: 24
  },
  welcomeActions: { paddingHorizontal: 24, paddingBottom: 48, gap: 12 },

  // Buttons
  btnPrimary: {
    backgroundColor: BRAND_COLOR, borderRadius: 12,
    paddingVertical: 16, alignItems: "center"
  },
  btnPrimaryText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnSecondary: {
    backgroundColor: "transparent", borderRadius: 12,
    paddingVertical: 16, alignItems: "center",
    borderWidth: 1.5, borderColor: BRAND_COLOR
  },
  btnSecondaryText: { color: BRAND_COLOR, fontSize: 16, fontWeight: "700" },
  btnDanger: {
    backgroundColor: "#fee2e2", borderRadius: 12,
    paddingVertical: 16, alignItems: "center", marginTop: 8
  },
  btnDangerText: { color: "#dc2626", fontSize: 16, fontWeight: "700" },
  btnPressed: { opacity: 0.75 },
  btnDisabled: { opacity: 0.5 },

  // Screen header
  screenHeader: {
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4
  },
  backBtn: { fontSize: 16, color: BRAND_COLOR, fontWeight: "600" },

  // Form
  formContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 48, gap: 0 },
  screenTitle: { fontSize: 26, fontWeight: "800", color: BRAND_DARK, marginBottom: 6 },
  screenSubtitle: { fontSize: 15, color: "#6b7280", marginBottom: 24, lineHeight: 22 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: BRAND_DARK, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: BRAND_DARK, backgroundColor: "#fff"
  },
  errorText: { color: "#dc2626", fontSize: 13, marginBottom: 12 },
  linkRow: { alignItems: "center", marginTop: 20 },
  linkText: { fontSize: 14, color: "#6b7280" },
  linkBold: { fontWeight: "700", color: BRAND_COLOR },
  warningBox: {
    backgroundColor: "#fef3c7", borderRadius: 8,
    padding: 12, marginBottom: 16
  },
  warningText: { fontSize: 13, color: "#92400e" },
  infoBox: {
    backgroundColor: `${BRAND_COLOR}14`, borderRadius: 8,
    padding: 14, marginBottom: 16
  },
  infoText: { fontSize: 14, color: BRAND_DARK, lineHeight: 20 },
  infoCode: { fontWeight: "700", color: BRAND_COLOR },
  institutionIcon: { alignItems: "center", marginBottom: 20, marginTop: 12 },
  institutionEmoji: { fontSize: 52 },

  // Main app
  mainHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16
  },
  mainHeaderGreeting: { color: "#fff", fontSize: 18, fontWeight: "700" },
  mainHeaderOrg: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 2 },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center"
  },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "700" },

  // Tab bar
  tabBar: {
    flexDirection: "row", backgroundColor: "#fff",
    borderTopWidth: 1, borderTopColor: "#e5e7eb",
    paddingBottom: 8
  },
  tabItem: { flex: 1, alignItems: "center", paddingTop: 8 },
  tabIcon: { fontSize: 22, opacity: 0.5 },
  tabLabel: { fontSize: 11, color: "#9ca3af", marginTop: 2, fontWeight: "500" },

  // Tab content
  tabContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
  sectionTitle: {
    fontSize: 16, fontWeight: "700", color: BRAND_DARK,
    marginBottom: 10, marginTop: 16
  },

  // Loading
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  loadingLabel: { fontSize: 14, color: "#9ca3af" },

  // Cards
  card: {
    backgroundColor: "#fff", borderRadius: 14,
    padding: 16, marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2
  },
  nextServiceCard: { borderLeftWidth: 4 },
  cardEyebrow: { fontSize: 11, fontWeight: "700", color: "#9ca3af", letterSpacing: 0.8, marginBottom: 6 },
  cardTitle: { fontSize: 17, fontWeight: "700", color: BRAND_DARK, marginBottom: 4 },
  cardMeta: { fontSize: 14, color: "#6b7280" },
  cardCta: {
    borderRadius: 8, paddingVertical: 10,
    alignItems: "center", marginTop: 14
  },
  cardCtaText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Quick actions
  quickActionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 },
  quickAction: {
    width: "47%", backgroundColor: "#fff", borderRadius: 14,
    padding: 14, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2
  },
  quickActionIcon: { fontSize: 28, marginBottom: 8 },
  quickActionLabel: { fontSize: 14, fontWeight: "700", color: BRAND_DARK, textAlign: "center" },
  quickActionSub: { fontSize: 11, color: "#9ca3af", textAlign: "center", marginTop: 2 },

  // Journey
  journeyRow: { flexDirection: "row", alignItems: "center" },
  journeyStep: { alignItems: "center", flex: 1 },
  journeyDot: { width: 14, height: 14, borderRadius: 7, marginBottom: 6 },
  journeyLine: { flex: 1, height: 2, marginBottom: 20 },
  journeyStepLabel: { fontSize: 11, color: BRAND_DARK, fontWeight: "600", textAlign: "center" },
  journeyStepStatus: { fontSize: 10, fontWeight: "700", marginTop: 2 },
  journeyStepStatusMuted: { fontSize: 10, color: "#9ca3af", marginTop: 2 },

  // Célula
  chipRow: { marginBottom: 12 },
  chip: {
    backgroundColor: "#f3f4f6", borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8, marginRight: 8
  },
  chipText: { fontSize: 14, color: BRAND_DARK, fontWeight: "600" },
  confirmedRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  confirmedIcon: { fontSize: 24 },
  confirmedText: { fontSize: 15, fontWeight: "600", color: BRAND_DARK, flex: 1 },
  announcementCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1
  },
  announcementDot: { fontSize: 10, marginTop: 4 },
  announcementText: { fontSize: 14, color: BRAND_DARK, flex: 1, lineHeight: 20 },
  prayerInput: {
    borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: BRAND_DARK, minHeight: 96
  },

  // Agenda
  agendaCard: {
    flexDirection: "row", backgroundColor: "#fff", borderRadius: 14,
    marginBottom: 10, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2
  },
  agendaDateBox: { width: 60, alignItems: "center", justifyContent: "center", padding: 12 },
  agendaDay: { color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: "700" },
  agendaDayNum: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 2 },
  agendaInfo: { flex: 1, padding: 14 },
  agendaTitle: { fontSize: 15, fontWeight: "700", color: BRAND_DARK, marginBottom: 4 },
  agendaTime: { fontSize: 13, color: "#6b7280", marginBottom: 6 },
  agendaBadge: { alignSelf: "flex-start", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  agendaBadgeText: { fontSize: 11, fontWeight: "700" },

  // Empty state
  emptyCard: { alignItems: "center", paddingVertical: 32 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: BRAND_DARK, marginBottom: 6 },
  emptyMeta: { fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 20 },

  // Perfil
  profileHeader: { alignItems: "center", paddingVertical: 24 },
  profileAvatar: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center", marginBottom: 12
  },
  profileAvatarText: { color: "#fff", fontSize: 32, fontWeight: "800" },
  profileName: { fontSize: 20, fontWeight: "800", color: BRAND_DARK },
  profileEmail: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  infoRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1
  },
  infoRowLabel: { fontSize: 14, color: "#6b7280" },
  infoRowValue: { fontSize: 14, fontWeight: "700", color: BRAND_DARK }
});
