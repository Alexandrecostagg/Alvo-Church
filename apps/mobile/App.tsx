import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import {
  createFirebaseRuntimeConfigFromEnv,
  ensureTenantUserAccess,
  fetchTenantRuntimeSnapshot,
  isFirebaseWebRuntimeConfigured,
  signInWithFirebaseMobileEmailPassword,
  signOutFromFirebaseMobile,
  subscribeToFirebaseMobileAuthState,
  type FirebaseAuthUser
} from "@alvo/firebase";
import {
  getBrandModeLabel,
  getEnabledModuleCount,
  getPlanTierLabel,
  isModuleEnabled
} from "@alvo/domain";
import type { OrganizationSettingsSnapshot, TenantRuntimeSnapshot } from "@alvo/types";
import { alvoTheme, createBrandTheme } from "@alvo/ui";

type MobileTab = "inicio" | "agenda" | "jornada" | "perfil";

const tabs: Array<{ id: MobileTab; label: string }> = [
  { id: "inicio", label: "Inicio" },
  { id: "agenda", label: "Agenda" },
  { id: "jornada", label: "Jornada" },
  { id: "perfil", label: "Perfil" }
];

const quickActions = [
  { title: "Check-in culto", subtitle: "Entrada rapida e recepcao" },
  { title: "Minha celula", subtitle: "Confirmar presenca e avisos" },
  { title: "Eventos", subtitle: "Inscricoes e agenda viva" }
] as const;

const nextSteps = [
  { title: "Mensagem de boas-vindas", meta: "Hoje · Secretaria" },
  { title: "Confirmar celula de quarta", meta: "Amanha · Lider de grupo" },
  { title: "Encontro de integracao", meta: "Sabado · 19 vagas" }
] as const;

const journeyHighlights = [
  { label: "Tribo atual", value: "Levi", detail: "Adoracao e servico" },
  { label: "Jornada", value: "Conectando", detail: "34% concluido" },
  { label: "Badge recente", value: "Primeiro passo", detail: "Liberado ontem" }
] as const;

const agenda = [
  {
    day: "Qua",
    title: "Celula Centro Norte",
    hour: "19:30",
    kind: "Celula"
  },
  {
    day: "Dom",
    title: "Culto de Celebracao",
    hour: "18:00",
    kind: "Culto"
  },
  {
    day: "Seg",
    title: "Treinamento de Lideres",
    hour: "20:00",
    kind: "Formacao"
  }
] as const;

const pastoralSignals = [
  "1 visitante aguardando follow-up",
  "2 check-ins novos no ultimo evento",
  "1 revisao de tribo recomendada"
] as const;

const timeline = [
  { title: "Visitante", status: "Concluido", detail: "Primeiro contato registrado" },
  { title: "Conectando", status: "Atual", detail: "Celula confirmada e trilha ativa" },
  { title: "Servindo", status: "Proximo", detail: "Triagem ministerial em andamento" }
] as const;

const profileCards = [
  { label: "Celula", value: "Centro Norte", detail: "Quarta · 19:30" },
  { label: "Campus", value: "Belem", detail: "America/Belem" },
  { label: "Perfil", value: "Membro ativo", detail: "Acesso a jornadas e eventos" }
] as const;

const runtimeEnv =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ??
  {};

const firebaseConfig = createFirebaseRuntimeConfigFromEnv(runtimeEnv, "EXPO_PUBLIC");

const fallbackTenantSettings: OrganizationSettingsSnapshot = {
  branding: {
    organizationId: "org_alvo_demo",
    brandMode: "co_branded",
    publicProductName: "Getro Church",
    publicShortName: "Getro",
    primaryColor: "#d27836",
    secondaryColor: "#1c2433",
    accentColor: "#e8dcc7",
    surfaceColor: "#f7f3ea",
    textColor: "#1c2433",
    showPoweredByAlvo: true,
    poweredByLabel: "by Alvo"
  },
  subscription: {
    organizationId: "org_alvo_demo",
    planCode: "alvo-growth",
    planTier: "growth",
    billingCycle: "monthly",
    memberRange: "101_to_300",
    seatLimit: 12,
    campusLimit: 2,
    aiQuota: 250,
    whiteLabelEnabled: false,
    coBrandingEnabled: true,
    multiCampusEnabled: false,
    denominationalModeEnabled: false,
    startedAt: "2026-03-19T00:00:00.000Z",
    renewsAt: "2026-04-19T00:00:00.000Z"
  },
  features: {
    organizationId: "org_alvo_demo",
    modules: {
      core: { enabled: true, source: "plan" },
      visitors: { enabled: true, source: "plan" },
      groups: { enabled: true, source: "plan" },
      events: { enabled: true, source: "plan" },
      children: { enabled: false, source: "manual" },
      youth: { enabled: true, source: "addon" },
      volunteers: { enabled: true, source: "addon" },
      tribes: { enabled: true, source: "plan" },
      journeys: { enabled: true, source: "plan" },
      communication: { enabled: true, source: "addon" },
      finance: { enabled: false, source: "manual" },
      ai: { enabled: true, source: "trial", limits: { monthlySuggestions: 250 } }
    }
  }
};

const fallbackTenantRuntime: TenantRuntimeSnapshot = {
  organization: {
    id: "org_alvo_demo",
    name: "Getro Church",
    slug: "getro-church",
    status: "active",
    timezone: "America/Belem",
    locale: "pt-BR",
    countryCode: "BR",
    displayName: "Getro Church"
  },
  settings: fallbackTenantSettings
};

export default function App() {
  const [activeTab, setActiveTab] = useState<MobileTab>("inicio");
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [tenantRuntime, setTenantRuntime] = useState<TenantRuntimeSnapshot | null>(null);
  const [tenantReady, setTenantReady] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [email, setEmail] = useState("alexandrecostagg@gmail.com");
  const [password, setPassword] = useState("");
  const activeTenantRuntime = tenantRuntime ?? fallbackTenantRuntime;
  const activeTenantSettings = activeTenantRuntime.settings ?? fallbackTenantSettings;
  const brandTheme = createBrandTheme(activeTenantSettings.branding);

  const configured = isFirebaseWebRuntimeConfigured(firebaseConfig);
  const availableTabs = tabs.filter((tab) => {
    if (tab.id === "agenda") {
      return isModuleEnabled(activeTenantSettings.features, "groups") ||
        isModuleEnabled(activeTenantSettings.features, "events");
    }

    if (tab.id === "jornada") {
      return isModuleEnabled(activeTenantSettings.features, "journeys") ||
        isModuleEnabled(activeTenantSettings.features, "tribes");
    }

    if (tab.id === "inicio" || tab.id === "perfil") {
      return true;
    }

    return true;
  });

  useEffect(() => {
    if (!configured) {
      setReady(true);
      return;
    }

    const unsubscribe = subscribeToFirebaseMobileAuthState(firebaseConfig, (nextUser) => {
      setUser(nextUser);
      setReady(true);
    });

    return () => unsubscribe();
  }, [configured]);

  useEffect(() => {
    if (!configured || !ready || !user) {
      setTenantRuntime(null);
      setTenantReady(false);
      return;
    }

    let cancelled = false;
    const currentUser = user;

    async function loadTenantRuntime() {
      try {
        await ensureTenantUserAccess(firebaseConfig, {
          organizationId: fallbackTenantRuntime.organization.id,
          userId: currentUser.uid,
          email: currentUser.email ?? "",
          roles: ["church_admin"]
        });

        const snapshot = await fetchTenantRuntimeSnapshot(firebaseConfig, {
          organizationId: fallbackTenantRuntime.organization.id
        });

        if (!cancelled) {
          setTenantRuntime(snapshot);
        }
      } catch {
        if (!cancelled) {
          setTenantRuntime(null);
        }
      } finally {
        if (!cancelled) {
          setTenantReady(true);
        }
      }
    }

    void loadTenantRuntime();

    return () => {
      cancelled = true;
    };
  }, [configured, firebaseConfig, ready, user]);

  async function handleSignIn() {
    if (!configured || loading) {
      return;
    }

    try {
      setLoading(true);
      setAuthError(null);
      await signInWithFirebaseMobileEmailPassword({
        config: firebaseConfig,
        email: email.trim(),
        password
      });
      setPassword("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao entrar.";
      setAuthError(formatFirebaseError(message));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOutFromFirebaseMobile(firebaseConfig);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao sair.";
      setAuthError(formatFirebaseError(message));
    }
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: brandTheme.colors.background }]}
    >
      <StatusBar style="dark" />
      <View style={[styles.appShell, { backgroundColor: brandTheme.colors.background }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.hero,
              {
                backgroundColor: brandTheme.colors.surface,
                borderColor: `${brandTheme.colors.accent}24`
              }
            ]}
          >
            <View style={styles.heroTop}>
              <BrandEmblem />
              <View style={styles.heroCopy}>
                <Text style={[styles.eyebrow, { color: brandTheme.colors.accentDark }]}>
                  {brandTheme.brand.appName}
                </Text>
                <Text style={[styles.title, { color: brandTheme.colors.ink }]}>
                  Direcao para cada passo da caminhada.
                </Text>
                <Text style={styles.description}>
                  Um app para acolher, conectar, discipular e mobilizar pessoas com
                  clareza.
                </Text>
                {brandTheme.brand.showPoweredByAlvo ? (
                  <Text style={[styles.helperText, { marginTop: 4 }]}>
                    {brandTheme.brand.poweredByLabel ?? "by Alvo"}
                  </Text>
                ) : null}
              </View>
            </View>
            <View style={styles.heroFooter}>
              <Tag label={user ? "Sessao ativa" : "Login mobile"} />
              <Tag label={getPlanTierLabel(activeTenantSettings.subscription.planTier)} />
              <Tag label={getBrandModeLabel(activeTenantSettings.branding.brandMode)} />
            </View>
          </View>

          {!ready ? (
            <View style={styles.loadingShell}>
              <ActivityIndicator color={alvoTheme.colors.accentDark} />
              <Text style={styles.loadingText}>Preparando a sessao do app...</Text>
            </View>
          ) : null}

          {ready && !user ? (
            <LoginPanel
              authError={authError}
              configured={configured}
              email={email}
              loading={loading}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onSubmit={handleSignIn}
              password={password}
            />
          ) : null}

          {ready && user ? (
            <>
              <SessionPanel
                accentColor={brandTheme.colors.accent}
                email={user.email ?? "usuario autenticado"}
                onSignOut={handleSignOut}
                planLabel={getPlanTierLabel(activeTenantSettings.subscription.planTier)}
                moduleCount={getEnabledModuleCount(activeTenantSettings.features)}
                tenantName={activeTenantRuntime.organization.displayName ?? activeTenantRuntime.organization.name}
                tenantReady={tenantReady}
              />
              {activeTab === "inicio" ? (
                <HomeTab
                  brandLabel={brandTheme.brand.appName}
                  tenantReady={tenantReady}
                  tenantSettings={activeTenantSettings}
                  tenantName={
                    activeTenantRuntime.organization.displayName ??
                    activeTenantRuntime.organization.name
                  }
                />
              ) : null}
              {activeTab === "agenda" ? <AgendaTab /> : null}
              {activeTab === "jornada" ? <JourneyTab /> : null}
              {activeTab === "perfil" ? <ProfileTab email={user.email ?? "Sem email"} /> : null}
            </>
          ) : null}
        </ScrollView>

        {user ? (
          <View style={styles.tabBar}>
            {availableTabs.map((tab) => {
              const selected = tab.id === activeTab;

              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={[
                    styles.tabButton,
                    selected ? styles.tabButtonActive : null
                  ]}
                >
                  <Text style={[styles.tabLabel, selected ? styles.tabLabelActive : null]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function LoginPanel({
  authError,
  configured,
  email,
  loading,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  password
}: {
  authError: string | null;
  configured: boolean;
  email: string;
  loading: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => Promise<void>;
  password: string;
}) {
  return (
    <View style={styles.loginPanel}>
      <SectionHeader
        eyebrow="Entrar"
        title="Acesso mobile"
        caption="O app ja nasce pronto para compartilhar a mesma autenticacao do painel web."
      />
      <View style={styles.stack}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={onEmailChange}
            placeholder="voce@alvochurch.app"
            placeholderTextColor={alvoTheme.colors.inkSoft}
            style={styles.input}
            value={email}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Senha</Text>
          <TextInput
            onChangeText={onPasswordChange}
            placeholder="Sua senha"
            placeholderTextColor={alvoTheme.colors.inkSoft}
            secureTextEntry
            style={styles.input}
            value={password}
          />
        </View>
        <Pressable
          disabled={!configured || loading}
          onPress={() => {
            void onSubmit();
          }}
        style={[
          styles.primaryButton,
          { backgroundColor: alvoTheme.colors.accentDark },
          !configured || loading ? styles.primaryButtonDisabled : null
        ]}
        >
          <Text style={styles.primaryButtonText}>{loading ? "Entrando..." : "Entrar"}</Text>
        </Pressable>
        <Text style={styles.helperText}>
          {configured
            ? "Use o mesmo login do Firebase Auth configurado para o painel."
            : "Faltam variaveis EXPO_PUBLIC_FIREBASE_* para ativar o login mobile."}
        </Text>
        {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
      </View>
    </View>
  );
}

function SessionPanel({
  accentColor,
  email,
  moduleCount,
  onSignOut,
  planLabel,
  tenantName,
  tenantReady
}: {
  accentColor: string;
  email: string;
  moduleCount: number;
  onSignOut: () => Promise<void>;
  planLabel: string;
  tenantName: string;
  tenantReady: boolean;
}) {
  return (
    <View style={styles.sessionPanel}>
      <View style={styles.sessionCopy}>
        <Text style={styles.sessionEyebrow}>Sessao ativa</Text>
        <Text style={styles.sessionTitle}>{email}</Text>
        <Text style={styles.sessionText}>
          {tenantReady ? tenantName : "Sincronizando tenant"} · Plano {planLabel} com{" "}
          {moduleCount} modulos ativos nesta experiencia mobile.
        </Text>
      </View>
      <Pressable
        onPress={() => {
          void onSignOut();
        }}
        style={[styles.secondaryButton, { backgroundColor: accentColor }]}
      >
        <Text style={styles.secondaryButtonText}>Sair</Text>
      </Pressable>
    </View>
  );
}

function HomeTab({
  brandLabel,
  tenantName,
  tenantReady,
  tenantSettings
}: {
  brandLabel: string;
  tenantName: string;
  tenantReady: boolean;
  tenantSettings: OrganizationSettingsSnapshot;
}) {
  return (
    <>
      <SectionHeader
        eyebrow="Inicio"
        title="Proximos passos"
        caption="A jornada precisa mostrar o que importa agora."
      />
      <View style={styles.actionsRow}>
        {quickActions.map((action) => (
          <View key={action.title} style={styles.actionCard}>
            <Text style={styles.actionTitle}>{action.title}</Text>
            <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
          </View>
        ))}
      </View>

      <View style={styles.duoGrid}>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Fila de acompanhamento</Text>
          <Text style={styles.panelIntro}>
            O app mostra tarefas objetivas, nao so atalhos frios.
          </Text>
          <View style={styles.stack}>
            {nextSteps.map((step) => (
              <View key={step.title} style={styles.itemCard}>
                <Text style={styles.itemTitle}>{step.title}</Text>
                <Text style={styles.itemMeta}>{step.meta}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.panelAccent}>
          <Text style={styles.panelTitle}>Minha caminhada</Text>
          <Text style={styles.panelIntroDark}>
            Marca, jornada e ministerio no mesmo idioma visual.
          </Text>
          <View style={styles.stack}>
            {journeyHighlights.map((item) => (
              <View key={item.label} style={styles.metricCard}>
                <Text style={styles.metricLabel}>{item.label}</Text>
                <Text style={styles.metricValue}>{item.value}</Text>
                <Text style={styles.metricDetail}>{item.detail}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.signalPanel}>
        <Text style={styles.signalEyebrow}>Cuidado e inteligencia</Text>
        <Text style={styles.signalTitle}>
          O diferencial nao e so ter IA. E fazer lembrar, acompanhar e agir.
        </Text>
        <View style={styles.stack}>
          {pastoralSignals.map((signal) => (
            <View key={signal} style={styles.signalItem}>
              <View style={styles.signalDot} />
              <Text style={styles.signalText}>{signal}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Runtime do tenant</Text>
        <Text style={styles.panelIntro}>
          O app ja entende o contrato da organizacao e pode adaptar marca, plano e modulos.
        </Text>
        <View style={styles.stack}>
          <View style={styles.itemCard}>
            <Text style={styles.itemTitle}>Marca</Text>
            <Text style={styles.itemMeta}>
              {tenantReady ? tenantName : brandLabel} ·{" "}
              {getBrandModeLabel(tenantSettings.branding.brandMode)}
            </Text>
          </View>
          <View style={styles.itemCard}>
            <Text style={styles.itemTitle}>Plano</Text>
            <Text style={styles.itemMeta}>
              {getPlanTierLabel(tenantSettings.subscription.planTier)} ·{" "}
              {getEnabledModuleCount(tenantSettings.features)} modulos ativos
            </Text>
          </View>
        </View>
      </View>
    </>
  );
}

function AgendaTab() {
  return (
    <>
      <SectionHeader
        eyebrow="Agenda"
        title="Semana viva"
        caption="Pensado para caber bem em iPhone e Android desde o primeiro layout."
      />
      <View style={styles.stack}>
        {agenda.map((entry) => (
          <View key={`${entry.day}-${entry.title}`} style={styles.agendaCard}>
            <View style={styles.dayBadge}>
              <Text style={styles.dayBadgeText}>{entry.day}</Text>
            </View>
            <View style={styles.flexOne}>
              <Text style={styles.itemTitle}>{entry.title}</Text>
              <Text style={styles.itemMeta}>
                {entry.kind} · {entry.hour}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

function JourneyTab() {
  return (
    <>
      <SectionHeader
        eyebrow="Jornada"
        title="Caminho ativo"
        caption="Uma visao clara do momento atual e do proximo degrau."
      />
      <View style={styles.panelAccent}>
        <Text style={styles.panelTitle}>Trilha principal</Text>
        <Text style={styles.panelIntroDark}>
          O app traduz a caminhada em passos concretos e visiveis.
        </Text>
        <View style={styles.stack}>
          {timeline.map((item) => (
            <View key={item.title} style={styles.timelineCard}>
              <View style={styles.timelineDot} />
              <View style={styles.flexOne}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemMeta}>
                  {item.status} · {item.detail}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.duoGrid}>
        {journeyHighlights.map((item) => (
          <View key={item.label} style={styles.panel}>
            <Text style={styles.metricLabel}>{item.label}</Text>
            <Text style={styles.metricValue}>{item.value}</Text>
            <Text style={styles.metricDetail}>{item.detail}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function ProfileTab({ email }: { email: string }) {
  return (
    <>
      <SectionHeader
        eyebrow="Perfil"
        title="Minha base"
        caption="Identidade, conexoes e contexto do membro em um so lugar."
      />
      <View style={styles.stack}>
        <View style={styles.panel}>
          <Text style={styles.metricLabel}>Conta</Text>
          <Text style={styles.metricValue}>{email}</Text>
          <Text style={styles.metricDetail}>Autenticado via Firebase Auth</Text>
        </View>
        {profileCards.map((card) => (
          <View key={card.label} style={styles.panel}>
            <Text style={styles.metricLabel}>{card.label}</Text>
            <Text style={styles.metricValue}>{card.value}</Text>
            <Text style={styles.metricDetail}>{card.detail}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function SectionHeader({
  eyebrow,
  title,
  caption
}: {
  eyebrow: string;
  title: string;
  caption: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionCaption}>{caption}</Text>
    </View>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

function BrandEmblem() {
  return (
    <View style={styles.emblemShell}>
      <View style={styles.emblemGlow} />
      <View style={styles.emblemRingOuter} />
      <View style={styles.emblemRingInner} />
      <View style={styles.emblemVertical} />
      <View style={styles.emblemHorizontal} />
      <View style={styles.emblemCenterOuter}>
        <View style={styles.emblemCenterInner} />
      </View>
    </View>
  );
}

function formatFirebaseError(message: string) {
  if (message.includes("auth/invalid-credential")) {
    return "Email ou senha invalidos.";
  }

  if (message.includes("auth/network-request-failed")) {
    return "Falha de rede ao falar com o Firebase.";
  }

  return `Firebase: ${message}`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: alvoTheme.colors.background
  },
  appShell: {
    flex: 1
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
    gap: 18
  },
  hero: {
    padding: 22,
    borderRadius: 32,
    backgroundColor: alvoTheme.colors.surface,
    borderWidth: 1,
    borderColor: alvoTheme.colors.line,
    gap: 18
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16
  },
  heroCopy: {
    flex: 1
  },
  heroFooter: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  eyebrow: {
    color: alvoTheme.colors.accentDark,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  title: {
    marginTop: 4,
    color: alvoTheme.colors.ink,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "700"
  },
  description: {
    marginTop: 10,
    color: alvoTheme.colors.inkSoft,
    fontSize: 16,
    lineHeight: 23
  },
  loadingShell: {
    padding: 24,
    borderRadius: 26,
    backgroundColor: alvoTheme.colors.surface,
    borderWidth: 1,
    borderColor: alvoTheme.colors.line,
    alignItems: "center",
    gap: 10
  },
  loadingText: {
    color: alvoTheme.colors.inkSoft,
    fontSize: 15
  },
  loginPanel: {
    padding: 22,
    borderRadius: 28,
    backgroundColor: alvoTheme.colors.surface,
    borderWidth: 1,
    borderColor: alvoTheme.colors.line,
    gap: 18
  },
  inputGroup: {
    gap: 8
  },
  inputLabel: {
    color: alvoTheme.colors.ink,
    fontSize: 14,
    fontWeight: "600"
  },
  input: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: alvoTheme.colors.line,
    backgroundColor: alvoTheme.colors.background,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: alvoTheme.colors.ink,
    fontSize: 16
  },
  helperText: {
    color: alvoTheme.colors.inkSoft,
    fontSize: 14,
    lineHeight: 20
  },
  errorText: {
    color: "#b4432f",
    fontSize: 14,
    lineHeight: 20
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: alvoTheme.colors.accentDark,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  primaryButtonDisabled: {
    opacity: 0.55
  },
  primaryButtonText: {
    color: alvoTheme.colors.surface,
    fontSize: 16,
    fontWeight: "700"
  },
  sessionPanel: {
    padding: 22,
    borderRadius: 28,
    backgroundColor: "#e7f2eb",
    borderWidth: 1,
    borderColor: "#c8decf",
    gap: 16
  },
  sessionCopy: {
    gap: 6
  },
  sessionEyebrow: {
    color: "#446854",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  sessionTitle: {
    color: alvoTheme.colors.ink,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "700"
  },
  sessionText: {
    color: alvoTheme.colors.inkSoft,
    fontSize: 15,
    lineHeight: 22
  },
  secondaryButton: {
    alignSelf: "flex-start",
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: alvoTheme.colors.surface,
    borderWidth: 1,
    borderColor: alvoTheme.colors.line,
    paddingHorizontal: 18,
    justifyContent: "center"
  },
  secondaryButtonText: {
    color: alvoTheme.colors.accentDark,
    fontSize: 15,
    fontWeight: "700"
  },
  sectionHeader: {
    gap: 4,
    marginTop: 4
  },
  sectionEyebrow: {
    color: alvoTheme.colors.accentDark,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase"
  },
  sectionTitle: {
    color: alvoTheme.colors.ink,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "700"
  },
  sectionCaption: {
    color: alvoTheme.colors.inkSoft,
    fontSize: 15,
    lineHeight: 22
  },
  actionsRow: {
    gap: 12
  },
  actionCard: {
    padding: 18,
    borderRadius: 22,
    backgroundColor: alvoTheme.colors.surface,
    borderWidth: 1,
    borderColor: alvoTheme.colors.line,
    gap: 6
  },
  actionTitle: {
    color: alvoTheme.colors.ink,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "700"
  },
  actionSubtitle: {
    color: alvoTheme.colors.inkSoft,
    fontSize: 14,
    lineHeight: 20
  },
  duoGrid: {
    gap: 12
  },
  panel: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: alvoTheme.colors.surface,
    borderWidth: 1,
    borderColor: alvoTheme.colors.line,
    gap: 14
  },
  panelAccent: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: alvoTheme.colors.accentSoft,
    borderWidth: 1,
    borderColor: alvoTheme.colors.line,
    gap: 14
  },
  panelTitle: {
    color: alvoTheme.colors.ink,
    fontSize: 21,
    lineHeight: 25,
    fontWeight: "700"
  },
  panelIntro: {
    color: alvoTheme.colors.inkSoft,
    fontSize: 14,
    lineHeight: 20
  },
  panelIntroDark: {
    color: alvoTheme.colors.ink,
    fontSize: 14,
    lineHeight: 20
  },
  stack: {
    gap: 10
  },
  itemCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: alvoTheme.colors.background,
    gap: 4
  },
  itemTitle: {
    color: alvoTheme.colors.ink,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "700"
  },
  itemMeta: {
    color: alvoTheme.colors.inkSoft,
    fontSize: 14,
    lineHeight: 20
  },
  metricCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: alvoTheme.colors.surface,
    gap: 4
  },
  metricLabel: {
    color: alvoTheme.colors.accentDark,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  metricValue: {
    color: alvoTheme.colors.ink,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "700"
  },
  metricDetail: {
    color: alvoTheme.colors.inkSoft,
    fontSize: 14,
    lineHeight: 20
  },
  signalPanel: {
    padding: 22,
    borderRadius: 26,
    backgroundColor: alvoTheme.colors.ink,
    gap: 14
  },
  signalEyebrow: {
    color: alvoTheme.colors.accentSoft,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase"
  },
  signalTitle: {
    color: alvoTheme.colors.surface,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700"
  },
  signalItem: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center"
  },
  signalDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: alvoTheme.colors.accentDark
  },
  signalText: {
    flex: 1,
    color: alvoTheme.colors.surface,
    fontSize: 15,
    lineHeight: 22
  },
  agendaCard: {
    padding: 16,
    borderRadius: 22,
    backgroundColor: alvoTheme.colors.surface,
    borderWidth: 1,
    borderColor: alvoTheme.colors.line,
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  dayBadge: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: alvoTheme.colors.accentSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  dayBadgeText: {
    color: alvoTheme.colors.accentDark,
    fontSize: 18,
    fontWeight: "700"
  },
  timelineCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: alvoTheme.colors.surface,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start"
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: alvoTheme.colors.accentDark,
    marginTop: 4
  },
  flexOne: {
    flex: 1
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: alvoTheme.colors.background,
    borderWidth: 1,
    borderColor: alvoTheme.colors.line
  },
  tagText: {
    color: alvoTheme.colors.ink,
    fontSize: 12,
    fontWeight: "600"
  },
  emblemShell: {
    width: 92,
    height: 92,
    borderRadius: 28,
    backgroundColor: alvoTheme.colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden"
  },
  emblemGlow: {
    position: "absolute",
    width: 92,
    height: 92,
    borderRadius: 999,
    backgroundColor: "rgba(210, 120, 54, 0.14)"
  },
  emblemRingOuter: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: alvoTheme.colors.accentDark
  },
  emblemRingInner: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: alvoTheme.colors.accentDark
  },
  emblemVertical: {
    position: "absolute",
    width: 2,
    height: 48,
    backgroundColor: alvoTheme.colors.accentDark
  },
  emblemHorizontal: {
    position: "absolute",
    width: 48,
    height: 2,
    backgroundColor: alvoTheme.colors.accentDark
  },
  emblemCenterOuter: {
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: alvoTheme.colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  emblemCenterInner: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: alvoTheme.colors.accentDark
  },
  tabBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: "row",
    gap: 10,
    padding: 10,
    borderRadius: 24,
    backgroundColor: "rgba(247, 243, 234, 0.98)",
    borderWidth: 1,
    borderColor: alvoTheme.colors.line
  },
  tabButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  tabButtonActive: {
    backgroundColor: alvoTheme.colors.accentDark
  },
  tabLabel: {
    color: alvoTheme.colors.inkSoft,
    fontSize: 14,
    fontWeight: "600"
  },
  tabLabelActive: {
    color: alvoTheme.colors.surface
  }
});
