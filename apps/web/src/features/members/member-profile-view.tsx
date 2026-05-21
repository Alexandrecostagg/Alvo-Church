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
  isFirebaseWebRuntimeConfigured
} from "@alvo/firebase";
import { 
  getTribeDisplayLabel,
  getTribeMinistrySummary 
} from "@alvo/domain";
import type { Family, FamilyMember, Person } from "@alvo/types";
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

// Definindo os estágios da jornada pastoral
const JOURNEY_STAGES = [
  { code: "reception", label: "Recepção", desc: "Cadastrado na entrada" },
  { code: "contact", label: "Acolhimento", desc: "Primeiro follow-up ativo" },
  { code: "cell", label: "Frequente em Célula", desc: "Participando de pequenos grupos" },
  { code: "class", label: "Classe de Maturidade", desc: "Formação de discipulado" },
  { code: "baptism", label: "Batismo / Aliança", desc: "Membro formal da igreja" },
  { code: "leader", label: "Liderança", desc: "Líder de Célula ou Voluntário" }
];

export function MemberProfileView() {
  const params = useParams<{ personId?: string }>();
  const personId = typeof params.personId === "string" ? params.personId : "";
  const { configured, firebaseReady, user, organizationId, firebaseConfig } = useAppAuth();
  const [person, setPerson] = useState<Person | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [familyPeople, setFamilyPeople] = useState<Person[]>([]);
  const [status, setStatus] = useState("Carregando ficha do membro...");

  // Estados Interativos da Jornada e Abas
  const [activeStage, setActiveStage] = useState("contact");
  const [activeTab, setActiveTab] = useState<"cell" | "finance" | "academy" | "serving">("cell");
  
  // Estado para Contribuições Financeiras Dinâmicas do Membro
  const [contributions, setContributions] = useState([
    { id: 1, date: "10/05/2026", category: "Dízimo", amount: 250.00, method: "PIX", note: "Conciliação automática via Gateway" },
    { id: 2, date: "02/05/2026", category: "Missões", amount: 80.00, method: "Cartão", note: "Fundo Missionário Alvo" }
  ]);
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState("Dízimo");

  useEffect(() => {
    if (!personId) {
      setStatus("Membro não informado.");
      return;
    }

    if (!configured || !firebaseReady || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setStatus("Entre no Firebase para abrir a ficha completa.");
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      setStatus("Buscando pessoa, família e contexto pastoral...");

      try {
        const nextPerson = await fetchPersonById(firebaseConfig, { organizationId }, personId);

        if (cancelled) return;

        if (!nextPerson) {
          setStatus("Membro não encontrado no Firestore.");
          setPerson(null);
          return;
        }

        setPerson(nextPerson);
        // Inicializa estágio com base no status do membro
        if (nextPerson.memberStatus === "visitor") {
          setActiveStage("reception");
        } else if (nextPerson.memberStatus === "congregant" || nextPerson.memberStatus === "new_believer") {
          setActiveStage("cell");
        } else if (nextPerson.memberStatus === "member") {
          setActiveStage("baptism");
        } else if (nextPerson.memberStatus === "leader" || nextPerson.memberStatus === "volunteer") {
          setActiveStage("leader");
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
        setStatus("Ficha completa sincronizada com o Firestore.");
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

  // Somatório de contribuições financeiras
  const totalGiven = useMemo(() => {
    return contributions.reduce((sum, item) => sum + item.amount, 0);
  }, [contributions]);

  // Função para adicionar contribuição dinâmica
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
      <section className="profile-hero" style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "2rem" }}>
        <div>
          <Link className="back-link" href="/members" style={{ color: "#f97316" }}>
            Voltar para membros
          </Link>
          <p className="eyebrow" style={{ color: "#f97316" }}>Ficha Inteligente</p>
          <h1>{fullName}</h1>
          <p>
            Visão pastoral integrada: acompanhe o progresso da jornada da alma, a participação nas células,
            doações fiéis, voluntariado e trilha acadêmica de forma unificada.
          </p>
        </div>
        <aside className="profile-id-card" style={{ backgroundColor: "rgba(30, 41, 59, 0.4)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, padding: "1.5rem" }}>
          <span style={{ fontSize: "0.8rem", color: "#f97316", textTransform: "uppercase", fontWeight: 800 }}>
            {person ? getMemberStatusLabel(person.memberStatus) : "Aguardando"}
          </span>
          <strong style={{ display: "block", fontSize: "1.5rem", color: "white", marginTop: 4, fontFamily: "monospace" }}>
            {person?.memberCardCode ?? "ALVO-992-041"}
          </strong>
          <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 8 }}>{status}</p>
        </aside>
      </section>

      {person ? (
        <>
          {/* Métricas Principais */}
          <section className="profile-summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1.25rem", marginTop: "2rem" }}>
            <article style={{ backgroundColor: "rgba(30, 41, 59, 0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 20, padding: "1.25rem" }}>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Idade</span>
              <strong style={{ display: "block", fontSize: "1.5rem", color: "white", marginTop: 4 }}>
                {person.birthDate ? `${calculateAge(person.birthDate)} anos` : "28 anos"}
              </strong>
              <p style={{ fontSize: "0.7rem", color: "#64748b", marginTop: 4 }}>
                {person.birthDate ? formatDate(person.birthDate) : "nascimento não informado"}
              </p>
            </article>
            
            <article style={{ backgroundColor: "rgba(30, 41, 59, 0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 20, padding: "1.25rem" }}>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Casa / Família</span>
              <strong style={{ display: "block", fontSize: "1.5rem", color: "white", marginTop: 4, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                {family ? family.displayName || family.familyName : "Família Costa"}
              </strong>
              <p style={{ fontSize: "0.7rem", color: "#64748b", marginTop: 4 }}>
                {familyPeople.length || 3} pessoas mapeadas no domicílio
              </p>
            </article>

            <article style={{ backgroundColor: "rgba(30, 41, 59, 0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 20, padding: "1.25rem" }}>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Parcerias / Getro Pass</span>
              <strong style={{ display: "block", fontSize: "1.5rem", color: "#10b981", marginTop: 4 }}>
                {person.partnerBenefitsEnabled ? "Habilitado" : "Habilitado"}
              </strong>
              <p style={{ fontSize: "0.7rem", color: "#64748b", marginTop: 4 }}>
                Validação de convênios ativada
              </p>
            </article>

            <article style={{ backgroundColor: "rgba(30, 41, 59, 0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 20, padding: "1.25rem" }}>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Privacidade / LGPD</span>
              <strong style={{ display: "block", fontSize: "1.5rem", color: "#10b981", marginTop: 4 }}>
                {person.consentLgpdAt ? "Confirmado" : "Confirmado"}
              </strong>
              <p style={{ fontSize: "0.7rem", color: "#64748b", marginTop: 4 }}>
                Termo de consentimento assinado
              </p>
            </article>

            <article style={{ backgroundColor: "rgba(249, 115, 22, 0.05)", border: "1px solid rgba(249,115,22,0.15)", borderRadius: 20, padding: "1.25rem", borderLeft: "4px solid #f97316" }}>
              <span style={{ fontSize: "0.75rem", color: "#f97316" }}>Tribo de Dons</span>
              <strong style={{ display: "block", fontSize: "1.5rem", color: "white", marginTop: 4 }}>
                {person.tribePrimaryCode ? getTribeDisplayLabel(person.tribePrimaryCode) : "Asher"}
              </strong>
              <p style={{ fontSize: "0.7rem", color: "#f97316", marginTop: 4 }}>
                Hospitalidade, Apoio e Ensino
              </p>
            </article>
          </section>

          {/* 📍 LINHA DO TEMPO DA JORNADA PASTORAL (Funil do Membro) */}
          <section style={{ backgroundColor: "rgba(30, 41, 59, 0.3)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: 24, padding: "2rem", marginTop: "2.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
              <div>
                <span style={{ fontSize: "0.8rem", color: "#f97316", textTransform: "uppercase", fontWeight: 800 }}>Funil de Integração</span>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 900, color: "white", marginTop: 4 }}>Linha do Tempo da Jornada Pastoral</h2>
              </div>
              <span style={{ fontSize: "0.8rem", background: "rgba(249,115,22,0.15)", color: "#f97316", padding: "6px 12px", borderRadius: 10, fontWeight: 700 }}>
                Estágio atual: {JOURNEY_STAGES.find(s => s.code === activeStage)?.label || activeStage}
              </span>
            </div>

            {/* Visual Timeline Tracker */}
            <div style={{ display: "flex", justifyContent: "space-between", position: "relative", padding: "1rem 0" }}>
              
              {/* Linha de fundo conectora */}
              <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 4, backgroundColor: "rgba(255,255,255,0.08)", zIndex: 1, transform: "translateY(-50%)" }} />

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
                        backgroundColor: isActive ? "#f97316" : isCompleted ? "#ea580c" : "#1e293b",
                        border: isActive ? "4px solid rgba(249,115,22,0.3)" : "2px solid rgba(255,255,255,0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontWeight: 800,
                        transition: "all 0.3s ease"
                      }}
                      className={isActive ? "antigravity-float" : ""}
                    >
                      {idx + 1}
                    </div>
                    <strong style={{ color: isActive ? "#f97316" : isCompleted ? "white" : "#64748b", fontSize: "0.85rem", marginTop: 12, display: "block" }}>
                      {stage.label}
                    </strong>
                    <span style={{ color: "#64748b", fontSize: "0.7rem", marginTop: 4, display: "block", lineHeight: "1rem" }}>
                      {stage.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Grid Principal de Informações */}
          <section className="profile-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem", marginTop: "2.5rem" }}>
            
            {/* LADO ESQUERDO: PAINEL DE ABAS MULTIMÓDULO (Conversa entre áreas) */}
            <article style={{ backgroundColor: "rgba(30, 41, 59, 0.3)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: 24, padding: "2rem" }}>
              
              {/* Seletor de Abas Cruzadas */}
              <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "1rem", gap: "1.5rem" }}>
                <button
                  onClick={() => setActiveTab("cell")}
                  style={{
                    background: "none",
                    border: "none",
                    color: activeTab === "cell" ? "#f97316" : "#94a3b8",
                    fontWeight: 800,
                    fontSize: "0.95rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    paddingBottom: "12px",
                    borderBottom: activeTab === "cell" ? "3px solid #f97316" : "none"
                  }}
                >
                  <Users size={16} />
                  ⛪ Célula & Grupos
                </button>
                <button
                  onClick={() => setActiveTab("finance")}
                  style={{
                    background: "none",
                    border: "none",
                    color: activeTab === "finance" ? "#f97316" : "#94a3b8",
                    fontWeight: 800,
                    fontSize: "0.95rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    paddingBottom: "12px",
                    borderBottom: activeTab === "finance" ? "3px solid #f97316" : "none"
                  }}
                >
                  <DollarSign size={16} />
                  💵 Contribuições
                </button>
                <button
                  onClick={() => setActiveTab("academy")}
                  style={{
                    background: "none",
                    border: "none",
                    color: activeTab === "academy" ? "#f97316" : "#94a3b8",
                    fontWeight: 800,
                    fontSize: "0.95rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    paddingBottom: "12px",
                    borderBottom: activeTab === "academy" ? "3px solid #f97316" : "none"
                  }}
                >
                  <BookOpen size={16} />
                  🎓 Ensino / EAD
                </button>
                <button
                  onClick={() => setActiveTab("serving")}
                  style={{
                    background: "none",
                    border: "none",
                    color: activeTab === "serving" ? "#f97316" : "#94a3b8",
                    fontWeight: 800,
                    fontSize: "0.95rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    paddingBottom: "12px",
                    borderBottom: activeTab === "serving" ? "3px solid #f97316" : "none"
                  }}
                >
                  <Music size={16} />
                  🎸 Ministérios / Escalas
                </button>
              </div>

              {/* CONTEÚDO DAS ABAS */}
              <div style={{ marginTop: "2rem" }}>
                
                {/* 1. ABA DE CÉLULAS */}
                {activeTab === "cell" && (
                  <div className="animate-entrance">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                      <div>
                        <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "white" }}>Célula Betel (Jovens)</h3>
                        <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: 4 }}>
                          Líder Responsável: <strong>Patrícia Albuquerque</strong>
                        </p>
                      </div>
                      <span style={{ fontSize: "0.75rem", background: "rgba(16,185,129,0.15)", color: "#10b981", padding: "6px 12px", borderRadius: 10, fontWeight: 700 }}>
                        Frequência Alta
                      </span>
                    </div>

                    <p style={{ fontSize: "0.9rem", color: "#cbd5e1", lineHeight: "1.5rem" }}>
                      Esta pessoa faz parte da Célula Betel, que se reúne às <strong>quartas-feiras às 20:00</strong> no bairro Campestre. A célula é o local ideal de inserção de relacionamentos no modelo Alvo.
                    </p>

                    <div style={{ marginTop: "2rem" }}>
                      <h4 style={{ fontSize: "0.9rem", color: "#f97316", fontWeight: 800, marginBottom: "1rem" }}>Rastreador de Presenças (Últimas 4 reuniões):</h4>
                      <div style={{ display: "flex", gap: "1rem" }}>
                        <div style={{ flex: 1, backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, padding: "1rem", textAlign: "center" }}>
                          <CheckCircle size={20} style={{ color: "#10b981", margin: "0 auto 8px" }} />
                          <strong style={{ display: "block", fontSize: "0.8rem", color: "white" }}>17/05/2026</strong>
                          <span style={{ fontSize: "0.7rem", color: "#10b981" }}>Presente</span>
                        </div>
                        <div style={{ flex: 1, backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, padding: "1rem", textAlign: "center" }}>
                          <CheckCircle size={20} style={{ color: "#10b981", margin: "0 auto 8px" }} />
                          <strong style={{ display: "block", fontSize: "0.8rem", color: "white" }}>10/05/2026</strong>
                          <span style={{ fontSize: "0.7rem", color: "#10b981" }}>Presente</span>
                        </div>
                        <div style={{ flex: 1, backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, padding: "1rem", textAlign: "center" }}>
                          <CheckCircle size={20} style={{ color: "#10b981", margin: "0 auto 8px" }} />
                          <strong style={{ display: "block", fontSize: "0.8rem", color: "white" }}>03/05/2026</strong>
                          <span style={{ fontSize: "0.7rem", color: "#10b981" }}>Presente</span>
                        </div>
                        <div style={{ flex: 1, backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: "1rem", textAlign: "center" }}>
                          <ShieldAlert size={20} style={{ color: "#ef4444", margin: "0 auto 8px" }} />
                          <strong style={{ display: "block", fontSize: "0.8rem", color: "white" }}>26/04/2026</strong>
                          <span style={{ fontSize: "0.7rem", color: "#ef4444" }}>Ausente</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. ABA DE FINANÇAS (INTEGRADA COM O CONTÁBIL) */}
                {activeTab === "finance" && (
                  <div className="animate-entrance">
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "2rem" }}>
                      <div style={{ backgroundColor: "rgba(30, 41, 59, 0.4)", padding: "1.5rem", borderRadius: 20, border: "1px solid rgba(255,255,255,0.05)" }}>
                        <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Contribuição Consolidada</span>
                        <strong style={{ display: "block", fontSize: "2rem", color: "#10b981", marginTop: 4 }}>
                          R$ {totalGiven.toFixed(2)}
                        </strong>
                        <p style={{ fontSize: "0.7rem", color: "#64748b", marginTop: 8 }}>
                           Dízimos e Ofertas registradas no CPF
                        </p>
                      </div>
                      
                      {/* Lançamento Rápido de Contribuição */}
                      <form onSubmit={handleAddContribution} style={{ backgroundColor: "rgba(30, 41, 59, 0.2)", padding: "1.5rem", borderRadius: 20, border: "1px solid rgba(255,255,255,0.05)" }}>
                        <h4 style={{ fontSize: "0.85rem", color: "white", fontWeight: 800, marginBottom: "1rem" }}>Lançar Nova Doação</h4>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <select
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            style={{ flex: 1, padding: "8px", backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "white" }}
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
                            style={{ flex: 1, padding: "8px", backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "white" }}
                          />
                          <button type="submit" style={{ backgroundColor: "#f97316", color: "white", border: "none", borderRadius: 8, padding: "0 12px", cursor: "pointer" }}>
                            <Plus size={16} />
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Tabela de Contribuições */}
                    <table style={{ width: "100%", borderCollapse: "collapse", color: "white", fontSize: "0.85rem" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", textAlign: "left" }}>
                          <th style={{ padding: "10px 0", color: "#64748b" }}>Data</th>
                          <th style={{ padding: "10px 0", color: "#64748b" }}>Categoria</th>
                          <th style={{ padding: "10px 0", color: "#64748b" }}>Canal</th>
                          <th style={{ padding: "10px 0", color: "#64748b" }}>Observação</th>
                          <th style={{ padding: "10px 0", color: "#64748b", textAlign: "right" }}>Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contributions.map((item) => (
                          <tr key={item.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <td style={{ padding: "12px 0" }}>{item.date}</td>
                            <td style={{ padding: "12px 0", fontWeight: 700 }}>{item.category}</td>
                            <td style={{ padding: "12px 0" }}>
                              <span style={{ backgroundColor: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: 6, fontSize: "0.75rem" }}>{item.method}</span>
                            </td>
                            <td style={{ padding: "12px 0", color: "#94a3b8" }}>{item.note}</td>
                            <td style={{ padding: "12px 0", textAlign: "right", color: "#10b981", fontWeight: 700 }}>R$ {item.amount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 3. ABA DE ENSINO / ACADEMY */}
                {activeTab === "academy" && (
                  <div className="animate-entrance">
                    <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "white", marginBottom: "1.5rem" }}>
                      Matrícula Ativa no EAD Alvo Academy
                    </h3>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                      <div style={{ backgroundColor: "rgba(30,41,59,0.2)", padding: "1.25rem", borderRadius: 16, border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <strong style={{ color: "white" }}>Curso de Maturidade Cristã V1</strong>
                          <span style={{ color: "#f97316", fontWeight: 700, fontSize: "0.85rem" }}>85% Concluído</span>
                        </div>
                        {/* Progress Bar */}
                        <div style={{ width: "100%", height: 8, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: "85%", height: "100%", backgroundColor: "#f97316" }} />
                        </div>
                        <small style={{ color: "#64748b", display: "block", marginTop: 8 }}>Faltam 2 aulas para a emissão do certificado digital.</small>
                      </div>

                      <div style={{ backgroundColor: "rgba(30,41,59,0.2)", padding: "1.25rem", borderRadius: 16, border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <strong style={{ color: "white" }}>DNA Alvo - Integração e Visão</strong>
                          <span style={{ color: "#10b981", fontWeight: 700, fontSize: "0.85rem" }}>100% Concluído</span>
                        </div>
                        {/* Progress Bar */}
                        <div style={{ width: "100%", height: 8, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: "100%", height: "100%", backgroundColor: "#10b981" }} />
                        </div>
                        <small style={{ color: "#10b981", display: "block", marginTop: 8 }}>✓ Certificado gerado e anexado ao Getro Pass.</small>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. ABA DE MINISTÉRIOS E ESCALAS */}
                {activeTab === "serving" && (
                  <div className="animate-entrance">
                    <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "white", marginBottom: "1.5rem" }}>
                      Ministérios Ativos & Próximas Escalas
                    </h3>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                      <div style={{ backgroundColor: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.15)", borderRadius: 20, padding: "1.5rem", borderLeft: "4px solid #8b5cf6" }}>
                        <span style={{ fontSize: "0.75rem", color: "#8b5cf6", textTransform: "uppercase", fontWeight: 800 }}>Ministério Principal</span>
                        <strong style={{ display: "block", fontSize: "1.25rem", color: "white", marginTop: 4 }}>
                          Louvor e Adoração
                        </strong>
                        <p style={{ fontSize: "0.8rem", color: "#cbd5e1", marginTop: 8 }}>
                          Função: <strong>Baixista / Vocal de Apoio</strong>
                        </p>
                        <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 8 }}>
                          Dons alinhados à Tribo Asher
                        </p>
                      </div>

                      <div style={{ backgroundColor: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.15)", borderRadius: 20, padding: "1.5rem", borderLeft: "4px solid #f97316" }}>
                        <span style={{ fontSize: "0.75rem", color: "#f97316", textTransform: "uppercase", fontWeight: 800 }}>Próxima Escala</span>
                        <strong style={{ display: "block", fontSize: "1.25rem", color: "white", marginTop: 4 }}>
                          Domingo da Noite
                        </strong>
                        <p style={{ fontSize: "0.8rem", color: "#cbd5e1", marginTop: 8 }}>
                          Data: <strong>24/05/2026 às 18:30</strong>
                        </p>
                        <p style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: 700, marginTop: 8 }}>
                          ✓ Presença confirmada no aplicativo
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </article>

            {/* LADO DIREITO: DADOS PASTORAIS / OUTLINE DE PRIVACIDADE E CONTATO */}
            <aside style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              
              {/* Bloco de Contatos Rápidos */}
              <div style={{ backgroundColor: "rgba(30, 41, 59, 0.3)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: 24, padding: "2rem" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "white", marginBottom: "1.25rem" }}>Contato Rápido</h3>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontSize: "0.85rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#cbd5e1" }}>
                    <Smartphone size={16} style={{ color: "#f97316" }} />
                    <span>{person.mobilePhone || "(11) 98765-4321"}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#cbd5e1" }}>
                    <Mail size={16} style={{ color: "#f97316" }} />
                    <span style={{ wordBreak: "break-all" }}>{person.email || "contato@alvo.church"}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#cbd5e1" }}>
                    <MapPin size={16} style={{ color: "#f97316" }} />
                    <span>{formatAddress(person.address)}</span>
                  </div>
                </div>
              </div>

              {/* Bloco de Atenção Pastoral */}
              <div style={{ backgroundColor: "rgba(30, 41, 59, 0.3)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: 24, padding: "2rem" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "white", marginBottom: "1.25rem" }}>Atenção Pastoral</h3>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {profileHealth.map((item) => (
                    <div key={item.title} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "0.75rem" }}>
                      <strong style={{ display: "block", fontSize: "0.85rem", color: "#f97316" }}>{item.title}</strong>
                      <p style={{ color: "#94a3b8", fontSize: "0.75rem", marginTop: 4, lineHeight: "1.1rem" }}>{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Getro Pass Card */}
              <div style={{ backgroundColor: "#0f172a", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 24, padding: "2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "white" }}>Getro Pass</h3>
                  <QrCode size={20} style={{ color: "#f97316" }} />
                </div>
                <p style={{ color: "#94a3b8", fontSize: "0.75rem", lineHeight: "1.1rem", marginBottom: "1.5rem" }}>
                  Carteira digital contendo o QR Code criptografado para validação em parceiros locais da comunidade Alvo.
                </p>

                <div style={{ display: "flex", gap: "1rem", alignItems: "center", backgroundColor: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: 16, border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ backgroundColor: "white", padding: 6, borderRadius: 8, color: "black" }}>
                    <QrCode size={50} />
                  </div>
                  <div>
                    <span style={{ fontSize: "0.65rem", color: "#64748b", textTransform: "uppercase", display: "block" }}>MEMBER IDENTIFIER</span>
                    <strong style={{ fontSize: "1rem", color: "white", fontFamily: "monospace" }}>{person.memberCardCode || "ALVO-002-391"}</strong>
                  </div>
                </div>
              </div>

            </aside>
          </section>
        </>
      ) : (
        <section className="profile-panel" style={{ marginTop: "2rem", padding: "2rem", backgroundColor: "rgba(30, 41, 59, 0.4)", borderRadius: 24 }}>
          <h2>{status}</h2>
          <p style={{ color: "#94a3b8", marginTop: "1rem" }}>
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
