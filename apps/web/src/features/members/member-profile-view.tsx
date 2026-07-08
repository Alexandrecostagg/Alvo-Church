"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  createFirebaseWebRuntimeConfigFromEnv,
  fetchFamilyById,
  fetchFamilyMembers,
  fetchPeople,
  fetchPersonById,
  fetchGroups,
  fetchGroupMembers,
  isFirebaseWebRuntimeConfigured
} from "@alvo/firebase";
import {
  getTribeDisplayLabel,
  getTribeMinistrySummary
} from "@alvo/domain";
import type { Family, FamilyMember, Group, Person } from "@alvo/types";
import {
  Tent,
  QrCode,
  CalendarCheck,
  MapPin,
  Smartphone,
  Mail,
  User,
  Bookmark,
  Heart,
  Users,
  DollarSign,
  BookOpen,
  Music,
  CheckCircle,
  Plus,
  Compass,
  ArrowRight,
  ShieldAlert
} from "lucide-react";
import { useAppAuth } from "../../../app/providers";
import { recentPeople } from "../../lib/mock-data";

const JOURNEY_STAGES = [
  { code: "reception", label: "Recepção", desc: "Cadastrado na entrada" },
  { code: "contact", label: "Acolhimento", desc: "Primeiro follow-up ativo" },
  { code: "cell", label: "Frequente em Célula", desc: "Participando de pequenos grupos" },
  { code: "class", label: "Classe de Maturidade", desc: "Formação de discipulado" },
  { code: "baptism", label: "Batismo / Aliança", desc: "Membro formal da igreja" },
  { code: "leader", label: "Liderança", desc: "Líder de Célula ou Voluntário" }
];

const S = {
  card: {
    backgroundColor: "var(--alvo-surface)",
    border: "1px solid var(--alvo-line)",
    borderRadius: 20,
    padding: "1.25rem",
  } as React.CSSProperties,
  cardLg: {
    backgroundColor: "var(--alvo-surface)",
    border: "1px solid var(--alvo-line)",
    borderRadius: 24,
    padding: "2rem",
  } as React.CSSProperties,
  cardMuted: {
    backgroundColor: "var(--alvo-surface-muted)",
    border: "1px solid var(--alvo-line)",
    borderRadius: 20,
    padding: "1.25rem",
  } as React.CSSProperties,
  label: { fontSize: "0.75rem", color: "var(--alvo-ink-soft)" } as React.CSSProperties,
  value: { display: "block", fontSize: "1.5rem", fontWeight: 800, color: "var(--alvo-ink)", marginTop: 4 } as React.CSSProperties,
  hint: { fontSize: "0.7rem", color: "var(--alvo-ink-soft)", marginTop: 4 } as React.CSSProperties,
  divider: { borderBottom: "1px solid var(--alvo-line)" } as React.CSSProperties,
  ink: { color: "var(--alvo-ink)" } as React.CSSProperties,
  soft: { color: "var(--alvo-ink-soft)" } as React.CSSProperties,
};

export function MemberProfileView() {
  const params = useParams<{ personId?: string }>();
  const personId = typeof params.personId === "string" ? params.personId : "";
  const { configured, firebaseReady, user, organizationId, firebaseConfig } = useAppAuth();
  const [person, setPerson] = useState<Person | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [familyPeople, setFamilyPeople] = useState<Person[]>([]);
  const [status, setStatus] = useState("Carregando ficha do membro...");
  const [personGroup, setPersonGroup] = useState<Group | null>(null);

  const [activeStage, setActiveStage] = useState("contact");
  const [activeTab, setActiveTab] = useState<"cell" | "finance" | "academy" | "serving">("cell");

  const [contributions, setContributions] = useState([
    { id: 1, date: "10/05/2026", category: "Dízimo", amount: 250.00, method: "PIX", note: "Conciliação automática via Gateway" },
    { id: 2, date: "02/05/2026", category: "Missões", amount: 80.00, method: "Cartão", note: "Fundo Missionário Esdras" }
  ]);
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState("Dízimo");

  useEffect(() => {
    if (!personId) {
      setStatus("Membro não informado.");
      return;
    }

    if (!configured || !firebaseReady || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      const mockPerson = (recentPeople as readonly any[]).find(p => p.id === personId) || (recentPeople as readonly any[])[0];
      if (mockPerson) {
        setPerson(mockPerson);
        if (mockPerson.memberStatus === "visitor") {
          setActiveStage("reception");
        } else if (mockPerson.memberStatus === "congregant" || mockPerson.memberStatus === "new_believer") {
          setActiveStage("cell");
        } else if (mockPerson.memberStatus === "member") {
          setActiveStage("baptism");
        } else if (mockPerson.memberStatus === "leader" || mockPerson.memberStatus === "volunteer") {
          setActiveStage("leader");
        }
        setStatus("Exibindo dados de demonstração.");
      } else {
        setStatus("Entre na sua conta para abrir a ficha completa.");
      }
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      setStatus("Buscando pessoa, família e contexto pastoral...");

      try {
        const nextPerson = await fetchPersonById(firebaseConfig, { organizationId }, personId);

        if (cancelled) return;

        if (!nextPerson) {
          setStatus("Membro não encontrado.");
          setPerson(null);
          return;
        }

        setPerson(nextPerson);
        if (nextPerson.memberStatus === "visitor") {
          setActiveStage("reception");
        } else if (nextPerson.memberStatus === "congregant" || nextPerson.memberStatus === "new_believer") {
          setActiveStage("cell");
        } else if (nextPerson.memberStatus === "member") {
          setActiveStage("baptism");
        } else if (nextPerson.memberStatus === "leader" || nextPerson.memberStatus === "volunteer") {
          setActiveStage("leader");
        }

        // Célula da pessoa: procura o vínculo dela entre os grupos ativos
        try {
          const allGroups = await fetchGroups(firebaseConfig, { organizationId }, 50);
          const memberships = await fetchGroupMembers(firebaseConfig, { organizationId }, allGroups, 50);
          if (!cancelled) {
            const membership = memberships.find((m) => m.personId === personId);
            setPersonGroup(membership ? allGroups.find((g) => g.id === membership.groupId) ?? null : null);
          }
        } catch {
          if (!cancelled) setPersonGroup(null);
        }

        if (!nextPerson.primaryFamilyId) {
          setFamily(null);
          setFamilyMembers([]);
          setFamilyPeople([]);
          setStatus("Ficha carregada sem família vinculada.");
          return;
        }

        const [nextFamily, nextFamilyMembers, nextPeople] = await Promise.all([
          fetchFamilyById(firebaseConfig, { organizationId }, nextPerson.primaryFamilyId),
          fetchFamilyMembers(firebaseConfig, { organizationId }, nextPerson.primaryFamilyId),
          fetchPeople(firebaseConfig, { organizationId }, 80)
        ]);

        if (cancelled) return;

        const familyPersonIds = new Set(nextFamilyMembers.map((member) => member.personId));
        setFamily(nextFamily);
        setFamilyMembers(nextFamilyMembers);
        setFamilyPeople(nextPeople.filter((item) => familyPersonIds.has(item.id)));
        setStatus("Ficha completa carregada.");
      } catch (error) {
        if (!cancelled) {
          setStatus("Exibindo dados simulados da ficha contábil.");
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [configured, firebaseConfig, firebaseReady, personId, organizationId, user]);

  const fullName = person ? getFullName(person) : "Ficha de membro";
  const profileHealth = person ? getProfileHealth(person) : [];

  const totalGiven = useMemo(() => {
    return contributions.reduce((sum, item) => sum + item.amount, 0);
  }, [contributions]);

  const handleAddContribution = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(newAmount);
    if (isNaN(amountVal) || amountVal <= 0) return;

    const entry = {
      id: Date.now(),
      date: new Date().toLocaleDateString("pt-BR"),
      category: newCategory,
      amount: amountVal,
      method: "Lançamento Manual",
      note: "Registrado diretamente na ficha do membro"
    };

    setContributions(prev => [entry, ...prev]);
    setNewAmount("");
    setStatus(`Contribuição de R$ ${amountVal.toFixed(2)} cadastrada com sucesso!`);
  };

  return (
    <main className="form-page profile-page animate-entrance" style={{ maxWidth: 1400, padding: "2rem" }}>

      {/* Cabeçalho do Perfil */}
      <section className="profile-hero" style={{ borderBottom: "1px solid var(--alvo-line)", paddingBottom: "2rem" }}>
        <div>
          <Link className="back-link" href="/members" style={{ color: "var(--alvo-accent)" }}>
            Voltar para membros
          </Link>
          <p className="eyebrow" style={{ color: "var(--alvo-accent)" }}>Ficha Inteligente</p>
          <h1>{fullName}</h1>
          <p style={{ color: "var(--alvo-ink-soft)", fontSize: 17, lineHeight: 1.55, maxWidth: 760 }}>
            Visão pastoral integrada: acompanhe o progresso da jornada da alma, a participação nas células,
            doações fiéis, voluntariado e trilha acadêmica de forma unificada.
          </p>
        </div>
        <aside style={{ backgroundColor: "var(--alvo-surface)", border: "1px solid var(--alvo-line)", borderRadius: 24, padding: "1.5rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--alvo-accent)", textTransform: "uppercase", fontWeight: 800 }}>
            {person ? getMemberStatusLabel(person.memberStatus) : "Aguardando"}
          </span>
          <strong style={{ display: "block", fontSize: "1.5rem", color: "var(--alvo-ink)", marginTop: 4, fontFamily: "monospace" }}>
            {person?.memberCardCode ?? "ALVO-992-041"}
          </strong>
          <p style={{ fontSize: "0.75rem", color: "var(--alvo-ink-soft)", marginTop: 8 }}>{status}</p>
        </aside>
      </section>

      {person ? (
        <>
          {/* Métricas Principais */}
          <section className="profile-summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1.25rem", marginTop: "2rem" }}>
            <article style={S.card}>
              <span style={S.label}>Idade</span>
              <strong style={S.value}>
                {person.birthDate ? `${calculateAge(person.birthDate)} anos` : "28 anos"}
              </strong>
              <p style={S.hint}>
                {person.birthDate ? formatDate(person.birthDate) : "nascimento não informado"}
              </p>
            </article>

            <article style={S.card}>
              <span style={S.label}>Casa / Família</span>
              <strong style={{ ...S.value, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                {family ? family.displayName || family.familyName : "Família Costa"}
              </strong>
              <p style={S.hint}>
                {familyPeople.length || 3} pessoas mapeadas no domicílio
              </p>
            </article>

            <article style={S.card}>
              <span style={S.label}>Parcerias / Esdras Passe</span>
              <strong style={{ ...S.value, color: person.partnerBenefitsEnabled ? "#10b981" : "var(--alvo-ink-soft)" }}>
                {person.partnerBenefitsEnabled ? "Habilitado" : "Não habilitado"}
              </strong>
              <p style={S.hint}>{person.partnerBenefitsEnabled ? "Validação de convênios ativada" : "Convênios ainda não ativados"}</p>
            </article>

            <article style={S.card}>
              <span style={S.label}>Privacidade / LGPD</span>
              <strong style={{ ...S.value, color: person.consentLgpdAt ? "#10b981" : "#d97706" }}>
                {person.consentLgpdAt ? "Confirmado" : "Pendente"}
              </strong>
              <p style={S.hint}>{person.consentLgpdAt ? "Termo de consentimento assinado" : "Termo de consentimento ainda não assinado"}</p>
            </article>

            <Link href="/tribes" style={{ textDecoration: "none" }}>
              <article style={{ ...S.card, backgroundColor: "var(--alvo-accent-soft)", borderLeft: "4px solid var(--alvo-accent)", height: "100%" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--alvo-accent)" }}>Tribo (vocação ministerial)</span>
                <strong style={S.value}>
                  {person.tribePrimaryCode ? getTribeDisplayLabel(person.tribePrimaryCode) : "Não classificada"}
                </strong>
                <p style={{ ...S.hint, color: "var(--alvo-accent)" }}>
                  {person.tribePrimaryCode
                    ? getTribeMinistrySummary(person.tribePrimaryCode)
                    : "Classifique na página de Tribos"}
                </p>
              </article>
            </Link>

            <Link href="/groups" style={{ textDecoration: "none" }}>
              <article style={{ ...S.card, backgroundColor: "rgba(16,185,129,0.08)", borderLeft: "4px solid #10b981", height: "100%" }}>
                <span style={{ fontSize: "0.75rem", color: "#059669" }}>Célula (comunidade)</span>
                <strong style={S.value}>
                  {personGroup ? personGroup.name : "Sem célula"}
                </strong>
                <p style={{ ...S.hint, color: "#059669" }}>
                  {personGroup
                    ? [personGroup.meetingTime, personGroup.city].filter(Boolean).join(" · ") || "Detalhes na página de Células"
                    : "Vincule na página de Células"}
                </p>
              </article>
            </Link>
          </section>

          {/* Linha do Tempo da Jornada Pastoral */}
          <section style={{ marginTop: "2.5rem" }}>
            <div style={S.cardLg}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--alvo-accent)", textTransform: "uppercase", fontWeight: 800 }}>Funil de Integração</span>
                  <h2 style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--alvo-ink)", marginTop: 4 }}>Linha do Tempo da Jornada Pastoral</h2>
                </div>
                <span style={{ fontSize: "0.8rem", background: "var(--alvo-accent-soft)", color: "var(--alvo-accent)", padding: "6px 12px", borderRadius: 10, fontWeight: 700 }}>
                  Estágio atual: {JOURNEY_STAGES.find(s => s.code === activeStage)?.label || activeStage}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", position: "relative", padding: "1rem 0" }}>
                <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 4, backgroundColor: "var(--alvo-line)", zIndex: 1, transform: "translateY(-50%)" }} />

                {JOURNEY_STAGES.map((stage, idx) => {
                  const isCompleted = JOURNEY_STAGES.findIndex(s => s.code === activeStage) >= idx;
                  const isActive = stage.code === activeStage;

                  return (
                    <button
                      key={stage.code}
                      onClick={() => setActiveStage(stage.code)}
                      style={{
                        background: "none",
                        border: "none",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        zIndex: 2,
                        width: "15%",
                        cursor: "pointer",
                        textAlign: "center",
                        outline: "none"
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          backgroundColor: isActive ? "var(--alvo-accent)" : isCompleted ? "var(--alvo-accent-dark)" : "var(--alvo-surface-muted)",
                          border: isActive ? "4px solid var(--alvo-accent-soft)" : "2px solid var(--alvo-line)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: isCompleted || isActive ? "white" : "var(--alvo-ink-soft)",
                          fontWeight: 800,
                          transition: "all 0.3s ease"
                        }}
                        className={isActive ? "antigravity-float" : ""}
                      >
                        {idx + 1}
                      </div>
                      <strong style={{ color: isActive ? "var(--alvo-accent)" : isCompleted ? "var(--alvo-ink)" : "var(--alvo-ink-soft)", fontSize: "0.85rem", marginTop: 12, display: "block" }}>
                        {stage.label}
                      </strong>
                      <span style={{ color: "var(--alvo-ink-soft)", fontSize: "0.7rem", marginTop: 4, display: "block", lineHeight: "1rem" }}>
                        {stage.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Grid Principal */}
          <section className="profile-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem", marginTop: "2.5rem" }}>

            {/* Painel de Abas */}
            <article style={S.cardLg}>

              <div style={{ display: "flex", borderBottom: "1px solid var(--alvo-line)", paddingBottom: "1rem", gap: "1.5rem" }}>
                {([
                  { key: "cell", icon: <Users size={16} />, label: "⛪ Célula & Grupos" },
                  { key: "finance", icon: <DollarSign size={16} />, label: "💵 Contribuições" },
                  { key: "academy", icon: <BookOpen size={16} />, label: "🎓 Ensino / EAD" },
                  { key: "serving", icon: <Music size={16} />, label: "🎸 Ministérios / Escalas" },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      background: "none",
                      border: "none",
                      color: activeTab === tab.key ? "var(--alvo-accent)" : "var(--alvo-ink-soft)",
                      fontWeight: 800,
                      fontSize: "0.95rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      paddingBottom: "12px",
                      borderBottom: activeTab === tab.key ? "3px solid var(--alvo-accent)" : "none"
                    }}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: "2rem" }}>

                {activeTab === "cell" && (
                  <div className="animate-entrance">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                      <div>
                        <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--alvo-ink)" }}>Célula Betel (Jovens)</h3>
                        <p style={{ color: "var(--alvo-ink-soft)", fontSize: "0.85rem", marginTop: 4 }}>
                          Líder Responsável: <strong>Patrícia Albuquerque</strong>
                        </p>
                      </div>
                      <span style={{ fontSize: "0.75rem", background: "rgba(16,185,129,0.1)", color: "#10b981", padding: "6px 12px", borderRadius: 10, fontWeight: 700 }}>
                        Frequência Alta
                      </span>
                    </div>

                    <p style={{ fontSize: "0.9rem", color: "var(--alvo-ink-soft)", lineHeight: "1.5rem" }}>
                      Esta pessoa faz parte da Célula Betel, que se reúne às <strong style={S.ink}>quartas-feiras às 20:00</strong> no bairro Campestre.
                    </p>

                    <div style={{ marginTop: "2rem" }}>
                      <h4 style={{ fontSize: "0.9rem", color: "var(--alvo-accent)", fontWeight: 800, marginBottom: "1rem" }}>Rastreador de Presenças (Últimas 4 reuniões):</h4>
                      <div style={{ display: "flex", gap: "1rem" }}>
                        {[
                          { date: "17/05/2026", present: true },
                          { date: "10/05/2026", present: true },
                          { date: "03/05/2026", present: true },
                          { date: "26/04/2026", present: false },
                        ].map(({ date, present }) => (
                          <div key={date} style={{ flex: 1, backgroundColor: present ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${present ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`, borderRadius: 12, padding: "1rem", textAlign: "center" }}>
                            {present
                              ? <CheckCircle size={20} style={{ color: "#10b981", margin: "0 auto 8px" }} />
                              : <ShieldAlert size={20} style={{ color: "#ef4444", margin: "0 auto 8px" }} />
                            }
                            <strong style={{ display: "block", fontSize: "0.8rem", color: "var(--alvo-ink)" }}>{date}</strong>
                            <span style={{ fontSize: "0.7rem", color: present ? "#10b981" : "#ef4444" }}>{present ? "Presente" : "Ausente"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "finance" && (
                  <div className="animate-entrance">
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "2rem" }}>
                      <div style={S.card}>
                        <span style={S.label}>Contribuição Consolidada</span>
                        <strong style={{ display: "block", fontSize: "2rem", color: "#10b981", marginTop: 4 }}>
                          R$ {totalGiven.toFixed(2)}
                        </strong>
                        <p style={S.hint}>Dízimos e Ofertas registradas no CPF</p>
                      </div>

                      <form onSubmit={handleAddContribution} style={S.cardMuted}>
                        <h4 style={{ fontSize: "0.85rem", color: "var(--alvo-ink)", fontWeight: 800, marginBottom: "1rem" }}>Lançar Nova Doação</h4>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <select
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            style={{ flex: 1, padding: "8px", backgroundColor: "var(--alvo-surface)", border: "1px solid var(--alvo-line)", borderRadius: 8, color: "var(--alvo-ink)" }}
                          >
                            <option>Dízimo</option>
                            <option>Oferta</option>
                            <option>Missões</option>
                          </select>
                          <input
                            type="number"
                            required
                            placeholder="R$ 100,00"
                            value={newAmount}
                            onChange={(e) => setNewAmount(e.target.value)}
                            style={{ flex: 1, padding: "8px", backgroundColor: "var(--alvo-surface)", border: "1px solid var(--alvo-line)", borderRadius: 8, color: "var(--alvo-ink)" }}
                          />
                          <button type="submit" style={{ backgroundColor: "var(--alvo-accent)", color: "white", border: "none", borderRadius: 8, padding: "0 12px", cursor: "pointer" }}>
                            <Plus size={16} />
                          </button>
                        </div>
                      </form>
                    </div>

                    <table style={{ width: "100%", borderCollapse: "collapse", color: "var(--alvo-ink)", fontSize: "0.85rem" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--alvo-line)", textAlign: "left" }}>
                          {["Data", "Categoria", "Canal", "Observação", "Valor"].map(h => (
                            <th key={h} style={{ padding: "10px 0", color: "var(--alvo-ink-soft)", textAlign: h === "Valor" ? "right" : "left" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {contributions.map((item) => (
                          <tr key={item.id} style={{ borderBottom: "1px solid var(--alvo-line)" }}>
                            <td style={{ padding: "12px 0" }}>{item.date}</td>
                            <td style={{ padding: "12px 0", fontWeight: 700 }}>{item.category}</td>
                            <td style={{ padding: "12px 0" }}>
                              <span style={{ backgroundColor: "var(--alvo-surface-muted)", border: "1px solid var(--alvo-line)", padding: "2px 8px", borderRadius: 6, fontSize: "0.75rem" }}>{item.method}</span>
                            </td>
                            <td style={{ padding: "12px 0", color: "var(--alvo-ink-soft)" }}>{item.note}</td>
                            <td style={{ padding: "12px 0", textAlign: "right", color: "#10b981", fontWeight: 700 }}>R$ {item.amount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === "academy" && (
                  <div className="animate-entrance">
                    <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--alvo-ink)", marginBottom: "1.5rem" }}>
                      Matrícula Ativa no EAD Academia Esdras
                    </h3>

                    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                      {[
                        { title: "Curso de Maturidade Cristã V1", pct: 85, color: "var(--alvo-accent)", note: "Faltam 2 aulas para a emissão do certificado digital." },
                        { title: "DNA Esdras - Integração e Visão", pct: 100, color: "#10b981", note: "✓ Certificado gerado e anexado ao Esdras Passe." },
                      ].map(c => (
                        <div key={c.title} style={S.card}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                            <strong style={S.ink}>{c.title}</strong>
                            <span style={{ color: c.color, fontWeight: 700, fontSize: "0.85rem" }}>{c.pct}% Concluído</span>
                          </div>
                          <div style={{ width: "100%", height: 8, backgroundColor: "var(--alvo-surface-muted)", borderRadius: 4, overflow: "hidden" }}>
                            <div style={{ width: `${c.pct}%`, height: "100%", backgroundColor: c.color }} />
                          </div>
                          <small style={{ color: c.pct === 100 ? c.color : "var(--alvo-ink-soft)", display: "block", marginTop: 8 }}>{c.note}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "serving" && (
                  <div className="animate-entrance">
                    <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--alvo-ink)", marginBottom: "1.5rem" }}>
                      Ministérios Ativos & Próximas Escalas
                    </h3>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                      <div style={{ ...S.card, backgroundColor: "rgba(139,92,246,0.05)", borderLeft: "4px solid #8b5cf6" }}>
                        <span style={{ fontSize: "0.75rem", color: "#8b5cf6", textTransform: "uppercase", fontWeight: 800 }}>Ministério Principal</span>
                        <strong style={{ ...S.value, fontSize: "1.25rem" }}>Louvor e Adoração</strong>
                        <p style={{ ...S.hint, fontSize: "0.8rem" }}>
                          Função: <strong style={S.ink}>Baixista / Vocal de Apoio</strong>
                        </p>
                        <p style={S.hint}>{person.tribePrimaryCode ? `Dons alinhados à Tribo ${getTribeDisplayLabel(person.tribePrimaryCode)}` : "Tribo ainda não classificada"}</p>
                      </div>

                      <div style={{ ...S.card, backgroundColor: "var(--alvo-accent-soft)", borderLeft: "4px solid var(--alvo-accent)" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--alvo-accent)", textTransform: "uppercase", fontWeight: 800 }}>Próxima Escala</span>
                        <strong style={{ ...S.value, fontSize: "1.25rem" }}>Domingo da Noite</strong>
                        <p style={{ ...S.hint, fontSize: "0.8rem" }}>
                          Data: <strong style={S.ink}>24/05/2026 às 18:30</strong>
                        </p>
                        <p style={{ ...S.hint, color: "#10b981", fontWeight: 700 }}>
                          ✓ Presença confirmada no aplicativo
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </article>

            {/* Dados Pastorais / Sidebar */}
            <aside style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

              <div style={S.cardLg}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--alvo-ink)", marginBottom: "1.25rem" }}>Contato Rápido</h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontSize: "0.85rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--alvo-ink-soft)" }}>
                    <Smartphone size={16} style={{ color: "var(--alvo-accent)" }} />
                    <span>{person.mobilePhone || "(11) 98765-4321"}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--alvo-ink-soft)" }}>
                    <Mail size={16} style={{ color: "var(--alvo-accent)" }} />
                    <span style={{ wordBreak: "break-all" }}>{person.email || "contato@plataformaesdras.com.br"}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--alvo-ink-soft)" }}>
                    <MapPin size={16} style={{ color: "var(--alvo-accent)" }} />
                    <span>{formatAddress(person.address)}</span>
                  </div>
                </div>
              </div>

              <div style={S.cardLg}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--alvo-ink)", marginBottom: "1.25rem" }}>Atenção Pastoral</h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {profileHealth.map((item) => (
                    <div key={item.title} style={{ borderBottom: "1px solid var(--alvo-line)", paddingBottom: "0.75rem" }}>
                      <strong style={{ display: "block", fontSize: "0.85rem", color: "var(--alvo-accent)" }}>{item.title}</strong>
                      <p style={{ ...S.hint, lineHeight: "1.4" }}>{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Esdras Passe Card */}
              <div style={S.cardLg}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--alvo-ink)" }}>Esdras Passe</h3>
                  <QrCode size={20} style={{ color: "var(--alvo-accent)" }} />
                </div>
                <p style={{ ...S.hint, lineHeight: "1.4", marginBottom: "1.5rem", fontSize: "0.8rem" }}>
                  Carteira digital com QR Code criptografado para validação em parceiros locais da comunidade Esdras.
                </p>

                <div style={{ display: "flex", gap: "1rem", alignItems: "center", backgroundColor: "var(--alvo-surface-muted)", padding: "1rem", borderRadius: 16, border: "1px solid var(--alvo-line)" }}>
                  <div style={{ backgroundColor: "var(--alvo-ink)", padding: 6, borderRadius: 8, color: "white" }}>
                    <QrCode size={50} />
                  </div>
                  <div>
                    <span style={{ fontSize: "0.65rem", color: "var(--alvo-ink-soft)", textTransform: "uppercase", display: "block" }}>MEMBER IDENTIFIER</span>
                    <strong style={{ fontSize: "1rem", color: "var(--alvo-ink)", fontFamily: "monospace" }}>{person.memberCardCode || "ALVO-002-391"}</strong>
                  </div>
                </div>
              </div>

            </aside>
          </section>
        </>
      ) : (
        <section className="profile-panel" style={{ marginTop: "2rem", ...S.cardLg }}>
          <h2 style={S.ink}>{status}</h2>
          <p style={{ ...S.soft, marginTop: "1rem" }}>
            Se você acabou de cadastrar o membro, retorne à lista de busca e verifique a ficha novamente.
          </p>
          <Link className="primary-button" href="/members" style={{ marginTop: "1.5rem" }}>
            Voltar para membros
          </Link>
        </section>
      )}

    </main>
  );
}

function getFullName(person: Person) {
  return `${person.preferredName || person.firstName} ${person.lastName}`.trim();
}

function calculateAge(birthDate: string) {
  const birth = new Date(`${birthDate}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();

  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return Number.isFinite(age) ? age : 0;
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value));
  } catch (e) {
    return value;
  }
}

function formatAddress(address: Person["address"] | Family["address"]) {
  if (!address) {
    return "Endereço não informado";
  }

  return [address.street, address.number, address.district, address.city, address.state]
    .filter(Boolean)
    .join(", ") || "Endereço não informado";
}

function getMemberStatusLabel(status: Person["memberStatus"]) {
  switch (status) {
    case "visitor":
      return "Visitante";
    case "congregant":
      return "Congregado";
    case "new_believer":
      return "Novo Convertido";
    case "member":
      return "Membro";
    case "leader":
      return "Líder";
    case "volunteer":
      return "Voluntário";
    default:
      return "Membro";
  }
}

function getProfileHealth(person: Person) {
  const items = [];

  if (!person.primaryFamilyId) {
    items.push({
      title: "Vincular Família",
      detail: "Sem grupo familiar vinculado. Ligue esta pessoa a uma casa para rastreamento de núcleo domiciliar."
    });
  }

  if (!person.whatsappPhone && !person.mobilePhone) {
    items.push({
      title: "Telefone de Contato",
      detail: "Nenhum celular ou WhatsApp registrado na base de dados sensível."
    });
  }

  if (!person.consentLgpdAt) {
    items.push({
      title: "Consentimento LGPD",
      detail: "Membro ainda não tem assinatura de conformidade com dados protegidos."
    });
  }

  if (!items.length) {
    items.push({
      title: "Engajamento Excelente",
      detail: "Todas as tarefas cadastrais e de privacidade estão resolvidas para esta pessoa."
    });
  }

  return items;
}
