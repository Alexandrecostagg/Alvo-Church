"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck, Save, Check } from "lucide-react";
import { useAppAuth } from "../../../app/providers";
import { friendlyError } from "../../lib/friendly-error";
import { fetchServiceTeams, fetchKidsSettings, saveKidsSettings, isFirebaseWebRuntimeConfigured } from "@alvo/firebase";
import type { AppRole, ServiceTeam, OrganizationKidsSettings } from "@alvo/types";

// Papéis que fazem sentido operar a sala kids. super_admin/church_admin são
// sempre implicitamente autorizados (regra do servidor), mas listamos para
// deixar explícito na UI.
const ROLE_OPTIONS: Array<{ role: AppRole; label: string }> = [
  { role: "church_admin", label: "Admin da igreja" },
  { role: "pastor", label: "Pastor" },
  { role: "secretary", label: "Secretário(a)" },
  { role: "ministry_leader", label: "Líder de ministério" },
  { role: "group_leader", label: "Líder de célula" },
  { role: "member", label: "Membro" }
];

// Default quando ainda não há config salva.
const DEFAULT_ROLES: AppRole[] = ["church_admin", "pastor", "ministry_leader"];

export function KidsSettingsView() {
  const { organizationId, firebaseConfig } = useAppAuth();
  const [teams, setTeams] = useState<ServiceTeam[]>([]);
  const [roles, setRoles] = useState<Set<AppRole>>(new Set(DEFAULT_ROLES));
  const [teamIds, setTeamIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const ready = isFirebaseWebRuntimeConfigured(firebaseConfig);

  const load = useCallback(async () => {
    if (!ready) { setLoading(false); return; }
    setLoading(true);
    try {
      const [teamList, settings] = await Promise.all([
        fetchServiceTeams(firebaseConfig, { organizationId }, 50),
        fetchKidsSettings(firebaseConfig, { organizationId })
      ]);
      setTeams(teamList as ServiceTeam[]);
      if (settings) {
        if (settings.qrGeneratorRoles?.length) setRoles(new Set(settings.qrGeneratorRoles));
        setTeamIds(new Set(settings.kidsTeamIds ?? []));
      }
    } catch (e) {
      setError(friendlyError(e, "Erro ao carregar configuração da Segurança Kids"));
    } finally {
      setLoading(false);
    }
  }, [ready, firebaseConfig, organizationId]);

  useEffect(() => { load(); }, [load]);

  function toggle<T>(set: Set<T>, value: T): Set<T> {
    const next = new Set(set);
    if (next.has(value)) next.delete(value); else next.add(value);
    return next;
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError("");
    const payload: OrganizationKidsSettings = {
      qrGeneratorRoles: Array.from(roles),
      kidsTeamIds: Array.from(teamIds)
    };
    try {
      await saveKidsSettings(firebaseConfig, { organizationId }, payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(friendlyError(e, "Erro ao salvar"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ padding: "3rem", display: "flex", justifyContent: "center", color: "var(--color-text-secondary)" }}><Loader2 size={22} className="spin" /></div>;
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <ShieldCheck size={20} color="#534AB7" />
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "var(--color-text-primary)" }}>Segurança Kids</h2>
      </div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 20px" }}>
        Defina quem pode operar o check-in por QR e quais salas do ministério infantil existem. O app usa essas regras para liberar a entrada/saída das crianças.
      </p>

      {error && <div style={{ padding: 12, borderRadius: 10, background: "#FCEBEB", color: "#A32D2D", marginBottom: 14, fontSize: 13 }}>{error}</div>}

      <section style={card}>
        <p style={sectionTitle}>Quem pode gerar/operar o QR</p>
        <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 12px" }}>Admins da igreja já são sempre autorizados.</p>
        <div style={{ display: "grid", gap: 8 }}>
          {ROLE_OPTIONS.map(({ role, label }) => (
            <label key={role} style={checkRow}>
              <input type="checkbox" checked={roles.has(role)} onChange={() => setRoles((s) => toggle(s, role))} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </section>

      <section style={card}>
        <p style={sectionTitle}>Salas do ministério infantil</p>
        <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 12px" }}>Marque quais equipes de escala representam salas kids. Voluntários escalados nessas salas operam o check-in.</p>
        {teams.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Nenhuma equipe de escala cadastrada ainda. Crie as salas em Escalas.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {teams.map((t) => (
              <label key={t.id} style={checkRow}>
                <input type="checkbox" checked={teamIds.has(t.id)} onChange={() => setTeamIds((s) => toggle(s, t.id))} />
                <span>{t.name} <span style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>({t.code})</span></span>
              </label>
            ))}
          </div>
        )}
      </section>

      <button onClick={handleSave} disabled={saving} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 10, border: "none", background: saved ? "#10b981" : "#534AB7", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
        {saving ? <Loader2 size={16} className="spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
        {saved ? "Salvo" : "Salvar configuração"}
      </button>
    </div>
  );
}

const card: React.CSSProperties = { background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "16px 18px", marginBottom: 16 };
const sectionTitle: React.CSSProperties = { fontSize: 14, fontWeight: 700, margin: "0 0 4px", color: "var(--color-text-primary)" };
const checkRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--color-text-primary)", cursor: "pointer" };
