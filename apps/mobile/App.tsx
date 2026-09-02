import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  addPrayerRequest,
  fetchOrganizationBySlug,
  fetchPublicPrayerWall,
  fetchTenantRuntimeSnapshot,
  fetchEvents,
  saveEventRegistration,
  fetchGroups,
  incrementPrayerCount,
  isFirebaseWebRuntimeConfigured,
  registerWithFirebaseMobileEmailPassword,
  sendPasswordResetEmailMobile,
  signInWithFirebaseMobileEmailPassword,
  signOutFromFirebaseMobile,
  subscribeToFirebaseMobileAuthState,
  fetchMarketplacePromotions,
  fetchServiceAssignments,
  saveServiceAssignment,
  fetchMemberJourneyProfile,
  type FirebaseAuthUser,
} from "@alvo/firebase";
import type {
  ServiceAssignment,
  ServiceAssignmentStatus,
  MemberJourneyProfile,
} from "@alvo/types";
import type {
  Event,
  EventRegistration,
  Group,
  Organization,
  PrayerRequest,
  TenantRuntimeSnapshot,
  KidsCheckIn,
  OrganizationKidsSettings,
  ServiceTeam,
  AppRole,
  MarketplacePromotion,
  Course,
  CourseModule,
  Lesson,
  MemberCourseProgress,
} from "@alvo/types";

// ─── Types ────────────────────────────────────────────────────────────────────

// Fallback aponta para a URL de produção real (nunca para um IP de rede local de
// desenvolvimento) — se EXPO_PUBLIC_WEB_API_URL não estiver definida no ambiente de
// build, o pior cenário é o app tentar falar com produção, não com a máquina de
// quem programou. Para builds de loja (EAS), defina EXPO_PUBLIC_WEB_API_URL
// explicitamente (eas secret ou env do profile de build) apontando pra produção.
const WEB_API_URL =
  process.env.EXPO_PUBLIC_WEB_API_URL ??
  "https://alvo-church-web.alexandrecostagg.workers.dev";

async function callAi(
  task: string,
  input: unknown,
  idToken: string,
  organizationId: string,
): Promise<string> {
  const res = await fetch(`${WEB_API_URL}/api/ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ task, input, organizationId }),
  });
  const data = (await res.json()) as {
    ok: boolean;
    content: string;
    error?: string;
  };
  if (!res.ok || !data.ok) throw new Error(data.error ?? "Erro na IA");
  return data.content;
}

type AuthScreen =
  | "splash"
  | "welcome"
  | "login"
  | "register"
  | "link-institution";
type Tab = "inicio" | "agenda" | "celula" | "perfil";
type ModalScreen =
  | "doacoes"
  | "kids-checkin"
  | "escala"
  | "musica"
  | "inscricao"
  | "song-detail"
  | "lider-celula"
  | "meu-perfil"
  | "promocoes"
  | "cursos";

type EscalaStatus = "pendente" | "confirmado" | "recusado";
type EscalaSlot = {
  id: string;
  date: string;
  time: string;
  service: string;
  role: string;
  status: EscalaStatus;
};
type Song = {
  id: string;
  title: string;
  artist: string;
  key: string;
  bpm: number;
  chords: string;
  lyrics: string;
};
type KidCheckIn = {
  id: string;
  childName: string;
  room: string;
  code: string;
  checkedInAt: string;
  checkedOut: boolean;
};

// ─── Config ───────────────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  useEmulator: false,
};

const BRAND = "#d27836";
const BRAND_DARK = "#1c2433";
const SURFACE = "#f7f3ea";

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_ESCALA: EscalaSlot[] = [
  {
    id: "e1",
    date: "Dom, 29 Jun",
    time: "18:00",
    service: "Culto de Celebração",
    role: "Recepção",
    status: "pendente",
  },
  {
    id: "e2",
    date: "Qua, 02 Jul",
    time: "19:30",
    service: "Culto de Meio de Semana",
    role: "Recepção",
    status: "pendente",
  },
  {
    id: "e3",
    date: "Dom, 06 Jul",
    time: "18:00",
    service: "Culto de Celebração",
    role: "Berçário",
    status: "pendente",
  },
];

const MOCK_SONGS: Song[] = [
  {
    id: "s1",
    title: "Grande é o Senhor",
    artist: "Ministério Zoe",
    key: "G",
    bpm: 72,
    chords: "G - D - Em - C\nG - D - C",
    lyrics: `Grande é o Senhor
E mui digno de louvor
Na cidade do nosso Deus
No seu santo monte

Belo na sua altitude
A alegria de toda a terra
O monte Sião, os lados do norte
É a cidade do Grande Rei`,
  },
  {
    id: "s2",
    title: "Nada além do Sangue",
    artist: "Hillsong",
    key: "A",
    bpm: 68,
    chords: "A - E - F#m - D\nA - E - D",
    lyrics: `Que pode me dar perdão
Somente o sangue de Jesus
Que pode me restaurar
Somente o sangue de Jesus

Oh! Precioso é o fluxo
Que me faz branco como a neve
Nenhum outro fonte sei
Somente o sangue de Jesus`,
  },
  {
    id: "s3",
    title: "Oceans",
    artist: "Hillsong United",
    key: "D",
    bpm: 62,
    chords: "D - A - Bm - G\nD - A - G",
    lyrics: `You call me out upon the waters
The great unknown where feet may fail
And there I find You in the mystery
In oceans deep my faith will stand`,
  },
  {
    id: "s4",
    title: "Tua Graça Me Basta",
    artist: "Ministério Avivah",
    key: "E",
    bpm: 76,
    chords: "E - B - C#m - A\nE - B - A",
    lyrics: `Tua graça me basta
Teu poder se aperfeiçoa
Na fraqueza, na dor
Tua glória eu vou ver`,
  },
];

const MOCK_PROGRAMMING = [
  {
    order: 1,
    type: "Entrada",
    description: "Grande é o Senhor — Ministério Zoe",
  },
  { order: 2, type: "Louvor", description: "Nada além do Sangue — Hillsong" },
  { order: 3, type: "Adoração", description: "Oceans — Hillsong United" },
  {
    order: 4,
    type: "Ofertório",
    description: "Tua Graça Me Basta — Ministério Avivah",
  },
  {
    order: 5,
    type: "Encerramento",
    description: "Grande é o Senhor (reprise)",
  },
];

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [authScreen, setAuthScreen] = useState<AuthScreen>("splash");
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [linkedOrg, setLinkedOrg] = useState<Organization | null>(null);
  const [tenantRuntime, setTenantRuntime] =
    useState<TenantRuntimeSnapshot | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [dataReady, setDataReady] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const notifListener = useRef<null>(null);
  const configured = isFirebaseWebRuntimeConfigured(firebaseConfig);

  // auth listener
  useEffect(() => {
    if (!configured) {
      setAuthReady(true);
      setAuthScreen("welcome");
      return;
    }
    const unsub = subscribeToFirebaseMobileAuthState(firebaseConfig, (u) => {
      setUser(u);
      setAuthReady(true);
      setAuthScreen(u ? "splash" : "welcome");
    });
    return () => unsub();
  }, [configured]);

  // push notifications — desabilitado no Expo Go (suporte removido no SDK 53)
  // funciona em development build / produção
  useEffect(() => {
    void 0;
  }, []);

  // load tenant data
  useEffect(() => {
    if (!user || !configured) {
      setDataReady(false);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const orgId = linkedOrg?.id ?? "";
        if (!orgId) {
          setDataReady(true);
          return;
        }
        const ctx = { organizationId: orgId };
        const [snap, evts, grps] = await Promise.all([
          fetchTenantRuntimeSnapshot(firebaseConfig, ctx),
          fetchEvents(firebaseConfig, ctx, 8),
          fetchGroups(firebaseConfig, ctx, 8),
        ]);
        if (!cancelled) {
          setTenantRuntime(snap);
          setEvents(evts);
          setGroups(grps);
          setDataReady(true);
        }
      } catch {
        if (!cancelled) setDataReady(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [user, linkedOrg, configured]);

  async function handleSignOut() {
    try {
      await signOutFromFirebaseMobile(firebaseConfig);
      setLinkedOrg(null);
      setTenantRuntime(null);
      setEvents([]);
      setGroups([]);
      setDataReady(false);
      setAuthScreen("welcome");
    } catch {}
  }

  // Auth screens
  if (!authReady || (!user && authScreen === "splash")) return <SplashScreen />;
  if (!user) {
    if (authScreen === "welcome")
      return (
        <WelcomeScreen
          onLogin={() => setAuthScreen("login")}
          onRegister={() => setAuthScreen("register")}
        />
      );
    if (authScreen === "login")
      return (
        <LoginScreen
          configured={configured}
          onBack={() => setAuthScreen("welcome")}
          onSuccess={() => setAuthScreen("splash")}
          onRegister={() => setAuthScreen("register")}
        />
      );
    if (authScreen === "register")
      return (
        <RegisterScreen
          configured={configured}
          onBack={() => setAuthScreen("welcome")}
          onSuccess={() => setAuthScreen("link-institution")}
          onLogin={() => setAuthScreen("login")}
        />
      );
    if (authScreen === "link-institution")
      return (
        <LinkInstitutionScreen
          configured={configured}
          onLink={(org) => {
            setLinkedOrg(org);
            setAuthScreen("splash");
          }}
          onSkip={() => setAuthScreen("splash")}
        />
      );
    return (
      <WelcomeScreen
        onLogin={() => setAuthScreen("login")}
        onRegister={() => setAuthScreen("register")}
      />
    );
  }

  return (
    <MainApp
      user={user}
      tenantRuntime={tenantRuntime}
      events={events}
      groups={groups}
      dataReady={dataReady}
      linkedOrg={linkedOrg}
      pushToken={pushToken}
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
        <ActivityIndicator color={BRAND} style={{ marginTop: 32 }} />
      </View>
    </SafeAreaView>
  );
}

// ─── Welcome ──────────────────────────────────────────────────────────────────

function WelcomeScreen({
  onLogin,
  onRegister,
}: {
  onLogin: () => void;
  onRegister: () => void;
}) {
  return (
    <SafeAreaView style={s.fill}>
      <StatusBar style="dark" />
      <View style={[s.fill, { backgroundColor: SURFACE }]}>
        <View style={s.welcomeHero}>
          <View style={[s.logoMark, { backgroundColor: BRAND }]}>
            <Text style={s.logoText}>A</Text>
          </View>
          <Text style={s.welcomeTitle}>Bem-vindo{"\n"}à sua Igreja</Text>
          <Text style={s.welcomeSub}>
            Conecte-se, cresça e sirva com a sua comunidade de fé.
          </Text>
        </View>
        <View style={s.welcomeActions}>
          <Btn label="Criar conta" onPress={onRegister} />
          <Btn label="Já tenho conta" onPress={onLogin} variant="outline" />
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
  onRegister,
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
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function submit() {
    if (!email.trim() || !password || loading) return;
    try {
      setLoading(true);
      setError(null);
      await signInWithFirebaseMobileEmailPassword({
        config: firebaseConfig,
        email: email.trim(),
        password,
      });
      onSuccess();
    } catch (e) {
      setError(formatAuthError(e));
    } finally {
      setLoading(false);
    }
  }

  async function sendReset() {
    if (!email.trim()) {
      setError("Digite seu e-mail acima para receber o link de redefinição.");
      return;
    }
    try {
      setResetLoading(true);
      setError(null);
      await sendPasswordResetEmailMobile(firebaseConfig, email.trim());
      setResetSent(true);
    } catch (e) {
      setError(formatAuthError(e));
    } finally {
      setResetLoading(false);
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
        <ScrollView
          contentContainerStyle={s.formContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.screenTitle}>Entrar</Text>
          <Text style={s.screenSub}>Acesse sua conta para continuar.</Text>
          {!configured && (
            <View style={s.warnBox}>
              <Text style={s.warnText}>
                Firebase não configurado (EXPO_PUBLIC_*).
              </Text>
            </View>
          )}
          <Field
            label="Email"
            value={email}
            onChange={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="seu@email.com"
          />
          <Field
            label="Senha"
            value={password}
            onChange={setPassword}
            secureTextEntry
            placeholder="••••••••"
          />
          {error && <Text style={s.errorText}>{error}</Text>}
          {resetSent && (
            <View style={[s.infoBox, { marginBottom: 12 }]}>
              <Text style={s.infoText}>
                ✉️ Link enviado para {email.trim()}. Verifique sua caixa de
                entrada.
              </Text>
            </View>
          )}
          <Btn label="Entrar" onPress={submit} loading={loading} />
          <TouchableOpacity
            onPress={sendReset}
            style={[s.linkRow, { marginTop: 12 }]}
            disabled={resetLoading}
          >
            <Text style={s.linkText}>
              {resetLoading ? "Enviando..." : "Esqueci minha senha"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onRegister} style={s.linkRow}>
            <Text style={s.linkText}>
              Não tem conta? <Text style={s.linkBold}>Criar conta</Text>
            </Text>
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
  onLogin,
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
      setError("Mínimo 6 caracteres.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await registerWithFirebaseMobileEmailPassword({
        config: firebaseConfig,
        email: email.trim(),
        password,
        displayName: name.trim(),
      });
      onSuccess();
    } catch (e) {
      setError(formatAuthError(e));
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
        <ScrollView
          contentContainerStyle={s.formContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.screenTitle}>Criar conta</Text>
          <Text style={s.screenSub}>Preencha seus dados para começar.</Text>
          {!configured && (
            <View style={s.warnBox}>
              <Text style={s.warnText}>
                Firebase não configurado (EXPO_PUBLIC_*).
              </Text>
            </View>
          )}
          <Field
            label="Nome completo"
            value={name}
            onChange={setName}
            autoCapitalize="words"
            placeholder="Seu nome"
          />
          <Field
            label="Email"
            value={email}
            onChange={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="seu@email.com"
          />
          <Field
            label="Senha"
            value={password}
            onChange={setPassword}
            secureTextEntry
            placeholder="Mínimo 6 caracteres"
          />
          <Field
            label="Confirmar senha"
            value={confirm}
            onChange={setConfirm}
            secureTextEntry
            placeholder="Repita a senha"
          />
          {error && <Text style={s.errorText}>{error}</Text>}
          <Btn label="Criar conta" onPress={submit} loading={loading} />
          <TouchableOpacity onPress={onLogin} style={s.linkRow}>
            <Text style={s.linkText}>
              Já tem conta? <Text style={s.linkBold}>Entrar</Text>
            </Text>
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
  onSkip,
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
        setError("Igreja não encontrada. Verifique o código.");
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
        <ScrollView
          contentContainerStyle={s.formContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.center}>
            <Text style={{ fontSize: 52, marginBottom: 20 }}>⛪</Text>
          </View>
          <Text style={s.screenTitle}>Vincular Igreja</Text>
          <Text style={s.screenSub}>
            Insira o código da sua igreja para conectar sua conta à comunidade.
          </Text>
          <View style={s.infoBox}>
            <Text style={s.infoText}>
              Código fornecido pela secretaria.{"\n"}Exemplo:{" "}
              <Text style={{ fontWeight: "700", color: BRAND }}>
                esdras-church
              </Text>
            </Text>
          </View>
          <Field
            label="Código da Igreja"
            value={slug}
            onChange={setSlug}
            autoCapitalize="none"
            placeholder="ex: minha-igreja"
          />
          {error && <Text style={s.errorText}>{error}</Text>}
          <Btn
            label="Buscar e vincular"
            onPress={search}
            loading={loading}
            disabled={!configured}
          />
          <TouchableOpacity onPress={onSkip} style={s.linkRow}>
            <Text style={s.linkText}>Fazer isso depois</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

function PromocoesScreen({
  primary,
  promotions,
  onBack,
}: {
  primary: string;
  promotions: MarketplacePromotion[];
  onBack: () => void;
}) {
  return (
    <View style={[s.fill, { backgroundColor: "#f8f9fa" }]}>
      <ModalHeader title="Promoções da Comunidade" onBack={onBack} />
      {promotions.length === 0 ? (
        <View style={[s.fill, s.center, { padding: 32 }]}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🏷️</Text>
          <Text style={[s.screenTitle, { textAlign: "center" }]}>
            Nenhuma promoção agora
          </Text>
          <Text style={[s.screenSub, { textAlign: "center" }]}>
            Quando um comerciante da comunidade publicar uma promoção, ela
            aparece aqui — prestigie quem é da casa!
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {promotions.map((p) => (
            <View key={p.id} style={s.promoCard}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                <Text style={{ fontSize: 14 }}>🏷️</Text>
                <Text style={[s.promoStore, { color: primary }]}>
                  {p.storeName}
                </Text>
              </View>
              <Text style={s.promoTitle}>{p.title}</Text>
              {!!p.description && (
                <Text style={s.promoDesc}>{p.description}</Text>
              )}
              {!!p.validUntil && (
                <Text style={s.promoValid}>
                  Válido até{" "}
                  {new Date(p.validUntil).toLocaleDateString("pt-BR")}
                </Text>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// Escola de discipulado no app: o membro navega pelos cursos, assiste a aula
// (abre o vídeo no YouTube) e marca o progresso — que grava no mesmo Firestore
// que a Escola EAD do web usa.
function CursosScreen({
  primary,
  orgId,
  user,
  orgName,
  logoUrl,
  onBack,
}: {
  primary: string;
  orgId?: string;
  user: FirebaseAuthUser;
  orgName: string;
  logoUrl?: string;
  onBack: () => void;
}) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<MemberCourseProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingCourse, setLoadingCourse] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { fetchCourses } = await import("@alvo/firebase");
        const list = await fetchCourses(firebaseConfig, {
          organizationId: orgId,
        });
        if (!cancelled) setCourses(list.filter((c) => c.isActive !== false));
      } catch (e) {
        if (__DEV__) console.warn("fetchCourses falhou:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  async function openCourse(course: Course) {
    setSelectedCourse(course);
    setLoadingCourse(true);
    try {
      const sdk = await import("@alvo/firebase");
      const [mods, less, prog] = await Promise.all([
        sdk.fetchCourseModules(
          firebaseConfig,
          { organizationId: orgId },
          course.id,
        ),
        sdk.fetchCourseLessons(
          firebaseConfig,
          { organizationId: orgId },
          course.id,
        ),
        sdk.fetchMemberCourseProgress(
          firebaseConfig,
          { organizationId: orgId },
          user.uid,
          course.id,
        ),
      ]);
      setModules(mods);
      setLessons(less);
      setProgress(
        prog ?? {
          id: `progress_${user.uid}_${course.id}`,
          organizationId: orgId,
          memberId: user.uid,
          courseId: course.id,
          completedLessons: [],
          isCompleted: false,
          updatedAt: new Date().toISOString(),
        },
      );
    } catch (e) {
      if (__DEV__) console.warn("openCourse falhou:", e);
    } finally {
      setLoadingCourse(false);
    }
  }

  async function toggleLesson(lesson: Lesson) {
    if (!progress || !selectedCourse) return;
    const done = progress.completedLessons.includes(lesson.id);
    const nextCompleted = done
      ? progress.completedLessons.filter((id) => id !== lesson.id)
      : [...progress.completedLessons, lesson.id];
    const courseLessons = lessons.filter(
      (l) => l.courseId === selectedCourse.id,
    );
    const next: MemberCourseProgress = {
      ...progress,
      completedLessons: nextCompleted,
      isCompleted:
        courseLessons.length > 0 &&
        nextCompleted.length >= courseLessons.length,
      updatedAt: new Date().toISOString(),
    };
    setProgress(next);
    try {
      const { saveMemberCourseProgress } = await import("@alvo/firebase");
      await saveMemberCourseProgress(
        firebaseConfig,
        { organizationId: orgId },
        next,
      );
    } catch (e) {
      if (__DEV__) console.warn("saveMemberCourseProgress falhou:", e);
    }
  }

  async function watchLesson(lesson: Lesson) {
    try {
      await Linking.openURL(lesson.videoUrl);
    } catch {
      Alert.alert(
        "Não foi possível abrir",
        "O link do vídeo desta aula parece inválido.",
      );
    }
  }

  // Detalhe do curso (módulos + aulas)
  if (selectedCourse) {
    const courseLessons = lessons.filter(
      (l) => l.courseId === selectedCourse.id,
    );
    const doneCount = progress
      ? courseLessons.filter((l) => progress.completedLessons.includes(l.id))
          .length
      : 0;
    const pct = courseLessons.length
      ? Math.round((doneCount / courseLessons.length) * 100)
      : 0;
    const sortedModules = modules
      .filter((m) => m.courseId === selectedCourse.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const memberName = user.displayName ?? user.email ?? "Membro";
    const completedDate =
      progress?.completedAt ?? progress?.updatedAt ?? new Date().toISOString();

    // Certificado de conclusão — logo da igreja, nome do membro e do professor
    if (showCertificate) {
      const instructorLine = selectedCourse.instructorName
        ? `${selectedCourse.instructorTitle ? selectedCourse.instructorTitle + " " : ""}${selectedCourse.instructorName}`
        : null;
      const dateLabel = new Date(completedDate).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      const shareCertificate = async () => {
        try {
          await Share.share({
            message: `🎓 Certificado de Conclusão\n\n${memberName} concluiu o curso "${selectedCourse.title}" por ${orgName}.${instructorLine ? `\nMinistrado por ${instructorLine}.` : ""}\nConcluído em ${dateLabel}.`,
          });
        } catch {}
      };
      return (
        <View style={[s.fill, { backgroundColor: "#0f1b2d" }]}>
          <ModalHeader
            title="Certificado"
            onBack={() => setShowCertificate(false)}
          />
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            <View style={cert.frame}>
              <View style={cert.inner}>
                {logoUrl ? (
                  <Image
                    source={{ uri: logoUrl }}
                    style={cert.logo}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={cert.church}>{orgName}</Text>
                )}
                {logoUrl ? <Text style={cert.church}>{orgName}</Text> : null}
                <View style={cert.divider} />
                <Text style={cert.eyebrow}>CERTIFICADO DE CONCLUSÃO</Text>
                <Text style={cert.certifies}>Certificamos que</Text>
                <Text style={cert.name}>{memberName}</Text>
                <Text style={cert.body}>concluiu com êxito o curso</Text>
                <Text style={cert.course}>{selectedCourse.title}</Text>
                {instructorLine ? (
                  <>
                    <Text style={[cert.body, { marginTop: 14 }]}>
                      Ministrado por
                    </Text>
                    <Text style={cert.instructor}>{instructorLine}</Text>
                  </>
                ) : null}
                <Text style={cert.date}>Concluído em {dateLabel}</Text>
                <Text style={cert.seal}>🎓</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => void shareCertificate()}
              style={[s.cta, { backgroundColor: primary }]}
            >
              <Text style={s.ctaText}>Compartilhar certificado</Text>
            </TouchableOpacity>
            <Text
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: 12,
                textAlign: "center",
              }}
            >
              Dica: tire um print desta tela para guardar ou imprimir seu
              certificado.
            </Text>
          </ScrollView>
        </View>
      );
    }

    return (
      <View style={[s.fill, { backgroundColor: "#f8f9fa" }]}>
        <ModalHeader
          title={selectedCourse.title}
          onBack={() => setSelectedCourse(null)}
        />
        {loadingCourse ? (
          <View style={{ padding: 16 }}>
            <LoadingRow primary={primary} label="Carregando aulas..." />
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
            <View style={s.card}>
              <Text style={s.eyebrow}>SEU PROGRESSO</Text>
              <Text style={s.cardTitle}>{pct}% concluído</Text>
              <View
                style={{
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: "#e2e8f0",
                  overflow: "hidden",
                  marginTop: 8,
                }}
              >
                <View
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    backgroundColor: primary,
                  }}
                />
              </View>
              <Text style={[s.cardMeta, { marginTop: 6 }]}>
                {doneCount} de {courseLessons.length} aula(s)
              </Text>
              {pct === 100 && courseLessons.length > 0 && (
                <>
                  <Text
                    style={{
                      marginTop: 8,
                      color: "#16a34a",
                      fontWeight: "700",
                    }}
                  >
                    🎉 Curso concluído! Seu certificado está pronto.
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowCertificate(true)}
                    style={[s.cta, { backgroundColor: primary, marginTop: 10 }]}
                  >
                    <Text style={s.ctaText}>🎓 Ver certificado</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {sortedModules.length === 0 ? (
              <View style={[s.center, { padding: 24 }]}>
                <Text style={s.cardMeta}>
                  Este curso ainda não tem aulas publicadas.
                </Text>
              </View>
            ) : (
              sortedModules.map((mod) => {
                const modLessons = lessons
                  .filter((l) => l.moduleId === mod.id)
                  .sort((a, b) => a.sortOrder - b.sortOrder);
                return (
                  <View key={mod.id} style={s.card}>
                    <Text style={[s.sectionTitle, { marginTop: 0 }]}>
                      {mod.title}
                    </Text>
                    {modLessons.length === 0 ? (
                      <Text style={s.cardMeta}>
                        Sem aulas neste módulo ainda.
                      </Text>
                    ) : (
                      modLessons.map((les) => {
                        const done = progress?.completedLessons.includes(
                          les.id,
                        );
                        return (
                          <View
                            key={les.id}
                            style={{
                              borderTopWidth: 1,
                              borderTopColor: "#eef0f2",
                              paddingTop: 12,
                              marginTop: 12,
                            }}
                          >
                            <Text
                              style={{ fontWeight: "700", color: BRAND_DARK }}
                            >
                              {les.title}
                            </Text>
                            <Text style={s.cardMeta}>
                              {les.durationMinutes} min
                            </Text>
                            <View
                              style={{
                                flexDirection: "row",
                                gap: 8,
                                marginTop: 10,
                              }}
                            >
                              <TouchableOpacity
                                onPress={() => watchLesson(les)}
                                style={[
                                  s.cta,
                                  { backgroundColor: primary, flex: 1 },
                                ]}
                              >
                                <Text style={s.ctaText}>Assistir</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => toggleLesson(les)}
                                style={[
                                  s.cta,
                                  {
                                    flex: 1,
                                    backgroundColor: done
                                      ? "#16a34a"
                                      : "#e6eaf0",
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    s.ctaText,
                                    { color: done ? "#fff" : BRAND_DARK },
                                  ]}
                                >
                                  {done ? "✓ Concluída" : "Marcar concluída"}
                                </Text>
                              </TouchableOpacity>
                            </View>
                            {les.materialUrl ? (
                              <TouchableOpacity
                                onPress={() => {
                                  void Linking.openURL(les.materialUrl!);
                                }}
                                style={{ marginTop: 10 }}
                              >
                                <Text
                                  style={{ color: primary, fontWeight: "600" }}
                                >
                                  📎 Material de apoio
                                </Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        );
                      })
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        )}
      </View>
    );
  }

  // Lista de cursos
  return (
    <View style={[s.fill, { backgroundColor: "#f8f9fa" }]}>
      <ModalHeader title="Cursos" onBack={onBack} />
      {loading ? (
        <View style={{ padding: 16 }}>
          <LoadingRow primary={primary} label="Carregando cursos..." />
        </View>
      ) : courses.length === 0 ? (
        <View style={[s.fill, s.center, { padding: 32 }]}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🎓</Text>
          <Text style={[s.screenTitle, { textAlign: "center" }]}>
            Nenhum curso ainda
          </Text>
          <Text style={[s.screenSub, { textAlign: "center" }]}>
            Quando a liderança publicar cursos de capacitação, eles aparecem
            aqui.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {courses.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={s.card}
              onPress={() => void openCourse(c)}
            >
              <Text style={s.eyebrow}>CURSO</Text>
              <Text style={s.cardTitle}>{c.title}</Text>
              {!!c.description && (
                <Text style={s.cardMeta}>{c.description}</Text>
              )}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 10,
                }}
              >
                <Ionicons name="play-circle" size={18} color={primary} />
                <Text style={{ color: primary, fontWeight: "700" }}>
                  Começar
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function MainApp({
  user,
  tenantRuntime,
  events,
  groups,
  dataReady,
  linkedOrg,
  pushToken,
  onSignOut,
}: {
  user: FirebaseAuthUser;
  tenantRuntime: TenantRuntimeSnapshot | null;
  events: Event[];
  groups: Group[];
  dataReady: boolean;
  linkedOrg: Organization | null;
  pushToken: string | null;
  onSignOut: () => void;
}) {
  const [tab, setTab] = useState<Tab>("inicio");
  const [modalStack, setModalStack] = useState<ModalScreen[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  // Promoções do marketplace (notificação in-app): busca ao abrir; "vistas"
  // ficam em memória da sessão (badge some depois de abrir o sino).
  const [promotions, setPromotions] = useState<MarketplacePromotion[]>([]);
  const [seenPromoIds, setSeenPromoIds] = useState<Set<string>>(new Set());

  const primary = tenantRuntime?.settings?.branding?.primaryColor ?? BRAND;
  const orgName =
    tenantRuntime?.organization?.displayName ??
    tenantRuntime?.organization?.name ??
    linkedOrg?.displayName ??
    linkedOrg?.name ??
    "Minha Igreja";
  const firstName = user.displayName?.split(" ")[0] ?? "Membro";
  const orgId = tenantRuntime?.organization?.id ?? linkedOrg?.id ?? "";
  const brandLogo =
    tenantRuntime?.settings?.branding?.logoLightUrl ??
    tenantRuntime?.settings?.branding?.logoDarkUrl ??
    tenantRuntime?.settings?.branding?.iconUrl ??
    undefined;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const promos = await fetchMarketplacePromotions(
          firebaseConfig,
          { organizationId: orgId },
          30,
        );
        if (!cancelled) setPromotions(promos);
      } catch (e) {
        if (__DEV__) console.warn("fetchMarketplacePromotions falhou:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const unseenPromoCount = promotions.filter(
    (p) => !seenPromoIds.has(p.id),
  ).length;

  function push(screen: ModalScreen) {
    setModalStack((p) => [...p, screen]);
  }
  function pop() {
    setModalStack((p) => p.slice(0, -1));
  }

  function openPromocoes() {
    setSeenPromoIds(new Set(promotions.map((p) => p.id)));
    push("promocoes");
  }

  const modal = modalStack[modalStack.length - 1] ?? null;

  function openInscricao(event: Event) {
    setSelectedEvent(event);
    push("inscricao");
  }
  function openSongDetail(song: Song) {
    setSelectedSong(song);
    push("song-detail");
  }

  return (
    <SafeAreaView style={s.fill}>
      <StatusBar style="dark" />
      <View style={[s.fill, { backgroundColor: "#f8f9fa" }]}>
        {/* Header */}
        <View style={[s.mainHeader, { backgroundColor: primary }]}>
          <View>
            <Text style={s.mainGreeting}>Olá, {firstName} 👋</Text>
            <Text style={s.mainOrg}>{orgName}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TouchableOpacity
              onPress={openPromocoes}
              hitSlop={10}
              accessibilityLabel="Promoções do marketplace"
            >
              <Ionicons name="notifications-outline" size={24} color="#fff" />
              {unseenPromoCount > 0 && (
                <View style={s.notifBadge}>
                  <Text style={s.notifBadgeText}>
                    {unseenPromoCount > 9 ? "9+" : unseenPromoCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <View
              style={[
                s.avatarCircle,
                { backgroundColor: "rgba(255,255,255,0.25)" },
              ]}
            >
              <Text style={s.avatarText}>
                {(user.displayName ?? user.email ?? "M")[0].toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={s.fill}>
          {tab === "inicio" && !modal && (
            <HomeTab
              primary={primary}
              events={events}
              groups={groups}
              dataReady={dataReady}
              user={user}
              orgId={orgId}
              onOpenDoacoes={() => push("doacoes")}
              onOpenKids={() => push("kids-checkin")}
              onOpenEscala={() => push("escala")}
              onOpenMusica={() => push("musica")}
              onOpenCursos={() => push("cursos")}
            />
          )}
          {tab === "agenda" && !modal && (
            <AgendaTab
              events={events}
              primary={primary}
              dataReady={dataReady}
              onInscricao={openInscricao}
            />
          )}
          {tab === "celula" && !modal && (
            <CelulaTab
              groups={groups}
              primary={primary}
              dataReady={dataReady}
              orgId={orgId}
              user={user}
              onOpenLider={() => push("lider-celula")}
            />
          )}
          {tab === "perfil" && !modal && (
            <PerfilTab
              user={user}
              orgName={orgName}
              linkedOrg={linkedOrg}
              orgId={orgId}
              primary={primary}
              pushToken={pushToken}
              onSignOut={onSignOut}
              onOpenEscala={() => push("escala")}
              onOpenMusica={() => push("musica")}
              onOpenMeuPerfil={() => push("meu-perfil")}
            />
          )}

          {/* Modals */}
          {modal === "doacoes" && (
            <DoacoesScreen
              primary={primary}
              orgName={orgName}
              orgId={orgId}
              user={user}
              onBack={pop}
            />
          )}
          {modal === "kids-checkin" && (
            <KidsCheckinScreen
              primary={primary}
              user={user}
              orgId={orgId}
              onBack={pop}
            />
          )}
          {modal === "escala" && (
            <EscalaScreen
              primary={primary}
              user={user}
              orgId={orgId}
              onBack={pop}
            />
          )}
          {modal === "musica" && (
            <MusicaScreen
              primary={primary}
              onBack={pop}
              onOpenSong={openSongDetail}
            />
          )}
          {modal === "inscricao" && selectedEvent && (
            <InscricaoScreen
              primary={primary}
              event={selectedEvent}
              user={user}
              orgId={orgId}
              onBack={pop}
            />
          )}
          {modal === "song-detail" && selectedSong && (
            <SongDetailScreen
              song={selectedSong}
              primary={primary}
              onBack={pop}
            />
          )}
          {modal === "lider-celula" && (
            <LiderCelulaScreen
              primary={primary}
              user={user}
              orgId={orgId}
              onBack={pop}
            />
          )}
          {modal === "meu-perfil" && (
            <MeuPerfilScreen
              primary={primary}
              user={user}
              orgId={orgId}
              onBack={pop}
            />
          )}
          {modal === "promocoes" && (
            <PromocoesScreen
              primary={primary}
              promotions={promotions}
              onBack={pop}
            />
          )}
          {modal === "cursos" && (
            <CursosScreen
              primary={primary}
              orgId={orgId}
              user={user}
              orgName={orgName}
              logoUrl={brandLogo}
              onBack={pop}
            />
          )}
        </View>

        {/* Tab Bar — hidden when modal is open */}
        {!modal && (
          <View style={s.tabBar}>
            {(
              [
                {
                  id: "inicio",
                  label: "Início",
                  icon: "home-outline" as const,
                  iconActive: "home" as const,
                },
                {
                  id: "agenda",
                  label: "Agenda",
                  icon: "calendar-outline" as const,
                  iconActive: "calendar" as const,
                },
                {
                  id: "celula",
                  label: "Célula",
                  icon: "people-outline" as const,
                  iconActive: "people" as const,
                },
                {
                  id: "perfil",
                  label: "Perfil",
                  icon: "person-outline" as const,
                  iconActive: "person" as const,
                },
              ] as const
            ).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={s.tabItem}
                onPress={() => setTab(item.id)}
              >
                <Ionicons
                  name={tab === item.id ? item.iconActive : item.icon}
                  size={22}
                  color={tab === item.id ? primary : "#9ca3af"}
                />
                <Text
                  style={[
                    s.tabLabel,
                    tab === item.id && { color: primary, fontWeight: "700" },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Home Tab ─────────────────────────────────────────────────────────────────

function HomeTab({
  primary,
  events,
  groups,
  dataReady,
  user,
  orgId,
  onOpenDoacoes,
  onOpenKids,
  onOpenEscala,
  onOpenMusica,
  onOpenCursos,
}: {
  primary: string;
  events: Event[];
  groups: Group[];
  dataReady: boolean;
  user: FirebaseAuthUser;
  orgId?: string;
  onOpenDoacoes: () => void;
  onOpenKids: () => void;
  onOpenEscala: () => void;
  onOpenMusica: () => void;
  onOpenCursos: () => void;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const nextEvent = events[0];
  const myGroup = groups[0];

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (!orgId) return;
      await Promise.all([
        fetchEvents(firebaseConfig, { organizationId: orgId }, 8),
        fetchGroups(firebaseConfig, { organizationId: orgId }, 8),
      ]);
    } catch {
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={s.tabContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={primary}
        />
      }
    >
      {!dataReady && (
        <LoadingRow
          primary={primary}
          label="Carregando dados da sua igreja..."
        />
      )}

      {/* Next event */}
      {nextEvent ? (
        <View
          style={[s.card, { borderLeftColor: primary, borderLeftWidth: 4 }]}
        >
          <Text style={s.eyebrow}>PRÓXIMO EVENTO</Text>
          <Text style={s.cardTitle}>{nextEvent.name}</Text>
          <Text style={s.cardMeta}>
            {formatDate(nextEvent.startsAt)} · {formatHour(nextEvent.startsAt)}
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <View style={[s.cta, { backgroundColor: primary, flex: 1 }]}>
              <Text style={s.ctaText}>Fazer check-in</Text>
            </View>
          </View>
        </View>
      ) : dataReady ? (
        <View
          style={[s.card, { borderLeftColor: primary, borderLeftWidth: 3 }]}
        >
          <Text style={s.cardTitle}>Nenhum evento próximo</Text>
          <Text style={s.cardMeta}>
            Fique atento às novidades da sua igreja.
          </Text>
        </View>
      ) : null}

      {/* Quick actions */}
      <Text style={s.sectionTitle}>Acesso rápido</Text>
      <View style={s.quickGrid}>
        <QuickAction
          icon="heart"
          tint="#c2410c"
          bg="#fff3e8"
          label="Dízimos e Doações"
          sub="PIX e cartão"
          onPress={onOpenDoacoes}
        />
        <QuickAction
          icon="happy-outline"
          tint="#3b6d11"
          bg="#eaf3de"
          label="Kids Check-in"
          sub="Entrada/saída da escolinha"
          onPress={onOpenKids}
        />
        <QuickAction
          icon="checkbox-outline"
          tint="#185fa5"
          bg="#e6f1fb"
          label="Minha Escala"
          sub="Confirmar serviço"
          onPress={onOpenEscala}
        />
        <QuickAction
          icon="musical-notes"
          tint="#534ab7"
          bg="#eeedfe"
          label="Ministério Musical"
          sub="Repertório e cifras"
          onPress={onOpenMusica}
        />
        <QuickAction
          icon="school-outline"
          tint="#0f766e"
          bg="#e3f5f1"
          label="Cursos"
          sub="Escola de discipulado"
          onPress={onOpenCursos}
        />
      </View>

      {/* My cell */}
      {myGroup && (
        <>
          <Text style={s.sectionTitle}>Minha Célula</Text>
          <View
            style={[s.card, { borderLeftColor: primary, borderLeftWidth: 3 }]}
          >
            <Text style={s.cardTitle}>{myGroup.name}</Text>
            <Text style={s.cardMeta}>
              {myGroup.meetingDayOfWeek != null
                ? dowLabel(myGroup.meetingDayOfWeek)
                : "Dia a definir"}
              {myGroup.meetingTime ? ` · ${myGroup.meetingTime}` : ""}
            </Text>
          </View>
        </>
      )}

      {/* Journey */}
      <JourneySection primary={primary} user={user} orgId={orgId} />
    </ScrollView>
  );
}

// ─── Journey (jornada gamificada) ─────────────────────────────────────────────

type JourneyStepDef = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  nudge: string;
};

// Vocabulário alinhado ao JourneyStage do backend (@alvo/types): exploring → connecting/grounding → serving.
const JOURNEY_STEPS: JourneyStepDef[] = [
  { key: "exploring", label: "Chegou", icon: "footsteps-outline", nudge: "" },
  {
    key: "connecting",
    label: "Conectado",
    icon: "people",
    nudge: "Confirme presença na sua célula para avançar",
  },
  {
    key: "grounding",
    label: "Enraizado",
    icon: "leaf",
    nudge: "Complete o curso de novos membros",
  },
  { key: "serving", label: "Servindo", icon: "hand-left-outline", nudge: "" },
  {
    key: "developing",
    label: "Crescendo",
    icon: "trending-up",
    nudge: "Inicie um projeto de missões",
  },
  { key: "leading", label: "Liderando", icon: "star", nudge: "" },
];

const JOURNEY_STAGE_INDEX: Record<string, number> = {
  exploring: 0,
  connecting: 1,
  grounding: 2,
  serving: 3,
  developing: 4,
  leading: 5,
};

function JourneySection({
  primary,
  user,
  orgId,
}: {
  primary: string;
  user: FirebaseAuthUser;
  orgId?: string;
}) {
  const [profile, setProfile] = useState<MemberJourneyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId || !user) return;
    let cancelled = false;
    async function load() {
      try {
        const p = await fetchMemberJourneyProfile(
          firebaseConfig,
          { organizationId: orgId },
          user.uid,
        );
        if (!cancelled) setProfile(p);
      } catch {
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [orgId, user?.uid]);

  if (loading) return null;

  const stage = profile?.currentStage ?? "exploring";
  const stepIndex = JOURNEY_STAGE_INDEX[stage] ?? 0;
  const currentStep = JOURNEY_STEPS[stepIndex];

  return (
    <>
      <Text style={s.sectionTitle}>
        Minha jornada · etapa {stepIndex + 1} de {JOURNEY_STEPS.length}
      </Text>
      <View style={s.card}>
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          {JOURNEY_STEPS.map((step, i, arr) => {
            const done = i < stepIndex;
            const current = i === stepIndex;
            const locked = i > stepIndex;
            return (
              <View
                key={step.key}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  flex: i < arr.length - 1 ? 1 : undefined,
                }}
              >
                <View style={s.journeyStep}>
                  <View
                    style={[
                      s.journeyIconWrap,
                      done && { backgroundColor: primary },
                      current && {
                        backgroundColor: `${primary}20`,
                        borderWidth: 2,
                        borderColor: primary,
                      },
                      locked && {
                        backgroundColor: "transparent",
                        borderWidth: 2,
                        borderColor: "#e5e7eb",
                        borderStyle: "dashed",
                      },
                    ]}
                  >
                    <Ionicons
                      name={done ? "checkmark" : step.icon}
                      size={16}
                      color={done ? "#fff" : current ? primary : "#9ca3af"}
                    />
                  </View>
                  <Text
                    style={[
                      s.journeyLabel,
                      current && { color: primary, fontWeight: "700" },
                    ]}
                  >
                    {step.label}
                  </Text>
                </View>
                {i < arr.length - 1 && (
                  <View
                    style={[
                      s.journeyLine,
                      {
                        backgroundColor: done ? primary : "#e5e7eb",
                        flex: 1,
                        marginTop: 15,
                      },
                    ]}
                  />
                )}
              </View>
            );
          })}
        </View>
        {currentStep.nudge ? (
          <View style={s.journeyNudge}>
            <Ionicons name="sparkles-outline" size={14} color={primary} />
            <Text style={[s.journeyNudgeText, { flex: 1 }]}>
              {currentStep.nudge}
            </Text>
          </View>
        ) : null}
      </View>
    </>
  );
}

// ─── Agenda Tab ───────────────────────────────────────────────────────────────

function AgendaTab({
  events,
  primary,
  dataReady,
  onInscricao,
}: {
  events: Event[];
  primary: string;
  dataReady: boolean;
  onInscricao: (e: Event) => void;
}) {
  const staticEvents = [
    {
      id: "s1",
      name: "Culto de Celebração",
      startsAt: nextDow(0, 18),
      type: "culto",
      paid: false,
    },
    {
      id: "s2",
      name: "Reunião de Célula",
      startsAt: nextDow(3, 19.5),
      type: "celula",
      paid: false,
    },
    {
      id: "s3",
      name: "Retiro de Jovens",
      startsAt: nextDow(5, 8),
      type: "retiro",
      paid: true,
    },
  ];
  const list = events.length > 0 ? events : staticEvents;

  return (
    <ScrollView
      contentContainerStyle={s.tabContent}
      showsVerticalScrollIndicator={false}
    >
      {!dataReady && (
        <LoadingRow primary={primary} label="Carregando agenda..." />
      )}
      <Text style={s.sectionTitle}>Próximos Eventos</Text>
      {list.map((event) => (
        <View key={event.id} style={s.agendaCard}>
          <View style={[s.agendaDate, { backgroundColor: primary }]}>
            <Text style={s.agendaWd}>{formatWd(event.startsAt)}</Text>
            <Text style={s.agendaDn}>{formatDn(event.startsAt)}</Text>
          </View>
          <View style={s.agendaInfo}>
            <Text style={s.cardTitle}>{event.name}</Text>
            <Text style={s.cardMeta}>{formatHour(event.startsAt)}</Text>
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                marginTop: 8,
                flexWrap: "wrap",
              }}
            >
              <View style={[s.badge, { backgroundColor: `${primary}20` }]}>
                <Text style={[s.badgeText, { color: primary }]}>
                  {eventLabel(event.type)}
                </Text>
              </View>
              {"paid" in event &&
                (event as typeof event & { paid?: boolean }).paid && (
                  <View style={[s.badge, { backgroundColor: "#fef3c7" }]}>
                    <Text style={[s.badgeText, { color: "#92400e" }]}>
                      Pago
                    </Text>
                  </View>
                )}
            </View>
            <TouchableOpacity
              onPress={() => onInscricao(event as Event)}
              style={[
                s.cta,
                {
                  backgroundColor: primary,
                  marginTop: 10,
                  alignSelf: "flex-start",
                },
              ]}
            >
              <Text style={s.ctaText}>Inscrever-se</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Célula Tab ───────────────────────────────────────────────────────────────

function CelulaTab({
  groups,
  primary,
  dataReady,
  orgId,
  user,
  onOpenLider,
}: {
  groups: Group[];
  primary: string;
  dataReady: boolean;
  orgId?: string;
  user: FirebaseAuthUser;
  onOpenLider: () => void;
}) {
  const [sel, setSel] = useState<Group | null>(groups[0] ?? null);
  const [confirmed, setConfirmed] = useState(false);
  const [prayer, setPrayer] = useState("");
  const [prayerSent, setPrayerSent] = useState(false);
  const [prayerSending, setPrayerSending] = useState(false);
  const [prayerPublic, setPrayerPublic] = useState(false);
  const [wall, setWall] = useState<PrayerRequest[]>([]);
  const [wallLoading, setWallLoading] = useState(true);
  const [prayedIds, setPrayedIds] = useState<Set<string>>(new Set());

  async function loadWall() {
    try {
      const items = await fetchPublicPrayerWall(
        firebaseConfig,
        { organizationId: orgId },
        50,
      );
      setWall(items);
    } catch {
      // silencioso — mural é conteúdo secundário, não deve travar a tela
    } finally {
      setWallLoading(false);
    }
  }

  useEffect(() => {
    if (orgId) void loadWall();
  }, [orgId]);

  async function submitPrayer() {
    const text = prayer.trim();
    if (!text || prayerSending) return;
    setPrayerSending(true);
    try {
      await addPrayerRequest(
        firebaseConfig,
        { organizationId: orgId },
        {
          personName: user.displayName ?? user.email ?? "Membro",
          phone: user.phoneNumber ?? undefined,
          message: text,
          source: "app",
          isPublic: prayerPublic,
        },
      );
      setPrayerSent(true);
      if (prayerPublic) void loadWall();
    } catch {
      Alert.alert(
        "Não foi possível enviar",
        "Verifique sua conexão e tente novamente.",
      );
    } finally {
      setPrayerSending(false);
    }
  }

  async function prayFor(id: string) {
    if (prayedIds.has(id)) return;
    setPrayedIds((prev) => new Set(prev).add(id));
    setWall((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, prayerCount: r.prayerCount + 1 } : r,
      ),
    );
    try {
      await incrementPrayerCount(firebaseConfig, { organizationId: orgId }, id);
    } catch {
      // reverte silenciosamente se falhar
      setWall((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, prayerCount: Math.max(0, r.prayerCount - 1) }
            : r,
        ),
      );
      setPrayedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  const announcements = [
    "Próxima reunião: confirme sua presença até amanhã.",
    "Estudo desta semana: Filipenses 4:4-7 — Paz de Deus.",
    "Lembre-se de trazer um amigo novo na semana que vem!",
  ];

  return (
    <ScrollView
      contentContainerStyle={s.tabContent}
      showsVerticalScrollIndicator={false}
    >
      {!dataReady && (
        <LoadingRow primary={primary} label="Carregando células..." />
      )}

      {/* Banner exclusivo do líder — visível para group_leader e acima */}
      <TouchableOpacity
        style={[s.liderBanner, { borderColor: primary }]}
        onPress={onOpenLider}
        activeOpacity={0.85}
      >
        <View style={[s.liderBannerIcon, { backgroundColor: primary }]}>
          <Text style={{ fontSize: 22 }}>🎯</Text>
        </View>
        <View style={s.fill}>
          <Text style={[s.liderBannerTitle, { color: primary }]}>
            Área do Líder
          </Text>
          <Text style={s.liderBannerSub}>
            Roteiro, dinâmica e ferramentas de IA para o seu encontro
          </Text>
        </View>
        <Text style={[s.menuChev, { color: primary }]}>›</Text>
      </TouchableOpacity>

      {groups.length === 0 && dataReady && (
        <EmptyState
          icon="🤝"
          title="Nenhuma célula encontrada"
          sub="Entre em contato com sua liderança para ser adicionado a uma célula."
        />
      )}
      {groups.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 12 }}
        >
          {groups.map((g) => (
            <Pressable
              key={g.id}
              style={[s.chip, sel?.id === g.id && { backgroundColor: primary }]}
              onPress={() => {
                setSel(g);
                setConfirmed(false);
              }}
            >
              <Text style={[s.chipText, sel?.id === g.id && { color: "#fff" }]}>
                {g.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {(sel ?? groups[0]) && (
        <>
          <View
            style={[s.card, { borderLeftColor: primary, borderLeftWidth: 3 }]}
          >
            <Text style={s.cardTitle}>{(sel ?? groups[0])!.name}</Text>
            <Text style={s.cardMeta}>
              {(sel ?? groups[0])!.meetingDayOfWeek != null
                ? dowLabel((sel ?? groups[0])!.meetingDayOfWeek!)
                : "Dia a definir"}
            </Text>
          </View>

          <Text style={s.sectionTitle}>Presença</Text>
          <View style={s.card}>
            {confirmed ? (
              <View style={s.row}>
                <Text style={{ fontSize: 22, color: primary }}>✓</Text>
                <Text style={[s.cardTitle, { marginLeft: 8 }]}>
                  Presença confirmada!
                </Text>
              </View>
            ) : (
              <Btn
                label="Confirmar presença"
                onPress={() => setConfirmed(true)}
                color={primary}
              />
            )}
          </View>

          <Text style={s.sectionTitle}>Avisos</Text>
          {announcements.map((a, i) => (
            <View key={i} style={s.announcementRow}>
              <Text
                style={{
                  color: primary,
                  marginRight: 8,
                  fontSize: 10,
                  marginTop: 4,
                }}
              >
                ●
              </Text>
              <Text style={[s.cardMeta, { flex: 1, lineHeight: 20 }]}>{a}</Text>
            </View>
          ))}

          <Text style={s.sectionTitle}>Pedido de Oração</Text>
          <View style={s.card}>
            {prayerSent ? (
              <View style={s.row}>
                <Text style={{ fontSize: 22 }}>🙏</Text>
                <Text style={[s.cardMeta, { flex: 1, marginLeft: 8 }]}>
                  Pedido enviado! Sua liderança irá orar por você.
                </Text>
              </View>
            ) : (
              <>
                <TextInput
                  style={s.prayerInput}
                  value={prayer}
                  onChangeText={setPrayer}
                  placeholder="Escreva seu pedido de oração..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <View
                  style={[
                    s.row,
                    { marginTop: 12, justifyContent: "space-between" },
                  ]}
                >
                  <Text style={[s.cardMeta, { flex: 1, marginRight: 8 }]}>
                    Compartilhar no mural da igreja, para outros orarem junto
                  </Text>
                  <Switch
                    value={prayerPublic}
                    onValueChange={setPrayerPublic}
                    trackColor={{ true: primary }}
                  />
                </View>
                <Btn
                  label="Enviar pedido"
                  onPress={submitPrayer}
                  loading={prayerSending}
                  color={primary}
                  style={{ marginTop: 12 }}
                />
              </>
            )}
          </View>

          <Text style={s.sectionTitle}>Mural de Oração</Text>
          {wallLoading && (
            <LoadingRow primary={primary} label="Carregando mural..." />
          )}
          {!wallLoading && wall.length === 0 && (
            <EmptyState
              icon="🙏"
              title="Mural vazio"
              sub="Quando alguém compartilhar um pedido publicamente, ele aparece aqui para a comunidade orar junto."
            />
          )}
          {wall.map((r) => (
            <View key={r.id} style={s.card}>
              <Text style={s.cardTitle}>{r.personName}</Text>
              <Text style={[s.cardMeta, { marginTop: 4, marginBottom: 10 }]}>
                {r.message}
              </Text>
              <TouchableOpacity
                style={[
                  s.chip,
                  prayedIds.has(r.id) && { backgroundColor: primary },
                ]}
                onPress={() => prayFor(r.id)}
                disabled={prayedIds.has(r.id)}
              >
                <Text
                  style={[s.chipText, prayedIds.has(r.id) && { color: "#fff" }]}
                >
                  🙏 {prayedIds.has(r.id) ? "Você orou" : "Orar por isso"} ·{" "}
                  {r.prayerCount}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

// ─── Perfil Tab ───────────────────────────────────────────────────────────────

function PerfilTab({
  user,
  orgName,
  linkedOrg,
  orgId,
  primary,
  pushToken,
  onSignOut,
  onOpenEscala,
  onOpenMusica,
  onOpenMeuPerfil,
}: {
  user: FirebaseAuthUser;
  orgName: string;
  linkedOrg: Organization | null;
  orgId?: string;
  primary: string;
  pushToken: string | null;
  onSignOut: () => void;
  onOpenEscala: () => void;
  onOpenMusica: () => void;
  onOpenMeuPerfil: () => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={s.tabContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.profileHeader}>
        <View style={[s.profileAvatar, { backgroundColor: primary }]}>
          <Text style={s.profileAvatarText}>
            {(user.displayName ?? user.email ?? "M")[0].toUpperCase()}
          </Text>
        </View>
        <Text style={s.profileName}>{user.displayName ?? "Membro"}</Text>
        <Text style={s.profileEmail}>{user.email}</Text>
        {pushToken && (
          <View style={[s.badge, { backgroundColor: "#dcfce7", marginTop: 8 }]}>
            <Text style={[s.badgeText, { color: "#166534" }]}>
              🔔 Notificações ativas
            </Text>
          </View>
        )}
      </View>

      <Text style={s.sectionTitle}>Minha Igreja</Text>
      <View style={[s.card, { borderLeftColor: primary, borderLeftWidth: 3 }]}>
        <Text style={s.cardTitle}>{orgName}</Text>
        <Text style={s.cardMeta}>
          {linkedOrg?.slug
            ? `Código: ${linkedOrg.slug}`
            : "Igreja não vinculada"}
        </Text>
      </View>

      <Text style={s.sectionTitle}>Meu Perfil</Text>
      <TouchableOpacity style={s.menuRow} onPress={onOpenMeuPerfil}>
        <Text style={s.menuIcon}>✨</Text>
        <View style={s.fill}>
          <Text style={s.menuLabel}>Perfil Ministerial</Text>
          <Text style={s.menuSub}>
            Dons, disponibilidade e informações pessoais
          </Text>
        </View>
        <Text style={s.menuChev}>›</Text>
      </TouchableOpacity>

      <Text style={s.sectionTitle}>Serviço</Text>
      <TouchableOpacity style={s.menuRow} onPress={onOpenEscala}>
        <Text style={s.menuIcon}>📋</Text>
        <View style={s.fill}>
          <Text style={s.menuLabel}>Minha Escala</Text>
          <Text style={s.menuSub}>Ver e confirmar escalas de serviço</Text>
        </View>
        <Text style={s.menuChev}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.menuRow} onPress={onOpenMusica}>
        <Text style={s.menuIcon}>🎸</Text>
        <View style={s.fill}>
          <Text style={s.menuLabel}>Ministério Musical</Text>
          <Text style={s.menuSub}>Repertório, cifras e programação</Text>
        </View>
        <Text style={s.menuChev}>›</Text>
      </TouchableOpacity>

      <Text style={s.sectionTitle}>Minha Conta</Text>
      {[
        { label: "Status", value: "Membro ativo" },
        { label: "Jornada", value: "Conectando" },
        { label: "Tribo", value: "A definir" },
      ].map((item) => (
        <View key={item.label} style={s.infoRow}>
          <Text style={s.infoLabel}>{item.label}</Text>
          <Text style={s.infoValue}>{item.value}</Text>
        </View>
      ))}

      <Btn
        label="Sair da conta"
        onPress={onSignOut}
        variant="danger"
        style={{ marginTop: 8 }}
      />
    </ScrollView>
  );
}

// ─── Meu Perfil Screen ────────────────────────────────────────────────────────

const MINISTERIAL_INTERESTS = [
  { value: "louvor", label: "🎵 Louvor & Adoração" },
  { value: "ensino", label: "📖 Ensino & Discipulado" },
  { value: "recepcao", label: "🤝 Recepção & Acolhimento" },
  { value: "kids", label: "👶 Ministério Infantil" },
  { value: "midia", label: "🎬 Mídia & Comunicação" },
  { value: "administracao", label: "📋 Administração" },
  { value: "intercessao", label: "🙏 Intercessão & Oração" },
  { value: "missoes", label: "🌍 Missões & Evangelismo" },
  { value: "cuidado", label: "💚 Cuidado Pastoral" },
  { value: "jovens", label: "⚡ Ministério de Jovens" },
];

const SERVING_PROFILES = [
  { value: "leading", label: "🧭 Liderando pessoas" },
  { value: "teaching", label: "📚 Ensinando e discipulando" },
  { value: "creating", label: "🎨 Criando e expressando" },
  { value: "caring", label: "🫶 Cuidando e acolhendo" },
  { value: "organizing", label: "⚙️ Organizando e executando" },
  { value: "interceding", label: "🙏 Orando e intercedendo" },
];

const WEEKDAYS = [
  { value: "seg", label: "Seg" },
  { value: "ter", label: "Ter" },
  { value: "qua", label: "Qua" },
  { value: "qui", label: "Qui" },
  { value: "sex", label: "Sex" },
  { value: "sab", label: "Sáb" },
  { value: "dom", label: "Dom" },
];

function MeuPerfilScreen({
  primary,
  user,
  orgId,
  onBack,
}: {
  primary: string;
  user: FirebaseAuthUser;
  orgId?: string;
  onBack: () => void;
}) {
  const [interests, setInterests] = useState<string[]>([]);
  const [serving, setServing] = useState<string>("");
  const [availability, setAvailability] = useState<string[]>([]);
  const [occupation, setOccupation] = useState("");
  const [education, setEducation] = useState("not_informed");
  const [income, setIncome] = useState("not_informed");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load existing profile from Firestore users doc
  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    async function load() {
      try {
        const sdk = await import("@alvo/firebase");
        const existing = await sdk.fetchTenantUser(firebaseConfig, {
          organizationId: orgId,
          userId: user.uid,
        });
        if (!cancelled && existing) {
          const d = existing as any;
          if (d.ministerialInterests) setInterests(d.ministerialInterests);
          if (d.servingProfile) setServing(d.servingProfile);
          if (d.availability) setAvailability(d.availability);
          if (d.occupation) setOccupation(d.occupation);
          if (d.educationLevel) setEducation(d.educationLevel);
          if (d.householdIncomeRange) setIncome(d.householdIncomeRange);
        }
      } catch {
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [user.uid, orgId]);

  async function handleSave() {
    if (!orgId) {
      Alert.alert("Erro", "Organização não vinculada.");
      return;
    }
    setSaving(true);
    try {
      const sdk = await import("@alvo/firebase");
      // reuse ensureTenantUserAccess with merge to save ministerial profile fields
      await sdk.saveMemberProfile(
        firebaseConfig,
        { organizationId: orgId, userId: user.uid },
        {
          ministerialInterests: interests,
          servingProfile: serving || undefined,
          availability,
          occupation: occupation || undefined,
          educationLevel: education,
          householdIncomeRange: income,
        },
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  function toggleInterest(v: string) {
    setInterests((prev) =>
      prev.includes(v) ? prev.filter((i) => i !== v) : [...prev, v],
    );
  }
  function toggleDay(v: string) {
    setAvailability((prev) =>
      prev.includes(v) ? prev.filter((i) => i !== v) : [...prev, v],
    );
  }

  return (
    <View style={[s.fill, { backgroundColor: "#f8f9fa" }]}>
      <ModalHeader title="Perfil Ministerial" onBack={onBack} />
      {!loaded ? (
        <View style={[s.fill, s.center]}>
          <ActivityIndicator color={primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.tabContent, { paddingBottom: 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Informações pessoais */}
          <Text style={s.sectionTitle}>Informações pessoais</Text>
          <View style={s.card}>
            <Field
              label="Profissão / Ocupação"
              value={occupation}
              onChange={setOccupation}
              placeholder="Ex: Engenheiro, Professor..."
            />
            <Text style={[s.label, { marginTop: 12 }]}>Escolaridade</Text>
            <View style={mpStyles.optionRow}>
              {[
                { v: "not_informed", l: "Não inf." },
                { v: "high_school", l: "Médio" },
                { v: "undergraduate", l: "Superior" },
                { v: "postgraduate", l: "Pós" },
              ].map(({ v, l }) => (
                <Pressable
                  key={v}
                  onPress={() => setEducation(v)}
                  style={[
                    mpStyles.chip,
                    education === v && {
                      backgroundColor: primary,
                      borderColor: primary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      mpStyles.chipText,
                      education === v && { color: "#fff" },
                    ]}
                  >
                    {l}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={[s.label, { marginTop: 12 }]}>
              Faixa de renda familiar
            </Text>
            <View style={mpStyles.optionRow}>
              {[
                { v: "not_informed", l: "Não inf." },
                { v: "up_to_1_minimum_wage", l: "Até 1 SM" },
                { v: "one_to_3_minimum_wages", l: "1–3 SM" },
                { v: "three_to_5_minimum_wages", l: "3–5 SM" },
                { v: "above_10_minimum_wages", l: "+10 SM" },
              ].map(({ v, l }) => (
                <Pressable
                  key={v}
                  onPress={() => setIncome(v)}
                  style={[
                    mpStyles.chip,
                    income === v && {
                      backgroundColor: primary,
                      borderColor: primary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      mpStyles.chipText,
                      income === v && { color: "#fff" },
                    ]}
                  >
                    {l}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Dons ministeriais */}
          <Text style={s.sectionTitle}>Áreas de interesse ministerial</Text>
          <View style={s.card}>
            <Text style={[s.cardMeta, { marginBottom: 12 }]}>
              Selecione as áreas onde você sente chamado a servir:
            </Text>
            <View style={mpStyles.pillGrid}>
              {MINISTERIAL_INTERESTS.map(({ value, label }) => {
                const active = interests.includes(value);
                return (
                  <Pressable
                    key={value}
                    onPress={() => toggleInterest(value)}
                    style={[
                      mpStyles.pill,
                      active && {
                        backgroundColor: primary,
                        borderColor: primary,
                      },
                    ]}
                  >
                    <Text
                      style={[mpStyles.pillText, active && { color: "#fff" }]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Como se vê servindo */}
          <Text style={s.sectionTitle}>Como você se vê servindo?</Text>
          <View style={s.card}>
            {SERVING_PROFILES.map(({ value, label }) => (
              <Pressable
                key={value}
                onPress={() => setServing(value)}
                style={[
                  mpStyles.radioRow,
                  serving === value && {
                    borderColor: primary,
                    backgroundColor: `${primary}12`,
                  },
                ]}
              >
                <View
                  style={[
                    mpStyles.radioCircle,
                    serving === value && { borderColor: primary },
                  ]}
                >
                  {serving === value && (
                    <View
                      style={[mpStyles.radioDot, { backgroundColor: primary }]}
                    />
                  )}
                </View>
                <Text
                  style={[
                    mpStyles.radioLabel,
                    serving === value && { color: primary, fontWeight: "600" },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Disponibilidade */}
          <Text style={s.sectionTitle}>Disponibilidade semanal</Text>
          <View
            style={[s.card, { flexDirection: "row", flexWrap: "wrap", gap: 8 }]}
          >
            {WEEKDAYS.map(({ value, label }) => {
              const active = availability.includes(value);
              return (
                <Pressable
                  key={value}
                  onPress={() => toggleDay(value)}
                  style={[
                    mpStyles.dayPill,
                    active && {
                      backgroundColor: primary,
                      borderColor: primary,
                    },
                  ]}
                >
                  <Text style={[mpStyles.dayText, active && { color: "#fff" }]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {saved && (
            <View style={mpStyles.savedBanner}>
              <Text style={mpStyles.savedText}>
                ✓ Perfil salvo com sucesso!
              </Text>
            </View>
          )}

          <Btn
            label={saving ? "Salvando..." : "Salvar Perfil"}
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            color={primary}
            style={{ marginTop: 8 }}
          />
        </ScrollView>
      )}
    </View>
  );
}

const mpStyles = StyleSheet.create({
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
  },
  chipText: { fontSize: 13, color: "#374151" },
  pillGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
  },
  pillText: { fontSize: 13, color: "#374151" },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    marginBottom: 8,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  radioLabel: { fontSize: 14, color: "#374151", flex: 1 },
  dayPill: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  savedBanner: {
    backgroundColor: "#dcfce7",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    alignItems: "center",
  },
  savedText: { color: "#166534", fontWeight: "600", fontSize: 14 },
});

// ─── Doações Screen ───────────────────────────────────────────────────────────

function DoacoesScreen({
  primary,
  orgName,
  orgId,
  user,
  onBack,
}: {
  primary: string;
  orgName: string;
  orgId?: string;
  user: FirebaseAuthUser;
  onBack: () => void;
}) {
  const [type, setType] = useState<"dizimo" | "oferta" | "missao" | "outro">(
    "dizimo",
  );
  const [amount, setAmount] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [method, setMethod] = useState<"pix" | "cartao">("pix");
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pix, setPix] = useState<{
    payload: string;
    qrDataUrl: string;
    pixKey: string;
    receiverName: string;
  } | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixError, setPixError] = useState<string | null>(null);

  const presets = ["50", "100", "200", "500"];

  async function pickReceipt() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.4,
      allowsEditing: true,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const b64 = result.assets[0].base64 ?? null;
      // Doc do Firestore tem limite de ~1MB; base64 ocupa ~1.37x os bytes.
      // Recorte a imagem se for grande demais.
      if (b64 && b64.length > 1_300_000) {
        Alert.alert(
          "Imagem muito grande",
          "Recorte só o comprovante ou tire uma foto mais fechada e tente de novo.",
        );
        return;
      }
      setReceiptUri(result.assets[0].uri);
      setReceiptBase64(b64);
    }
  }

  async function sharePixKey() {
    if (!pix) return;
    try {
      await Share.share({
        message: `PIX copia e cola:\n${pix.payload}\n\nChave: ${pix.pixKey}\nBeneficiário: ${pix.receiverName}`,
      });
    } catch {}
  }

  const finalAmount = amount === "custom" ? customAmount : amount;
  const finalAmountNumber = Number(finalAmount);

  // Gera o PIX real (BR Code + QR) assim que método=PIX e valor válido —
  // via /api/giving/pix, que lê a chave PIX que a igreja configurou de
  // verdade em Configurações → Doações. Se a igreja não configurou chave
  // ainda, a API devolve erro claro em vez de mostrar algo falso.
  useEffect(() => {
    if (method !== "pix" || !finalAmountNumber || finalAmountNumber <= 0) {
      setPix(null);
      return;
    }
    let cancelled = false;
    async function loadPix() {
      setPixLoading(true);
      setPixError(null);
      try {
        const idToken = await user.getIdToken();
        const res = await fetch(`${WEB_API_URL}/api/giving/pix`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            organizationId: orgId,
            amount: finalAmountNumber,
            description: type,
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          payload?: string;
          qrDataUrl?: string;
          pixKey?: string;
          receiverName?: string;
          error?: string;
        };
        if (!res.ok || !data.ok)
          throw new Error(data.error ?? "Não foi possível gerar o PIX");
        if (!cancelled)
          setPix({
            payload: data.payload!,
            qrDataUrl: data.qrDataUrl!,
            pixKey: data.pixKey!,
            receiverName: data.receiverName!,
          });
      } catch (e) {
        if (!cancelled)
          setPixError(e instanceof Error ? e.message : "Erro ao gerar PIX");
      } finally {
        if (!cancelled) setPixLoading(false);
      }
    }
    void loadPix();
    return () => {
      cancelled = true;
    };
  }, [method, finalAmountNumber, orgId, type]);

  async function confirmContribution() {
    if (!finalAmountNumber || finalAmountNumber <= 0) {
      Alert.alert("Selecione um valor");
      return;
    }
    if (method === "pix" && !pix) {
      Alert.alert("Aguarde o PIX ser gerado antes de confirmar");
      return;
    }
    setSubmitting(true);
    try {
      const { addMemberContribution, saveContributionReceipt } =
        await import("@alvo/firebase");
      // Salva o comprovante primeiro (doc separado); se falhar, registra a
      // contribuição mesmo assim — não travar o registro do valor.
      let receiptId: string | undefined;
      if (receiptBase64) {
        try {
          receiptId = await saveContributionReceipt(
            firebaseConfig,
            { organizationId: orgId },
            {
              organizationId: orgId,
              imageBase64: receiptBase64,
              createdByUserId: user.uid,
            },
          );
        } catch (e: any) {
          if (__DEV__)
            console.warn(
              "salvar comprovante falhou:",
              e?.code || e?.message || e,
            );
        }
      }
      await addMemberContribution(
        firebaseConfig,
        { organizationId: orgId },
        {
          organizationId: orgId,
          userId: user.uid,
          contributorName: user.displayName ?? user.email ?? "Membro",
          amount: finalAmountNumber,
          type,
          date: new Date().toISOString().slice(0, 10),
          description: `Contribuição via app${receiptId ? " (com comprovante)" : ""}`,
          registeredBy: user.uid,
          registeredAt: new Date().toISOString(),
          status: "pending",
          method: "pix",
          receiptId,
        },
      );
      setSubmitted(true);
    } catch (e: any) {
      if (__DEV__)
        console.warn(
          "addMemberContribution falhou:",
          e?.code || e?.message || e,
        );
      Alert.alert(
        "Não foi possível registrar",
        "Sua contribuição via PIX foi feita normalmente, mas não conseguimos salvar o registro aqui. Avise a secretaria.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <View style={[s.fill, { backgroundColor: "#f8f9fa" }]}>
        <ModalHeader title="Doações e Dízimos" onBack={onBack} />
        <View style={[s.fill, s.center, { padding: 32 }]}>
          <Text style={{ fontSize: 56, marginBottom: 16 }}>🙏</Text>
          <Text style={[s.screenTitle, { textAlign: "center" }]}>
            Contribuição registrada!
          </Text>
          <Text style={[s.screenSub, { textAlign: "center" }]}>
            Fica com status pendente até a secretaria confirmar o recebimento.
            Obrigado pela fidelidade!
          </Text>
          <Btn
            label="Concluir"
            onPress={onBack}
            color={primary}
            style={{ marginTop: 32, width: "100%" }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[s.fill, { backgroundColor: "#f8f9fa" }]}>
      <ModalHeader title="Doações e Dízimos" onBack={onBack} />
      <ScrollView
        contentContainerStyle={s.tabContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type */}
        <Text style={s.sectionTitle}>Tipo de contribuição</Text>
        <View style={s.row}>
          {(
            [
              { id: "dizimo", label: "Dízimo" },
              { id: "oferta", label: "Oferta" },
              { id: "missao", label: "Missões" },
              { id: "outro", label: "Outro" },
            ] as const
          ).map((t) => (
            <Pressable
              key={t.id}
              style={[
                s.typeChip,
                type === t.id && {
                  backgroundColor: primary,
                  borderColor: primary,
                },
              ]}
              onPress={() => setType(t.id)}
            >
              <Text
                style={[s.typeChipText, type === t.id && { color: "#fff" }]}
              >
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Amount */}
        <Text style={[s.sectionTitle, { marginTop: 16 }]}>Valor</Text>
        <View style={[s.row, { flexWrap: "wrap", gap: 8 }]}>
          {presets.map((p) => (
            <Pressable
              key={p}
              style={[
                s.amountChip,
                amount === p && {
                  backgroundColor: primary,
                  borderColor: primary,
                },
              ]}
              onPress={() => setAmount(p)}
            >
              <Text style={[s.amountText, amount === p && { color: "#fff" }]}>
                R$ {p}
              </Text>
            </Pressable>
          ))}
          <Pressable
            style={[
              s.amountChip,
              amount === "custom" && {
                backgroundColor: primary,
                borderColor: primary,
              },
            ]}
            onPress={() => setAmount("custom")}
          >
            <Text
              style={[s.amountText, amount === "custom" && { color: "#fff" }]}
            >
              Outro valor
            </Text>
          </Pressable>
        </View>
        {amount === "custom" && (
          <TextInput
            style={[s.input, { marginTop: 10 }]}
            value={customAmount}
            onChangeText={setCustomAmount}
            placeholder="R$ 0,00"
            keyboardType="numeric"
            placeholderTextColor="#9ca3af"
          />
        )}

        {/* Method */}
        <Text style={[s.sectionTitle, { marginTop: 16 }]}>
          Forma de pagamento
        </Text>
        <View style={s.row}>
          {(
            [
              { id: "pix", label: "PIX" },
              { id: "cartao", label: "Cartão de crédito" },
            ] as const
          ).map((m) => (
            <Pressable
              key={m.id}
              style={[
                s.methodBtn,
                method === m.id && {
                  borderColor: primary,
                  backgroundColor: `${primary}12`,
                },
              ]}
              onPress={() => setMethod(m.id)}
            >
              <Text style={{ fontSize: 20, marginBottom: 4 }}>
                {m.id === "pix" ? "⚡" : "💳"}
              </Text>
              <Text
                style={[
                  s.methodLabel,
                  method === m.id && { color: primary, fontWeight: "700" },
                ]}
              >
                {m.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* PIX details */}
        {method === "pix" && (
          <View style={[s.card, { marginTop: 12 }]}>
            <Text style={[s.eyebrow, { marginBottom: 8 }]}>DADOS PIX</Text>

            {!finalAmountNumber || finalAmountNumber <= 0 ? (
              <Text
                style={[
                  s.cardMeta,
                  { textAlign: "center", paddingVertical: 12 },
                ]}
              >
                Escolha um valor para gerar o PIX.
              </Text>
            ) : pixLoading ? (
              <View style={s.qrPlaceholder}>
                <LoadingRow primary={primary} label="Gerando PIX..." />
              </View>
            ) : pixError ? (
              <Text
                style={[
                  s.errorText,
                  { textAlign: "center", paddingVertical: 12 },
                ]}
              >
                {pixError}
              </Text>
            ) : pix ? (
              <>
                <View style={s.qrPlaceholder}>
                  <Image
                    source={{ uri: pix.qrDataUrl }}
                    style={{ width: 200, height: 200, borderRadius: 4 }}
                    resizeMode="contain"
                  />
                  <Text style={s.qrLabel}>QR Code PIX</Text>
                  <Text style={s.qrSub}>
                    Use o app do seu banco para escanear
                  </Text>
                </View>

                <View style={s.pixRow}>
                  <View style={s.fill}>
                    <Text style={s.pixLabel}>Chave PIX</Text>
                    <Text style={s.pixKey} selectable numberOfLines={1}>
                      {pix.pixKey}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[s.copyBtn, { borderColor: primary }]}
                    onPress={sharePixKey}
                  >
                    <Text style={[s.copyBtnText, { color: primary }]}>
                      Copiar código
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={s.pixLabel}>
                  Beneficiário:{" "}
                  <Text style={{ fontWeight: "700" }}>{pix.receiverName}</Text>
                </Text>
              </>
            ) : null}
          </View>
        )}

        {/* Card — future gateway */}
        {method === "cartao" && (
          <View
            style={[
              s.card,
              { marginTop: 12, alignItems: "center", paddingVertical: 24 },
            ]}
          >
            <Text style={{ fontSize: 36, marginBottom: 12 }}>💳</Text>
            <Text style={[s.cardTitle, { textAlign: "center" }]}>
              Pagamento por cartão
            </Text>
            <Text style={[s.cardMeta, { textAlign: "center", marginTop: 6 }]}>
              Em breve disponível via gateway de pagamento integrado.{"\n"}Por
              ora, use o PIX acima ou procure a secretaria.
            </Text>
            <View
              style={[s.badge, { backgroundColor: "#fef3c7", marginTop: 12 }]}
            >
              <Text style={[s.badgeText, { color: "#92400e" }]}>Em breve</Text>
            </View>
          </View>
        )}

        {/* Receipt upload */}
        {method === "pix" && (
          <>
            <Text style={[s.sectionTitle, { marginTop: 16 }]}>Comprovante</Text>
            <View style={s.card}>
              {receiptUri ? (
                <>
                  <Image
                    source={{ uri: receiptUri }}
                    style={s.receiptPreview}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    onPress={() => {
                      setReceiptUri(null);
                      setReceiptBase64(null);
                    }}
                    style={{ marginTop: 8 }}
                  >
                    <Text
                      style={{
                        color: "#dc2626",
                        fontSize: 13,
                        textAlign: "center",
                      }}
                    >
                      Remover comprovante
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Btn
                  label="📎  Anexar comprovante"
                  onPress={pickReceipt}
                  variant="outline"
                />
              )}
            </View>
          </>
        )}

        <Btn
          label={
            finalAmount
              ? `Já paguei — R$ ${finalAmount}`
              : "Confirmar contribuição"
          }
          onPress={confirmContribution}
          loading={submitting}
          disabled={method === "pix" && (pixLoading || !pix)}
          color={primary}
          style={{ marginTop: 20 }}
        />
        {method === "pix" && (
          <Text style={[s.cardMeta, { textAlign: "center", marginTop: 10 }]}>
            Pague o PIX acima primeiro, depois toque em "Já paguei". Fica
            pendente até a secretaria confirmar o recebimento.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Kids Check-in Screen ─────────────────────────────────────────────────────

const DEFAULT_KIDS_ROOMS = [
  "Berçário (0–2 anos)",
  "Maternal (3–4 anos)",
  "Jardim (5–6 anos)",
  "Primário (7–9 anos)",
  "Juniores (10–12 anos)",
];

function newKidsToken() {
  return `KID-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

// Segurança Kids — fluxo real: o responsável faz o check-in do próprio filho
// (gera o crachá digital com QR no celular dele, com foto e consentimento) e o
// voluntário escalado escaneia o QR na retirada para validar e dar baixa.
function KidsCheckinScreen({
  primary,
  user,
  orgId,
  onBack,
}: {
  primary: string;
  user: FirebaseAuthUser;
  orgId?: string;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [canOperate, setCanOperate] = useState(false);
  const [mode, setMode] = useState<"guardian" | "volunteer">("guardian");
  const [active, setActive] = useState<KidsCheckIn[]>([]);
  const [rooms, setRooms] = useState<Array<{ id: string; name: string }>>([]);

  // form de check-in (responsável)
  const [childName, setChildName] = useState("");
  const [room, setRoom] = useState<{ id: string; name: string } | null>(null);
  const [allergies, setAllergies] = useState("");
  const [restrictions, setRestrictions] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  // scanner (voluntário)
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState<KidsCheckIn | null>(null);
  const scanLock = useRef(false);

  const load = async () => {
    setLoading(true);
    try {
      const sdk = await import("@alvo/firebase");
      const ctx = { organizationId: orgId };
      const [settings, tenantUser, checkIns] = await Promise.all([
        sdk
          .fetchKidsSettings(firebaseConfig, ctx)
          .catch(() => null) as Promise<OrganizationKidsSettings | null>,
        sdk
          .fetchTenantUser(firebaseConfig, {
            organizationId: orgId,
            userId: user.uid,
          })
          .catch(() => null),
        sdk
          .fetchActiveKidsCheckIns(firebaseConfig, ctx)
          .catch(() => [] as KidsCheckIn[]),
      ]);
      const roles = ((tenantUser as { roles?: AppRole[] } | null)?.roles ??
        []) as AppRole[];
      const qrRoles = settings?.qrGeneratorRoles ?? [];
      const isAdmin = roles.some(
        (r) => r === "super_admin" || r === "church_admin",
      );
      const op = isAdmin || roles.some((r) => qrRoles.includes(r));
      setCanOperate(op);
      setActive(checkIns);
      let rms: Array<{ id: string; name: string }> = [];
      if (settings?.kidsTeamIds?.length) {
        const teams = (await sdk
          .fetchServiceTeams(firebaseConfig, ctx, 50)
          .catch(() => [])) as ServiceTeam[];
        rms = teams
          .filter((t) => settings.kidsTeamIds.includes(t.id))
          .map((t) => ({ id: t.id, name: t.name }));
      }
      if (!rms.length)
        rms = DEFAULT_KIDS_ROOMS.map((n, i) => ({ id: `room_${i}`, name: n }));
      setRooms(rms);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [orgId, user.uid]);

  const myKids = active.filter(
    (c) => c.parentId === user.uid || c.authorizedPickUpIds.includes(user.uid),
  );

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permita o acesso à câmera para tirar a foto.");
      return;
    }
    const r = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.4,
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!r.canceled && r.assets[0]?.base64)
      setPhoto(`data:image/jpeg;base64,${r.assets[0].base64}`);
  }

  async function doCheckIn() {
    if (!childName.trim() || !room) {
      Alert.alert("Preencha o nome da criança e a sala.");
      return;
    }
    if (photo && !consent) {
      Alert.alert("Marque o consentimento para usar a foto.");
      return;
    }
    setSaving(true);
    try {
      const sdk = await import("@alvo/firebase");
      const token = newKidsToken();
      const nowIso = new Date().toISOString();
      const checkIn: KidsCheckIn = {
        id: token,
        organizationId: orgId,
        childId: `quick_${token}`,
        parentId: user.uid,
        authorizedPickUpIds: [user.uid],
        checkedInAt: nowIso,
        checkedInByUserId: user.uid,
        status: "checked_in",
        serviceTeamId: room.id.startsWith("room_") ? undefined : room.id,
        roomCode: room.name,
        securityToken: token,
        childName: childName.trim(),
        guardianName: user.displayName ?? user.email ?? undefined,
        allergies: allergies.trim() || undefined,
        securityRestrictions: restrictions.trim() || undefined,
        photoUrl: photo ?? undefined,
        photoConsentAt: photo && consent ? nowIso : undefined,
      };
      await sdk.saveKidsCheckIn(
        firebaseConfig,
        { organizationId: orgId },
        checkIn,
      );
      setActive((p) => [checkIn, ...p]);
      setChildName("");
      setRoom(null);
      setAllergies("");
      setRestrictions("");
      setPhoto(null);
      setConsent(false);
      Alert.alert(
        "Check-in feito!",
        "O crachá com o QR está disponível abaixo. Mostre-o na retirada.",
      );
    } catch (e) {
      Alert.alert(
        "Erro ao registrar",
        e instanceof Error ? e.message : "Tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onBarcode({ data }: { data: string }) {
    if (scanLock.current) return;
    scanLock.current = true;
    try {
      const sdk = await import("@alvo/firebase");
      const ci = await sdk.fetchKidsCheckInByToken(
        firebaseConfig,
        { organizationId: orgId },
        data.trim(),
      );
      setScanning(false);
      if (!ci) {
        Alert.alert(
          "QR inválido",
          "Nenhum check-in encontrado para este código.",
        );
      } else if (ci.status !== "checked_in") {
        Alert.alert("Já retirada", "Esta criança não está com check-in ativo.");
      } else setScanned(ci);
    } catch {
      Alert.alert("Erro", "Não foi possível ler o check-in.");
    } finally {
      setTimeout(() => {
        scanLock.current = false;
      }, 1500);
    }
  }

  async function confirmCheckout() {
    if (!scanned) return;
    try {
      const sdk = await import("@alvo/firebase");
      await sdk.checkoutKidsCheckIn(
        firebaseConfig,
        { organizationId: orgId },
        scanned.id,
        user.uid,
      );
      setActive((p) => p.filter((c) => c.id !== scanned.id));
      setScanned(null);
      Alert.alert("Retirada confirmada", "Criança liberada com sucesso.");
    } catch (e) {
      Alert.alert("Erro", e instanceof Error ? e.message : "Tente novamente.");
    }
  }

  if (loading) {
    return (
      <View style={[s.fill, { backgroundColor: "#f8f9fa" }]}>
        <ModalHeader title="Segurança Kids" onBack={onBack} />
        <View style={{ padding: 40, alignItems: "center" }}>
          <ActivityIndicator color={primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[s.fill, { backgroundColor: "#f8f9fa" }]}>
      <ModalHeader title="Segurança Kids" onBack={onBack} />

      {canOperate && (
        <View style={s.segControl}>
          <Pressable
            style={[s.seg, mode === "guardian" && { backgroundColor: primary }]}
            onPress={() => setMode("guardian")}
          >
            <Text style={[s.segText, mode === "guardian" && { color: "#fff" }]}>
              Responsável
            </Text>
          </Pressable>
          <Pressable
            style={[
              s.seg,
              mode === "volunteer" && { backgroundColor: primary },
            ]}
            onPress={() => setMode("volunteer")}
          >
            <Text
              style={[s.segText, mode === "volunteer" && { color: "#fff" }]}
            >
              Voluntário (sala)
            </Text>
          </Pressable>
        </View>
      )}

      {/* ── Responsável: check-in do filho + crachás com QR ── */}
      {mode === "guardian" && (
        <ScrollView
          contentContainerStyle={s.tabContent}
          keyboardShouldPersistTaps="handled"
        >
          {myKids.length > 0 && (
            <>
              <Text style={[s.label, { marginBottom: 8 }]}>Crachás ativos</Text>
              {myKids.map((c) => (
                <View
                  key={c.id}
                  style={[s.card, { alignItems: "center", marginBottom: 12 }]}
                >
                  {c.photoUrl ? (
                    <Image
                      source={{ uri: c.photoUrl }}
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        marginBottom: 8,
                      }}
                    />
                  ) : null}
                  <Text style={s.cardTitle}>{c.childName}</Text>
                  <Text style={s.cardMeta}>{c.roomCode}</Text>
                  {c.allergies ? (
                    <Text style={[s.cardMeta, { color: "#dc2626" }]}>
                      Alergias: {c.allergies}
                    </Text>
                  ) : null}
                  <Image
                    source={{
                      uri: `${WEB_API_URL}/api/kids/qr?data=${encodeURIComponent(c.securityToken)}`,
                    }}
                    style={{ width: 180, height: 180, marginTop: 10 }}
                  />
                  <View
                    style={[s.codeBox, { borderColor: primary, marginTop: 8 }]}
                  >
                    <Text style={s.codeLabel}>Código</Text>
                    <Text style={[s.codeValue, { color: primary }]}>
                      {c.securityToken}
                    </Text>
                  </View>
                  <Text
                    style={[s.cardMeta, { textAlign: "center", marginTop: 6 }]}
                  >
                    Mostre este QR ao voluntário na retirada.
                  </Text>
                </View>
              ))}
            </>
          )}

          <Text style={[s.label, { marginBottom: 8, marginTop: 4 }]}>
            Fazer check-in
          </Text>
          <Field
            label="Nome da criança"
            value={childName}
            onChange={setChildName}
            autoCapitalize="words"
            placeholder="Nome completo"
          />
          <Text style={[s.label, { marginBottom: 8, marginTop: 4 }]}>
            Sala / Turma
          </Text>
          {rooms.map((r) => (
            <Pressable
              key={r.id}
              style={[
                s.roomRow,
                room?.id === r.id && {
                  borderColor: primary,
                  backgroundColor: `${primary}10`,
                },
              ]}
              onPress={() => setRoom(r)}
            >
              <View
                style={[
                  s.radioOuter,
                  room?.id === r.id && { borderColor: primary },
                ]}
              >
                {room?.id === r.id && (
                  <View style={[s.radioInner, { backgroundColor: primary }]} />
                )}
              </View>
              <Text
                style={[
                  s.roomLabel,
                  room?.id === r.id && { color: primary, fontWeight: "600" },
                ]}
              >
                {r.name}
              </Text>
            </Pressable>
          ))}
          <Field
            label="Alergias (opcional)"
            value={allergies}
            onChange={setAllergies}
            placeholder="Ex.: amendoim, lactose"
          />
          <Field
            label="Restrições de segurança (opcional)"
            value={restrictions}
            onChange={setRestrictions}
            placeholder="Ex.: retirada só pela mãe"
          />

          <View style={[s.card, { marginTop: 8 }]}>
            {photo ? (
              <Image
                source={{ uri: photo }}
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 12,
                  alignSelf: "center",
                  marginBottom: 10,
                }}
              />
            ) : null}
            <Btn
              label={photo ? "Refazer foto" : "Tirar foto da criança"}
              onPress={takePhoto}
              variant="outline"
              color={primary}
            />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginTop: 12,
              }}
            >
              <Switch
                value={consent}
                onValueChange={setConsent}
                trackColor={{ true: primary }}
              />
              <Text style={[s.cardMeta, { flex: 1 }]}>
                Autorizo a captura e o uso da foto do meu filho(a) para fins de
                segurança (LGPD).
              </Text>
            </View>
          </View>

          <Btn
            label="Registrar entrada"
            onPress={doCheckIn}
            loading={saving}
            color={primary}
            style={{ marginTop: 16 }}
          />
        </ScrollView>
      )}

      {/* ── Voluntário: escanear QR para retirada ── */}
      {mode === "volunteer" && (
        <ScrollView contentContainerStyle={s.tabContent}>
          {scanned ? (
            <View style={[s.card, { alignItems: "center" }]}>
              {scanned.photoUrl ? (
                <Image
                  source={{ uri: scanned.photoUrl }}
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    marginBottom: 10,
                  }}
                />
              ) : null}
              <Text style={s.cardTitle}>{scanned.childName}</Text>
              <Text style={s.cardMeta}>{scanned.roomCode}</Text>
              <Text style={s.cardMeta}>
                Responsável: {scanned.guardianName ?? "—"}
              </Text>
              {scanned.allergies ? (
                <Text style={[s.cardMeta, { color: "#dc2626", marginTop: 4 }]}>
                  ⚠️ Alergias: {scanned.allergies}
                </Text>
              ) : null}
              {scanned.securityRestrictions ? (
                <Text style={[s.cardMeta, { color: "#dc2626" }]}>
                  ⚠️ {scanned.securityRestrictions}
                </Text>
              ) : null}
              <Text
                style={[s.cardMeta, { textAlign: "center", marginTop: 10 }]}
              >
                Confira a foto e o responsável antes de liberar.
              </Text>
              <Btn
                label="Confirmar retirada"
                onPress={confirmCheckout}
                color="#16a34a"
                style={{ marginTop: 14, alignSelf: "stretch" }}
              />
              <Btn
                label="Cancelar"
                onPress={() => setScanned(null)}
                variant="outline"
                color={primary}
                style={{ marginTop: 8, alignSelf: "stretch" }}
              />
            </View>
          ) : scanning ? (
            <View style={[s.card, { padding: 0, overflow: "hidden" }]}>
              <CameraView
                style={{ height: 320, width: "100%" }}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={onBarcode}
              />
              <View style={{ padding: 12 }}>
                <Text
                  style={[
                    s.cardMeta,
                    { textAlign: "center", marginBottom: 10 },
                  ]}
                >
                  Aponte para o QR do crachá do responsável.
                </Text>
                <Btn
                  label="Cancelar"
                  onPress={() => setScanning(false)}
                  variant="outline"
                  color={primary}
                />
              </View>
            </View>
          ) : (
            <>
              <View
                style={[s.card, { alignItems: "center", marginBottom: 12 }]}
              >
                <Ionicons name="qr-code-outline" size={40} color={primary} />
                <Text
                  style={[s.cardTitle, { marginTop: 8, textAlign: "center" }]}
                >
                  Retirada por QR
                </Text>
                <Text
                  style={[s.cardMeta, { textAlign: "center", marginTop: 6 }]}
                >
                  Escaneie o crachá do responsável para validar e liberar a
                  criança.
                </Text>
                <Btn
                  label="Escanear QR"
                  onPress={async () => {
                    if (!permission?.granted) {
                      const r = await requestPermission();
                      if (!r.granted) {
                        Alert.alert("Permita a câmera para escanear.");
                        return;
                      }
                    }
                    setScanning(true);
                  }}
                  color={primary}
                  style={{ marginTop: 14, alignSelf: "stretch" }}
                />
              </View>
              <Text style={[s.label, { marginBottom: 8 }]}>
                Crianças na sala ({active.length})
              </Text>
              {active.length === 0 && (
                <EmptyState
                  icon="👶"
                  title="Nenhuma criança presente"
                  sub="Os check-ins ativos aparecem aqui."
                />
              )}
              {active.map((c) => (
                <View key={c.id} style={[s.card, { marginBottom: 8 }]}>
                  <View style={s.row}>
                    {c.photoUrl ? (
                      <Image
                        source={{ uri: c.photoUrl }}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          marginRight: 10,
                        }}
                      />
                    ) : null}
                    <View style={s.fill}>
                      <Text style={s.cardTitle}>{c.childName}</Text>
                      <Text style={s.cardMeta}>
                        {c.roomCode}
                        {c.allergies ? ` · ⚠️ ${c.allergies}` : ""}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Escala Screen ────────────────────────────────────────────────────────────

function EscalaScreen({
  primary,
  user,
  orgId,
  onBack,
}: {
  primary: string;
  user: FirebaseAuthUser;
  orgId?: string;
  onBack: () => void;
}) {
  const [slots, setSlots] = useState<EscalaSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId || !user) return;
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const assignments = await fetchServiceAssignments(
          firebaseConfig,
          { organizationId: orgId },
          120,
        );
        const myAssignments = assignments
          .filter((a) => a.personId === user.uid)
          .sort(
            (a, b) =>
              new Date(b.serviceDate).getTime() -
              new Date(a.serviceDate).getTime(),
          )
          .slice(0, 12);

        const converted: EscalaSlot[] = myAssignments.map((a) => ({
          id: a.id,
          date: new Date(a.serviceDate).toLocaleDateString("pt-BR", {
            weekday: "short",
            day: "2-digit",
            month: "short",
          }),
          time: new Date(a.serviceDate).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          service: a.role,
          role: a.role,
          status:
            a.status === "confirmed"
              ? "confirmado"
              : a.status === "declined"
                ? "recusado"
                : "pendente",
        }));

        if (!cancelled) setSlots(converted);
      } catch {
        if (!cancelled) setSlots([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [orgId, user?.uid]);

  async function respond(id: string, status: EscalaStatus, note?: string) {
    if (!orgId || !user) return;
    const assignment = slots.find((s) => s.id === id);
    if (!assignment) return;

    const firestoreStatus: ServiceAssignmentStatus =
      status === "confirmado" ? "confirmed" : "declined";
    const now = new Date().toISOString();

    try {
      await saveServiceAssignment(
        firebaseConfig,
        { organizationId: orgId },
        {
          id,
          organizationId: orgId,
          serviceTeamId: "",
          ministryCode: "",
          personId: user.uid,
          role: assignment.role,
          serviceDate: assignment.date,
          status: firestoreStatus,
          responseNote: note,
          confirmedAt: status === "confirmado" ? now : undefined,
          declinedAt: status === "recusado" ? now : undefined,
          createdAt: now,
          updatedAt: now,
        },
      );

      setSlots((p) => p.map((s) => (s.id === id ? { ...s, status } : s)));
    } catch (e) {
      if (__DEV__) console.warn("saveServiceAssignment falhou:", e);
      Alert.alert("Erro", "Não foi possível atualizar sua escala.");
    }
  }

  const statusColor: Record<EscalaStatus, string> = {
    pendente: "#f59e0b",
    confirmado: "#16a34a",
    recusado: "#dc2626",
  };
  const statusLabel: Record<EscalaStatus, string> = {
    pendente: "Aguardando",
    confirmado: "Confirmado ✓",
    recusado: "Recusado ✗",
  };

  return (
    <View style={[s.fill, { backgroundColor: "#f8f9fa" }]}>
      <ModalHeader title="Minha Escala" onBack={onBack} />
      <ScrollView contentContainerStyle={s.tabContent}>
        <View style={[s.infoBox, { marginBottom: 16 }]}>
          <Text style={s.infoText}>
            Você receberá uma notificação quando uma nova escala for publicada.
            Confirme ou solicite substituição com antecedência.
          </Text>
        </View>

        {loading ? (
          <View style={{ padding: 16 }}>
            <LoadingRow primary={primary} label="Carregando escalas..." />
          </View>
        ) : slots.length === 0 ? (
          <View style={[s.fill, s.center, { padding: 32 }]}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>📋</Text>
            <Text style={[s.screenTitle, { textAlign: "center" }]}>
              Nenhuma escala atribuída
            </Text>
            <Text style={[s.screenSub, { textAlign: "center" }]}>
              Quando a liderança publicar escalas, elas aparecem aqui.
            </Text>
          </View>
        ) : (
          slots.map((slot) => (
            <View key={slot.id} style={s.card}>
              <View style={s.row}>
                <View style={s.fill}>
                  <Text style={s.cardTitle}>{slot.service}</Text>
                  <Text style={s.cardMeta}>
                    {slot.date} · {slot.time}
                  </Text>
                  <View
                    style={[
                      s.badge,
                      {
                        backgroundColor: `${primary}15`,
                        alignSelf: "flex-start",
                        marginTop: 6,
                      },
                    ]}
                  >
                    <Text style={[s.badgeText, { color: primary }]}>
                      Função: {slot.role}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    s.badge,
                    {
                      backgroundColor: `${statusColor[slot.status]}20`,
                      alignSelf: "flex-start",
                    },
                  ]}
                >
                  <Text
                    style={[s.badgeText, { color: statusColor[slot.status] }]}
                  >
                    {statusLabel[slot.status]}
                  </Text>
                </View>
              </View>

              {slot.status === "pendente" && (
                <View style={[s.row, { marginTop: 14, gap: 10 }]}>
                  <TouchableOpacity
                    style={[
                      s.escalaBtn,
                      {
                        backgroundColor: "#dcfce7",
                        borderColor: "#16a34a",
                        flex: 1,
                      },
                    ]}
                    onPress={() => respond(slot.id, "confirmado")}
                  >
                    <Text
                      style={{
                        color: "#16a34a",
                        fontWeight: "700",
                        textAlign: "center",
                      }}
                    >
                      ✓ Confirmar
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      s.escalaBtn,
                      {
                        backgroundColor: "#fee2e2",
                        borderColor: "#dc2626",
                        flex: 1,
                      },
                    ]}
                    onPress={() => {
                      Alert.prompt(
                        "Recusar escala",
                        "Motivo (opcional):",
                        async (note) => {
                          await respond(slot.id, "recusado", note);
                        },
                        "plain-text",
                        "",
                      );
                    }}
                  >
                    <Text
                      style={{
                        color: "#dc2626",
                        fontWeight: "700",
                        textAlign: "center",
                      }}
                    >
                      ✗ Recusar
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              {slot.status === "recusado" && (
                <TextInput
                  style={[s.input, { marginTop: 10 }]}
                  value={
                    slots.find((s) => s.id === slot.id)?.role === slot.role
                      ? ""
                      : ""
                  }
                  placeholder="Motivo da recusa (opcional)"
                  placeholderTextColor="#9ca3af"
                  editable={false}
                />
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ─── Música Screen ────────────────────────────────────────────────────────────

function MusicaScreen({
  primary,
  onBack,
  onOpenSong,
}: {
  primary: string;
  onBack: () => void;
  onOpenSong: (s: Song) => void;
}) {
  const [view, setView] = useState<"repertorio" | "programacao">("repertorio");

  return (
    <View style={[s.fill, { backgroundColor: "#f8f9fa" }]}>
      <ModalHeader title="Ministério Musical" onBack={onBack} />
      <View style={s.segControl}>
        <Pressable
          style={[s.seg, view === "repertorio" && { backgroundColor: primary }]}
          onPress={() => setView("repertorio")}
        >
          <Text style={[s.segText, view === "repertorio" && { color: "#fff" }]}>
            Repertório
          </Text>
        </Pressable>
        <Pressable
          style={[
            s.seg,
            view === "programacao" && { backgroundColor: primary },
          ]}
          onPress={() => setView("programacao")}
        >
          <Text
            style={[s.segText, view === "programacao" && { color: "#fff" }]}
          >
            Programação
          </Text>
        </Pressable>
      </View>

      {view === "repertorio" && (
        <ScrollView contentContainerStyle={s.tabContent}>
          <View style={[s.infoBox, { marginBottom: 16 }]}>
            <Text style={s.infoText}>
              🎵 Repertório desta semana —{" "}
              {new Date().toLocaleDateString("pt-BR", {
                day: "numeric",
                month: "long",
              })}
            </Text>
          </View>
          {MOCK_SONGS.map((song) => (
            <TouchableOpacity
              key={song.id}
              style={s.songRow}
              onPress={() => onOpenSong(song)}
            >
              <View style={[s.songKey, { backgroundColor: primary }]}>
                <Text style={s.songKeyText}>{song.key}</Text>
              </View>
              <View style={s.fill}>
                <Text style={s.cardTitle}>{song.title}</Text>
                <Text style={s.cardMeta}>
                  {song.artist} · {song.bpm} BPM
                </Text>
              </View>
              <Text style={s.menuChev}>›</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {view === "programacao" && (
        <ScrollView contentContainerStyle={s.tabContent}>
          <View style={[s.infoBox, { marginBottom: 16 }]}>
            <Text style={s.infoText}>
              📋 Ordem do culto — Domingo{" "}
              {new Date().toLocaleDateString("pt-BR", {
                day: "numeric",
                month: "long",
              })}
            </Text>
          </View>
          {MOCK_PROGRAMMING.map((item) => (
            <View key={item.order} style={s.progRow}>
              <View style={[s.progNum, { backgroundColor: primary }]}>
                <Text style={s.progNumText}>{item.order}</Text>
              </View>
              <View style={s.fill}>
                <Text style={[s.eyebrow, { marginBottom: 2 }]}>
                  {item.type.toUpperCase()}
                </Text>
                <Text style={s.cardTitle}>{item.description}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Song Detail Screen ───────────────────────────────────────────────────────

function SongDetailScreen({
  song,
  primary,
  onBack,
}: {
  song: Song;
  primary: string;
  onBack: () => void;
}) {
  const [view, setView] = useState<"cifra" | "letra">("cifra");
  return (
    <View style={[s.fill, { backgroundColor: "#f8f9fa" }]}>
      <ModalHeader title={song.title} onBack={onBack} />
      <View style={[s.card, { margin: 16, marginBottom: 0 }]}>
        <View style={s.row}>
          <View
            style={[
              s.songKey,
              {
                backgroundColor: primary,
                width: 44,
                height: 44,
                borderRadius: 10,
              },
            ]}
          >
            <Text style={[s.songKeyText, { fontSize: 18 }]}>{song.key}</Text>
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text style={s.cardTitle}>{song.title}</Text>
            <Text style={s.cardMeta}>
              {song.artist} · {song.bpm} BPM
            </Text>
          </View>
        </View>
      </View>
      <View style={[s.segControl, { margin: 16, marginTop: 12 }]}>
        <Pressable
          style={[s.seg, view === "cifra" && { backgroundColor: primary }]}
          onPress={() => setView("cifra")}
        >
          <Text style={[s.segText, view === "cifra" && { color: "#fff" }]}>
            Cifra
          </Text>
        </Pressable>
        <Pressable
          style={[s.seg, view === "letra" && { backgroundColor: primary }]}
          onPress={() => setView("letra")}
        >
          <Text style={[s.segText, view === "letra" && { color: "#fff" }]}>
            Letra
          </Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {view === "cifra" && (
          <View style={[s.card, { backgroundColor: BRAND_DARK }]}>
            <Text style={s.chordsText}>{song.chords}</Text>
          </View>
        )}
        {view === "letra" && (
          <View style={s.card}>
            <Text style={s.lyricsText}>{song.lyrics}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Inscrição Screen ─────────────────────────────────────────────────────────

function InscricaoScreen({
  primary,
  event,
  user,
  orgId,
  onBack,
}: {
  primary: string;
  event: Event;
  user: FirebaseAuthUser;
  orgId?: string;
  onBack: () => void;
}) {
  const [method, setMethod] = useState<"pix" | "cartao" | "free">(
    event.isPaid ? "pix" : "free",
  );
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reg, setReg] = useState<{ code: string; token: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [pix, setPix] = useState<{
    payload: string;
    qrDataUrl: string;
    pixKey: string;
    receiverName: string;
  } | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixError, setPixError] = useState<string | null>(null);

  const isFree = !event.isPaid;
  const price = event.priceAmount ?? 0;

  async function pickReceipt() {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.6,
      base64: true,
    });
    if (r.canceled || !r.assets[0]) return;
    const b64 = r.assets[0].base64 ?? null;
    // Doc do Firestore tem limite de ~1MB; base64 ocupa ~1.37x os bytes.
    if (b64 && b64.length > 900_000) {
      Alert.alert(
        "Imagem muito grande",
        "Tire uma foto mais fechada só do comprovante e tente de novo.",
      );
      return;
    }
    setReceiptUri(r.assets[0].uri);
    setReceiptBase64(b64);
  }

  // Gera o PIX REAL da igreja (mesma API da doação) para o valor do evento.
  useEffect(() => {
    if (isFree || method !== "pix" || price <= 0) {
      setPix(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setPixLoading(true);
      setPixError(null);
      try {
        const idToken = await user.getIdToken();
        const res = await fetch(`${WEB_API_URL}/api/giving/pix`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            organizationId: orgId,
            amount: price,
            description: `Inscrição: ${event.name}`,
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          payload?: string;
          qrDataUrl?: string;
          pixKey?: string;
          receiverName?: string;
          error?: string;
        };
        if (!res.ok || !data.ok)
          throw new Error(data.error ?? "Não foi possível gerar o PIX");
        if (!cancelled)
          setPix({
            payload: data.payload!,
            qrDataUrl: data.qrDataUrl!,
            pixKey: data.pixKey!,
            receiverName: data.receiverName!,
          });
      } catch (e) {
        if (!cancelled)
          setPixError(e instanceof Error ? e.message : "Erro ao gerar o PIX");
      } finally {
        if (!cancelled) setPixLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isFree, method, price, orgId, event.id, event.name, user]);

  // Cria a inscrição REAL no Firestore e gera o ingresso (código + payload do QR).
  async function confirmInscricao() {
    setSaving(true);
    setError(null);
    const regId = `reg_${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
    const code = "ESD-" + regId.slice(-5).toUpperCase();
    const token = `${event.id}|${regId}`; // o scanner de check-in lê isto
    const registration: EventRegistration = {
      id: regId,
      organizationId: orgId,
      eventId: event.id,
      responsiblePersonId: user.uid,
      registrationCode: code,
      status: "confirmed",
      paymentStatus: event.isPaid ? "pending" : "not_required",
      registeredAt: new Date().toISOString(),
      personName: user.displayName ?? undefined,
      personEmail: user.email ?? undefined,
      ...(receiptBase64 ? { receiptImage: receiptBase64 } : {}),
    };
    try {
      await saveEventRegistration(
        firebaseConfig,
        { organizationId: orgId },
        registration,
      );
      setReg({ code, token });
      setConfirmed(true);
    } catch (e) {
      if (__DEV__) console.warn("saveEventRegistration falhou:", e);
      setError("Não foi possível confirmar a inscrição. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  if (confirmed && reg) {
    return (
      <View style={[s.fill, { backgroundColor: "#f8f9fa" }]}>
        <ModalHeader title="Inscrição" onBack={onBack} />
        <ScrollView contentContainerStyle={[s.center, { padding: 28 }]}>
          <Text style={{ fontSize: 52, marginBottom: 12 }}>🎫</Text>
          <Text style={[s.screenTitle, { textAlign: "center" }]}>
            Inscrição confirmada!
          </Text>
          <Text style={[s.screenSub, { textAlign: "center" }]}>
            {event.name}
          </Text>
          <View
            style={[
              s.card,
              { width: "100%", marginTop: 20, alignItems: "center" },
            ]}
          >
            <Text style={s.eyebrow}>SEU INGRESSO DIGITAL</Text>
            <Image
              source={{
                uri: `${WEB_API_URL}/api/qr?data=${encodeURIComponent(reg.token)}`,
              }}
              style={{
                width: 200,
                height: 200,
                marginTop: 12,
                borderRadius: 6,
              }}
              resizeMode="contain"
            />
            <Text
              style={[
                s.codeValue,
                {
                  color: primary,
                  fontSize: 22,
                  letterSpacing: 2,
                  marginTop: 10,
                },
              ]}
            >
              {reg.code}
            </Text>
            <Text style={[s.cardMeta, { marginTop: 6, textAlign: "center" }]}>
              {formatDate(event.startsAt)} · {formatHour(event.startsAt)}
            </Text>
            <Text
              style={[
                s.cardMeta,
                { marginTop: 10, textAlign: "center", color: "#64748b" },
              ]}
            >
              Apresente este QR na entrada para o check-in.
            </Text>
          </View>
          <Btn
            label="Concluir"
            onPress={onBack}
            color={primary}
            style={{ marginTop: 24, width: "100%" }}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[s.fill, { backgroundColor: "#f8f9fa" }]}>
      <ModalHeader title="Inscrição" onBack={onBack} />
      <ScrollView
        contentContainerStyle={s.tabContent}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            s.card,
            { borderLeftColor: primary, borderLeftWidth: 3, marginBottom: 16 },
          ]}
        >
          <Text style={s.cardTitle}>{event.name}</Text>
          <Text style={s.cardMeta}>
            {formatDate(event.startsAt)} · {formatHour(event.startsAt)}
          </Text>
        </View>

        <Text style={s.sectionTitle}>Seus dados</Text>
        <View style={s.card}>
          <Text style={s.cardMeta}>
            Nome:{" "}
            <Text style={{ fontWeight: "700" }}>
              {user.displayName ?? "Membro"}
            </Text>
          </Text>
          <Text style={[s.cardMeta, { marginTop: 4 }]}>
            Email: <Text style={{ fontWeight: "700" }}>{user.email}</Text>
          </Text>
        </View>

        {!isFree && (
          <>
            <Text style={s.sectionTitle}>Pagamento</Text>
            <View style={s.row}>
              {(
                [
                  { id: "pix", label: "PIX", icon: "⚡" },
                  { id: "cartao", label: "Cartão", icon: "💳" },
                ] as const
              ).map((m) => (
                <Pressable
                  key={m.id}
                  style={[
                    s.methodBtn,
                    { flex: 1 },
                    method === m.id && {
                      borderColor: primary,
                      backgroundColor: `${primary}12`,
                    },
                  ]}
                  onPress={() => setMethod(m.id)}
                >
                  <Text style={{ fontSize: 20 }}>{m.icon}</Text>
                  <Text
                    style={[
                      s.methodLabel,
                      method === m.id && { color: primary, fontWeight: "700" },
                    ]}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {method === "pix" && (
              <View style={[s.card, { marginTop: 12 }]}>
                <Text
                  style={[s.cardMeta, { fontWeight: "700", marginBottom: 8 }]}
                >
                  Valor: R$ {price.toFixed(2).replace(".", ",")}
                </Text>
                {pixLoading ? (
                  <Text style={s.cardMeta}>Gerando PIX...</Text>
                ) : pixError ? (
                  <Text style={{ color: "#dc2626" }}>{pixError}</Text>
                ) : pix ? (
                  <>
                    <Image
                      source={{ uri: pix.qrDataUrl }}
                      style={{
                        width: 180,
                        height: 180,
                        alignSelf: "center",
                        borderRadius: 4,
                      }}
                      resizeMode="contain"
                    />
                    <Text style={[s.pixLabel, { marginTop: 8 }]}>
                      PIX copia e cola
                    </Text>
                    <Text style={s.pixKey} selectable numberOfLines={3}>
                      {pix.payload}
                    </Text>
                    <Btn
                      label="Copiar código PIX"
                      onPress={() => {
                        void Share.share({ message: pix.payload });
                      }}
                      variant="outline"
                      style={{ marginTop: 8 }}
                    />
                    <Text style={[s.cardMeta, { marginTop: 8 }]}>
                      Beneficiário: {pix.receiverName}
                    </Text>
                    <Btn
                      label="📎  Anexar comprovante"
                      onPress={pickReceipt}
                      variant="outline"
                      style={{ marginTop: 12 }}
                    />
                    {receiptUri && (
                      <Image
                        source={{ uri: receiptUri }}
                        style={[s.receiptPreview, { marginTop: 10 }]}
                        resizeMode="cover"
                      />
                    )}
                    <Text
                      style={[s.cardMeta, { marginTop: 10, color: "#64748b" }]}
                    >
                      Após pagar, confirme abaixo. A inscrição fica pendente até
                      a liderança conferir o pagamento.
                    </Text>
                  </>
                ) : null}
              </View>
            )}
            {method === "cartao" && (
              <View style={[s.card, { marginTop: 12, alignItems: "center" }]}>
                <Text style={[s.cardMeta, { textAlign: "center" }]}>
                  Integração com gateway em breve. Use PIX por enquanto.
                </Text>
              </View>
            )}
          </>
        )}

        {error && (
          <Text
            style={{ color: "#dc2626", marginTop: 12, textAlign: "center" }}
          >
            {error}
          </Text>
        )}
        <Btn
          label={
            saving
              ? "Confirmando..."
              : isFree
                ? "Confirmar inscrição gratuita"
                : "Confirmar inscrição"
          }
          onPress={() => {
            if (!saving) void confirmInscricao();
          }}
          color={primary}
          style={{ marginTop: 20, opacity: saving ? 0.6 : 1 }}
        />
      </ScrollView>
    </View>
  );
}

// ─── Área do Líder de Célula ──────────────────────────────────────────────────

type LiderTool = "roteiro" | "dinamica" | "relatorio" | "mensagem";

function LiderCelulaScreen({
  primary,
  user,
  orgId,
  onBack,
}: {
  primary: string;
  user: FirebaseAuthUser;
  orgId?: string;
  onBack: () => void;
}) {
  const [activeTool, setActiveTool] = useState<LiderTool>("roteiro");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Tema semanal do pastor
  const [pastoralTheme, setPastoralTheme] = useState<{
    title: string;
    bibleVerse?: string;
    description?: string;
  } | null>(null);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      try {
        const idToken = await user.getIdToken();
        const r = await fetch(
          `${WEB_API_URL}/api/weekly-theme?organizationId=${encodeURIComponent(orgId)}`,
          {
            headers: { Authorization: `Bearer ${idToken}` },
          },
        );
        const data = await r.json();
        if (!cancelled && data.theme) setPastoralTheme(data.theme);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [user, orgId]);

  // Roteiro
  const [theme, setTheme] = useState("");
  const [verse, setVerse] = useState("");
  const [groupProfile, setGroupProfile] = useState("");

  // Dinâmica
  const [dynTheme, setDynTheme] = useState("");
  const [dynType, setDynType] = useState("quebra-gelo");

  // Relatório
  const [repGroupName, setRepGroupName] = useState("");
  const [repTheme, setRepTheme] = useState("");
  const [repPresent, setRepPresent] = useState("");
  const [repNotes, setRepNotes] = useState("");
  const [repPrayer, setRepPrayer] = useState("");

  // Mensagem de ausência
  const [absMember, setAbsMember] = useState("");
  const [absWeeks, setAbsWeeks] = useState("2");

  async function run() {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const idToken = await user.getIdToken();
      let content = "";
      if (activeTool === "roteiro") {
        if (!theme.trim()) {
          setError("Informe o tema do encontro.");
          setLoading(false);
          return;
        }
        content = await callAi(
          "cell_script",
          { theme, bibleVerse: verse, groupProfile },
          idToken,
          orgId,
        );
      } else if (activeTool === "dinamica") {
        if (!dynTheme.trim()) {
          setError("Informe o tema.");
          setLoading(false);
          return;
        }
        content = await callAi(
          "cell_dynamic",
          { theme: dynTheme, dynamicType: dynType, groupProfile },
          idToken,
          orgId,
        );
      } else if (activeTool === "relatorio") {
        if (!repGroupName.trim() || !repTheme.trim()) {
          setError("Preencha grupo e tema.");
          setLoading(false);
          return;
        }
        content = await callAi(
          "cell_meeting_summary",
          {
            groupName: repGroupName,
            date: new Date().toLocaleDateString("pt-BR"),
            theme: repTheme,
            presentCount: parseInt(repPresent) || 0,
            leaderNotes: repNotes,
            prayerRequests: repPrayer
              ? repPrayer.split(",").map((s) => s.trim())
              : [],
          },
          idToken,
          orgId,
        );
      } else if (activeTool === "mensagem") {
        if (!absMember.trim()) {
          setError("Informe o nome do membro.");
          setLoading(false);
          return;
        }
        content = await callAi(
          "absence_message",
          {
            memberName: absMember,
            groupName: "minha célula",
            weeksAbsent: parseInt(absWeeks) || 2,
          },
          idToken,
          orgId,
        );
      }
      setResult(content);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar conteúdo.");
    } finally {
      setLoading(false);
    }
  }

  const tools: { id: LiderTool; icon: string; label: string }[] = [
    { id: "roteiro", icon: "📋", label: "Roteiro" },
    { id: "dinamica", icon: "🎮", label: "Dinâmica" },
    { id: "relatorio", icon: "📝", label: "Relatório" },
    { id: "mensagem", icon: "💬", label: "Ausente" },
  ];

  return (
    <View style={[s.fill, { backgroundColor: "#f8f9fa" }]}>
      <ModalHeader title="Área do Líder" onBack={onBack} />

      {/* Banner tema do pastor */}
      {pastoralTheme && (
        <View style={[s.pastoralThemeBanner, { borderColor: primary }]}>
          <Text style={[s.pastoralThemeLabel, { color: primary }]}>
            📖 Tema do pastor esta semana
          </Text>
          <Text style={s.pastoralThemeTitle}>{pastoralTheme.title}</Text>
          {pastoralTheme.bibleVerse ? (
            <Text style={s.pastoralThemeVerse}>{pastoralTheme.bibleVerse}</Text>
          ) : null}
          {pastoralTheme.description ? (
            <Text style={s.pastoralThemeDesc}>{pastoralTheme.description}</Text>
          ) : null}
          <TouchableOpacity
            onPress={() => {
              setTheme(pastoralTheme.title);
              if (pastoralTheme.bibleVerse) setVerse(pastoralTheme.bibleVerse);
              setActiveTool("roteiro");
            }}
            style={[s.pastoralThemeBtn, { backgroundColor: primary }]}
          >
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
              Usar este tema →
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tool selector */}
      <View style={s.liderToolBar}>
        {tools.map((t) => (
          <Pressable
            key={t.id}
            style={[
              s.liderToolBtn,
              activeTool === t.id && {
                backgroundColor: primary,
                borderColor: primary,
              },
            ]}
            onPress={() => {
              setActiveTool(t.id);
              setResult(null);
              setError(null);
            }}
          >
            <Text style={{ fontSize: 16 }}>{t.icon}</Text>
            <Text
              style={[
                s.liderToolLabel,
                activeTool === t.id && { color: "#fff" },
              ]}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={s.tabContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Roteiro ── */}
        {activeTool === "roteiro" && (
          <>
            <View style={[s.infoBox, { marginBottom: 16 }]}>
              <Text style={s.infoText}>
                A IA monta um roteiro completo com abertura, quebra-gelo, estudo
                bíblico, aplicação e encerramento.
              </Text>
            </View>
            <Field
              label="Tema do encontro *"
              value={theme}
              onChange={setTheme}
              placeholder="Ex: Fé em tempos difíceis"
            />
            <Field
              label="Passagem bíblica"
              value={verse}
              onChange={setVerse}
              placeholder="Ex: Hebreus 11:1"
            />
            <Field
              label="Perfil do grupo"
              value={groupProfile}
              onChange={setGroupProfile}
              placeholder="Ex: Jovens adultos, 20-35 anos"
            />
          </>
        )}

        {/* ── Dinâmica ── */}
        {activeTool === "dinamica" && (
          <>
            <View style={[s.infoBox, { marginBottom: 16 }]}>
              <Text style={s.infoText}>
                Gera uma dinâmica criativa com passo a passo e materiais
                necessários.
              </Text>
            </View>
            <Field
              label="Tema do encontro *"
              value={dynTheme}
              onChange={setDynTheme}
              placeholder="Ex: Gratidão"
            />
            <Text style={s.label}>Tipo de dinâmica</Text>
            <View
              style={[s.row, { flexWrap: "wrap", gap: 8, marginBottom: 16 }]}
            >
              {["quebra-gelo", "reflexão", "comunhão", "louvor", "missão"].map(
                (type) => (
                  <Pressable
                    key={type}
                    style={[
                      s.typeChip,
                      dynType === type && {
                        backgroundColor: primary,
                        borderColor: primary,
                      },
                    ]}
                    onPress={() => setDynType(type)}
                  >
                    <Text
                      style={[
                        s.typeChipText,
                        dynType === type && { color: "#fff" },
                      ]}
                    >
                      {type}
                    </Text>
                  </Pressable>
                ),
              )}
            </View>
            <Field
              label="Perfil do grupo"
              value={groupProfile}
              onChange={setGroupProfile}
              placeholder="Ex: Famílias com filhos"
            />
          </>
        )}

        {/* ── Relatório ── */}
        {activeTool === "relatorio" && (
          <>
            <View style={[s.infoBox, { marginBottom: 16 }]}>
              <Text style={s.infoText}>
                Preencha os dados do encontro. A IA gera um relatório formatado
                para enviar ao pastor.
              </Text>
            </View>
            <Field
              label="Nome do grupo *"
              value={repGroupName}
              onChange={setRepGroupName}
              placeholder="Ex: CG Centro-Norte"
            />
            <Field
              label="Tema do encontro *"
              value={repTheme}
              onChange={setRepTheme}
              placeholder="Ex: Servindo com alegria"
            />
            <Field
              label="Número de presentes"
              value={repPresent}
              onChange={setRepPresent}
              placeholder="Ex: 14"
              keyboardType="numeric"
            />
            <Field
              label="Pedidos de oração (separados por vírgula)"
              value={repPrayer}
              onChange={setRepPrayer}
              placeholder="Ex: Família de João, saúde de Maria"
            />
            <Field
              label="Observações do líder"
              value={repNotes}
              onChange={setRepNotes}
              placeholder="Como foi o encontro? Algo de especial?"
            />
          </>
        )}

        {/* ── Mensagem de Ausência ── */}
        {activeTool === "mensagem" && (
          <>
            <View style={[s.infoBox, { marginBottom: 16 }]}>
              <Text style={s.infoText}>
                Gera uma mensagem calorosa para enviar ao membro que está
                faltando, sem pressionar.
              </Text>
            </View>
            <Field
              label="Nome do membro *"
              value={absMember}
              onChange={setAbsMember}
              placeholder="Ex: Mariana"
            />
            <Field
              label="Semanas sem aparecer"
              value={absWeeks}
              onChange={setAbsWeeks}
              placeholder="2"
              keyboardType="numeric"
            />
          </>
        )}

        {error && <Text style={s.errorText}>{error}</Text>}

        <Btn
          label={loading ? "Gerando com IA..." : "Gerar com IA"}
          onPress={run}
          loading={loading}
          color={primary}
        />

        {result && (
          <View style={[s.card, { marginTop: 20, backgroundColor: "#fff" }]}>
            <View style={[s.row, { marginBottom: 12 }]}>
              <Text style={{ fontSize: 16, marginRight: 6 }}>✨</Text>
              <Text style={[s.eyebrow, { color: primary }]}>
                GERADO PELA IA
              </Text>
            </View>
            <Text style={[s.cardMeta, { lineHeight: 22, color: BRAND_DARK }]}>
              {result}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Shared UI Components ─────────────────────────────────────────────────────

function ModalHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={s.modalHeader}>
      <TouchableOpacity onPress={onBack} hitSlop={12} style={s.modalBack}>
        <Text style={[s.backBtn, { fontSize: 20 }]}>←</Text>
      </TouchableOpacity>
      <Text style={s.modalTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

function QuickAction({
  icon,
  tint,
  bg,
  label,
  sub,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  bg: string;
  label: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={s.quickAction} onPress={onPress}>
      <View style={[s.quickIconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <Text style={s.quickLabel}>{label}</Text>
      <Text style={s.quickSub}>{sub}</Text>
    </Pressable>
  );
}

function LoadingRow({ primary, label }: { primary: string; label: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 16,
      }}
    >
      <ActivityIndicator color={primary} />
      <Text style={{ fontSize: 14, color: "#9ca3af" }}>{label}</Text>
    </View>
  );
}

function EmptyState({
  icon,
  title,
  sub,
}: {
  icon: string;
  title: string;
  sub: string;
}) {
  return (
    <View style={[s.card, { alignItems: "center", paddingVertical: 32 }]}>
      <Text style={{ fontSize: 40, marginBottom: 12 }}>{icon}</Text>
      <Text style={[s.cardTitle, { textAlign: "center" }]}>{title}</Text>
      <Text
        style={[
          s.cardMeta,
          { textAlign: "center", marginTop: 6, lineHeight: 20 },
        ]}
      >
        {sub}
      </Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  [key: string]: unknown;
}) {
  return (
    <View style={s.formGroup}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChange}
        placeholderTextColor="#9ca3af"
        {...(rest as object)}
      />
    </View>
  );
}

function Btn({
  label,
  onPress,
  loading,
  disabled,
  variant,
  color,
  style,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "outline" | "danger";
  color?: string;
  style?: object;
}) {
  const bg =
    variant === "danger"
      ? "#fee2e2"
      : variant === "outline"
        ? "transparent"
        : (color ?? BRAND);
  const tc =
    variant === "danger"
      ? "#dc2626"
      : variant === "outline"
        ? (color ?? BRAND)
        : "#fff";
  const bc = variant === "outline" ? (color ?? BRAND) : "transparent";
  return (
    <Pressable
      style={({ pressed }) => [
        s.btn,
        {
          backgroundColor: bg,
          borderColor: bc,
          borderWidth: variant === "outline" ? 1.5 : 0,
        },
        pressed && { opacity: 0.75 },
        (disabled || loading) && { opacity: 0.5 },
        style as object,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={tc} />
      ) : (
        <Text style={[s.btnText, { color: tc }]}>{label}</Text>
      )}
    </Pressable>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAuthError(e: unknown): string {
  if (!(e instanceof Error)) return "Erro desconhecido.";
  const m = e.message;
  if (m.includes("email-already-in-use")) return "E-mail já cadastrado.";
  if (m.includes("invalid-email")) return "E-mail inválido.";
  if (m.includes("wrong-password") || m.includes("invalid-credential"))
    return "Senha incorreta.";
  if (m.includes("user-not-found")) return "Usuário não encontrado.";
  if (m.includes("weak-password")) return "Senha muito fraca.";
  if (m.includes("network-request-failed"))
    return "Sem conexão com a internet.";
  return "Erro: " + (m.split(":").pop()?.trim() ?? m);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso;
  }
}
function formatHour(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
function formatWd(iso: string): string {
  try {
    return new Date(iso)
      .toLocaleDateString("pt-BR", { weekday: "short" })
      .replace(".", "")
      .toUpperCase();
  } catch {
    return "";
  }
}
function formatDn(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "numeric" });
  } catch {
    return "";
  }
}
function dowLabel(dow: number): string {
  return (
    ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"][
      dow
    ] ?? "Dia " + dow
  );
}
function eventLabel(type: string): string {
  const m: Record<string, string> = {
    // tipos reais do Event (@alvo/types)
    service: "Culto",
    conference: "Conferência",
    retreat: "Retiro",
    training: "Formação",
    integration_class: "Aula de Integração",
    kids_event: "Kids",
    // legados/apelidos
    culto: "Culto",
    celula: "Célula",
    formacao: "Formação",
    retiro: "Retiro",
    worship: "Culto",
    cell: "Célula",
  };
  return m[type?.toLowerCase()] ?? type;
}
function nextDow(dow: number, hour: number): string {
  const d = new Date();
  const diff = (dow - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  d.setHours(Math.floor(hour), (hour % 1) * 60, 0, 0);
  return d.toISOString();
}

// ─── Styles ───────────────────────────────────────────────────────────────────

// Certificado de conclusão (moldura dourada sobre fundo escuro)
const cert = StyleSheet.create({
  frame: { backgroundColor: "#c9a24b", borderRadius: 16, padding: 6 },
  inner: {
    backgroundColor: "#fffdf7",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e6d9b3",
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  logo: { width: 120, height: 60, marginBottom: 8 },
  church: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f1b2d",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  divider: {
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#c9a24b",
    marginVertical: 14,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    color: "#c9a24b",
  },
  certifies: { fontSize: 13, color: "#5b6472", marginTop: 16 },
  name: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0f1b2d",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 4,
  },
  body: { fontSize: 13, color: "#5b6472", textAlign: "center" },
  course: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f1b2d",
    textAlign: "center",
    marginTop: 4,
  },
  instructor: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f1b2d",
    textAlign: "center",
    marginTop: 2,
  },
  date: { fontSize: 12, color: "#8a93a1", marginTop: 18 },
  seal: { fontSize: 34, marginTop: 10 },
});

const s = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center" },

  // Splash / Logo
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: BRAND,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: "#fff", fontSize: 36, fontWeight: "800" },

  // Welcome
  welcomeHero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 48,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: BRAND_DARK,
    textAlign: "center",
    marginTop: 24,
    lineHeight: 40,
  },
  welcomeSub: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 24,
  },
  welcomeActions: { paddingHorizontal: 24, paddingBottom: 48, gap: 12 },

  // Buttons
  btn: { borderRadius: 12, paddingVertical: 15, alignItems: "center" },
  btnText: { fontSize: 16, fontWeight: "700" },

  // Screen header
  screenHeader: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  backBtn: { fontSize: 16, color: BRAND, fontWeight: "600" },
  formContent: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 48 },
  screenTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: BRAND_DARK,
    marginBottom: 6,
  },
  screenSub: {
    fontSize: 15,
    color: "#6b7280",
    marginBottom: 20,
    lineHeight: 22,
  },
  notifBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  notifBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  promoCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eef0f3",
  },
  promoStore: { fontSize: 13, fontWeight: "800" },
  promoTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: BRAND_DARK,
    marginBottom: 4,
  },
  promoDesc: { fontSize: 14, color: "#4b5563", lineHeight: 20 },
  promoValid: { fontSize: 12, color: "#9ca3af", marginTop: 8 },
  formGroup: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: BRAND_DARK,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: BRAND_DARK,
    backgroundColor: "#fff",
  },
  errorText: { color: "#dc2626", fontSize: 13, marginBottom: 12 },
  linkRow: { alignItems: "center", marginTop: 20 },
  linkText: { fontSize: 14, color: "#6b7280" },
  linkBold: { fontWeight: "700", color: BRAND },
  warnBox: {
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  warnText: { fontSize: 13, color: "#92400e" },
  infoBox: { backgroundColor: `${BRAND}14`, borderRadius: 8, padding: 14 },
  infoText: { fontSize: 14, color: BRAND_DARK, lineHeight: 20 },

  // Main app
  mainHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  mainGreeting: { color: "#fff", fontSize: 18, fontWeight: "700" },
  mainOrg: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 2 },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "700" },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingBottom: 24,
  },
  tabItem: { flex: 1, alignItems: "center", paddingTop: 8 },
  tabLabel: { fontSize: 11, color: "#9ca3af", marginTop: 2, fontWeight: "500" },

  // Tab content
  tabContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: BRAND_DARK,
    marginBottom: 10,
    marginTop: 16,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9ca3af",
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  // Cards
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: BRAND_DARK,
    marginBottom: 3,
  },
  cardMeta: { fontSize: 13, color: "#6b7280" },
  cta: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },

  // Quick actions
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 4,
  },
  quickAction: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  quickIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: BRAND_DARK,
    marginBottom: 2,
  },
  quickSub: { fontSize: 11, color: "#9ca3af", lineHeight: 15 },

  // Journey
  journeyStep: { alignItems: "center", width: 64 },
  journeyIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  journeyLine: { height: 2, marginTop: 0 },
  journeyLabel: {
    fontSize: 11,
    color: BRAND_DARK,
    fontWeight: "600",
    textAlign: "center",
  },
  journeyNudge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  journeyNudgeText: { fontSize: 12, color: "#6b7280", lineHeight: 16 },

  // Agenda
  agendaCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  agendaDate: {
    width: 60,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  agendaWd: { color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: "700" },
  agendaDn: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 2 },
  agendaInfo: { flex: 1, padding: 14 },

  // Célula
  chip: {
    backgroundColor: "#f3f4f6",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  chipText: { fontSize: 14, color: BRAND_DARK, fontWeight: "600" },
  announcementRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  prayerInput: {
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: BRAND_DARK,
    minHeight: 96,
  },

  // Perfil
  profileHeader: { alignItems: "center", paddingVertical: 24 },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  profileAvatarText: { color: "#fff", fontSize: 32, fontWeight: "800" },
  profileName: { fontSize: 20, fontWeight: "800", color: BRAND_DARK },
  profileEmail: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  menuIcon: { fontSize: 22, marginRight: 12 },
  menuLabel: { fontSize: 15, fontWeight: "700", color: BRAND_DARK },
  menuSub: { fontSize: 12, color: "#9ca3af", marginTop: 1 },
  menuChev: { fontSize: 22, color: "#9ca3af", marginLeft: 8 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  infoLabel: { fontSize: 14, color: "#6b7280" },
  infoValue: { fontSize: 14, fontWeight: "700", color: BRAND_DARK },

  // Modal header
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  modalBack: { width: 40 },
  modalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: BRAND_DARK,
    textAlign: "center",
  },

  // Segment control
  segControl: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    margin: 16,
    padding: 3,
  },
  seg: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  segText: { fontSize: 14, fontWeight: "600", color: "#6b7280" },

  // Doações
  typeChip: {
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  typeChipText: { fontSize: 13, fontWeight: "600", color: BRAND_DARK },
  amountChip: {
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  amountText: { fontSize: 14, fontWeight: "700", color: BRAND_DARK },
  methodBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginHorizontal: 4,
    gap: 4,
  },
  methodLabel: { fontSize: 13, color: "#6b7280" },
  qrPlaceholder: { alignItems: "center", paddingVertical: 20 },
  qrFrame: {
    borderWidth: 2,
    borderColor: BRAND_DARK,
    borderRadius: 4,
    padding: 8,
    marginBottom: 10,
  },
  qrRow: { flexDirection: "row" },
  qrCell: {
    width: 12,
    height: 12,
    margin: 1,
    borderRadius: 1,
    backgroundColor: "#fff",
  },
  qrLabel: { fontSize: 13, fontWeight: "700", color: BRAND_DARK },
  qrSub: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  pixRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  pixLabel: { fontSize: 12, color: "#6b7280", marginBottom: 2 },
  pixKey: {
    fontSize: 15,
    fontWeight: "700",
    color: BRAND_DARK,
    letterSpacing: 0.5,
  },
  copyBtn: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginLeft: 12,
  },
  copyBtnText: { fontSize: 13, fontWeight: "700" },
  receiptPreview: { width: "100%", height: 160, borderRadius: 8 },

  // Kids
  roomRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  roomLabel: { fontSize: 14, color: BRAND_DARK },
  codeBox: {
    borderWidth: 2,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    minWidth: 72,
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9ca3af",
    marginBottom: 2,
  },
  codeValue: { fontSize: 22, fontWeight: "800" },

  // Líder de Célula
  pastoralThemeBanner: {
    margin: 16,
    marginBottom: 0,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#faf5ff",
  },
  pastoralThemeLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pastoralThemeTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: 2,
  },
  pastoralThemeVerse: {
    fontSize: 13,
    color: "#7c3aed",
    fontStyle: "italic",
    marginBottom: 4,
  },
  pastoralThemeDesc: { fontSize: 12, color: "#6b7280", marginBottom: 8 },
  pastoralThemeBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  liderBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    backgroundColor: "#fff",
    gap: 12,
  },
  liderBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  liderBannerTitle: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  liderBannerSub: { fontSize: 12, color: "#6b7280", lineHeight: 16 },
  liderToolBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  liderToolBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    gap: 3,
  },
  liderToolLabel: { fontSize: 11, fontWeight: "600", color: "#6b7280" },

  // Escala
  escalaBtn: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },

  // Música
  songRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  songKey: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  songKeyText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  progRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  progNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  progNumText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  chordsText: {
    color: "#e2e8f0",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 15,
    lineHeight: 26,
  },
  lyricsText: { color: BRAND_DARK, fontSize: 15, lineHeight: 26 },
});
