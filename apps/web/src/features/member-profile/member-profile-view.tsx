"use client";

import { useRouter } from "next/navigation";
import {
  Building2, ChevronRight, KeyRound, LogOut, Mail, Settings, Shield, User,
} from "lucide-react";
import { useAppAuth } from "../../../app/providers";

const ROLE_LABELS: Record<string, string> = {
  super_admin:   "Super Admin",
  church_admin:  "Administrador",
  pastor:        "Pastor",
  group_leader:  "Líder de célula",
  staff:         "Equipe",
  member:        "Membro",
};

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  super_admin:  { bg: "#FAECE7", text: "#712B13" },
  church_admin: { bg: "#EEEDFE", text: "#3C3489" },
  pastor:       { bg: "#E1F5EE", text: "#085041" },
  group_leader: { bg: "#FAEEDA", text: "#633806" },
  staff:        { bg: "#F1EFE8", text: "#444441" },
  member:       { bg: "#F1EFE8", text: "#444441" },
};

export function MemberProfileView() {
  const { user, organizationId, tenantRuntime, signOut } = useAppAuth();
  const router = useRouter();

  const orgName = tenantRuntime?.organization?.displayName ?? tenantRuntime?.organization?.name ?? organizationId;
  const role = (user as any)?.role as string | undefined;
  const roleKey = role ?? "church_admin";
  const roleLabel = ROLE_LABELS[roleKey] ?? roleKey;
  const roleColor = ROLE_COLORS[roleKey] ?? ROLE_COLORS.church_admin;

  const emailName = (user?.email ?? "?").split("@")[0];
  const initials = emailName.slice(0, 2).toUpperCase();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <div style={{ padding: "2rem 1.5rem", maxWidth: 680, margin: "0 auto" }}>

      {/* Hero card */}
      <div style={{
        background: "linear-gradient(135deg, #7F77DD 0%, #534AB7 100%)",
        borderRadius: 16,
        padding: "2rem",
        marginBottom: 16,
        display: "flex",
        alignItems: "center",
        gap: 20,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* decorative circle */}
        <div style={{ position: "absolute", right: -40, top: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
        <div style={{ position: "absolute", right: 40, bottom: -60, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />

        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 500, color: "#fff", flexShrink: 0, border: "2px solid rgba(255,255,255,0.3)" }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", margin: "0 0 4px" }}>Conta de administrador</p>
          <p style={{ fontSize: 20, fontWeight: 500, color: "#fff", margin: "0 0 8px" }}>{user?.email ?? "—"}</p>
          <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: "rgba(255,255,255,0.2)", color: "#fff", fontWeight: 500 }}>
            {roleLabel}
          </span>
        </div>
      </div>

      {/* Info cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <InfoCard
          icon={<Building2 size={18} color="#534AB7" />}
          label="Organização"
          value={orgName ?? "—"}
          bg="#EEEDFE"
        />
        <InfoCard
          icon={<Shield size={18} color="#0F6E56" />}
          label="Nível de acesso"
          value={roleLabel}
          bg="#E1F5EE"
          badge={{ bg: roleColor.bg, text: roleColor.text, label: roleLabel }}
        />
        <InfoCard
          icon={<Mail size={18} color="#854F0B" />}
          label="E-mail"
          value={user?.email ?? "—"}
          bg="#FAEEDA"
          small
        />
        <InfoCard
          icon={<KeyRound size={18} color="#5F5E5A" />}
          label="ID do usuário"
          value={user?.uid ? user.uid.slice(0, 14) + "…" : "—"}
          bg="#F1EFE8"
          mono
          small
        />
      </div>

      {/* Actions */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
        <ActionRow
          icon={<Settings size={16} />}
          label="Configurações da organização"
          sub="Módulos, marca, assinatura"
          onClick={() => router.push("/settings")}
        />
        <ActionRow
          icon={<LogOut size={16} />}
          label="Sair da conta"
          sub="Encerrar sessão atual"
          onClick={handleSignOut}
          danger
          divider
        />
      </div>

      <p style={{ fontSize: 12, color: "var(--color-text-secondary)", textAlign: "center", marginTop: "1.5rem" }}>
        Getro Growth · {orgName ?? organizationId}
      </p>
    </div>
  );
}

function InfoCard({ icon, label, value, bg, mono, small, badge }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg: string;
  mono?: boolean;
  small?: boolean;
  badge?: { bg: string; text: string; label: string };
}) {
  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "1rem 1.25rem" }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
        {icon}
      </div>
      <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 4px" }}>{label}</p>
      {badge ? (
        <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 6, background: badge.bg, color: badge.text, fontWeight: 500 }}>{badge.label}</span>
      ) : (
        <p style={{ fontSize: small ? 13 : 14, fontWeight: 500, margin: 0, fontFamily: mono ? "var(--font-mono)" : undefined, wordBreak: "break-all", color: "var(--color-text-primary)" }}>{value}</p>
      )}
    </div>
  );
}

function ActionRow({ icon, label, sub, onClick, danger, divider }: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{ width: "100%", borderTop: divider ? "0.5px solid var(--color-border-tertiary)" : undefined, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, background: danger ? "#FCEBEB" : "var(--color-background-secondary)", display: "flex", alignItems: "center", justifyContent: "center", color: danger ? "#A32D2D" : "var(--color-text-secondary)", flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 2px", color: danger ? "#A32D2D" : "var(--color-text-primary)" }}>{label}</p>
        <p style={{ fontSize: 12, color: danger ? "#E24B4A" : "var(--color-text-secondary)", margin: 0 }}>{sub}</p>
      </div>
      <ChevronRight size={16} color={danger ? "#E24B4A" : "var(--color-text-secondary)"} />
    </button>
  );
}
