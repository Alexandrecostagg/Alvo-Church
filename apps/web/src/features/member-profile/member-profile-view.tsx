"use client";

import { useRouter } from "next/navigation";
import {
  Building2,
  KeyRound,
  LogOut,
  Mail,
  Settings,
  Shield,
  User,
} from "lucide-react";
import { useAppAuth } from "../../../app/providers";

const ROLE_LABELS: Record<string, string> = {
  owner:         "Proprietário",
  admin:         "Administrador",
  pastor:        "Pastor",
  group_leader:  "Líder de célula",
  staff:         "Equipe",
  member:        "Membro",
};

export function MemberProfileView() {
  const { user, organizationId, tenantRuntime, signOut } = useAppAuth();
  const router = useRouter();

  const orgName = tenantRuntime?.organization?.displayName ?? tenantRuntime?.organization?.name ?? organizationId;
  const role = (user as any)?.role as string | undefined;
  const roleLabel = role ? (ROLE_LABELS[role] ?? role) : "Administrador";

  const initials = (user?.email ?? "?")
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <div style={{ padding: "2rem 1.5rem", maxWidth: 640, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "2rem" }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "#7F77DD", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <User size={20} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Meu perfil</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>Conta e configurações do administrador</p>
        </div>
      </div>

      {/* Identity card */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "1.25rem", marginBottom: 12, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#EEEDFE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 500, color: "#3C3489", flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 16, fontWeight: 500, margin: "0 0 4px" }}>{user?.email ?? "—"}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, background: "#EEEDFE", color: "#3C3489", fontWeight: 500 }}>
              {roleLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Info rows */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
        <InfoRow icon={<Mail size={15} />} label="E-mail" value={user?.email ?? "—"} />
        <InfoRow icon={<Building2 size={15} />} label="Organização" value={orgName ?? "—"} divider />
        <InfoRow icon={<Shield size={15} />} label="Nível de acesso" value={roleLabel} divider />
        <InfoRow icon={<KeyRound size={15} />} label="ID do usuário" value={user?.uid ? `${user.uid.slice(0, 12)}…` : "—"} divider mono />
      </div>

      {/* Actions */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
        <ActionRow
          icon={<Settings size={15} />}
          label="Configurações da organização"
          onClick={() => router.push("/settings")}
        />
        <ActionRow
          icon={<LogOut size={15} />}
          label="Sair da conta"
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

function InfoRow({ icon, label, value, divider, mono }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  divider?: boolean;
  mono?: boolean;
}) {
  return (
    <div style={{ borderTop: divider ? "0.5px solid var(--color-border-tertiary)" : undefined, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ color: "var(--color-text-secondary)", display: "flex", flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 13, color: "var(--color-text-secondary)", minWidth: 120 }}>{label}</span>
      <span style={{ fontSize: 13, fontFamily: mono ? "var(--font-mono)" : undefined, marginLeft: "auto", color: "var(--color-text-primary)" }}>{value}</span>
    </div>
  );
}

function ActionRow({ icon, label, onClick, danger, divider }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{ width: "100%", borderTop: divider ? "0.5px solid var(--color-border-tertiary)" : undefined, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
    >
      <span style={{ color: danger ? "var(--color-text-danger)" : "var(--color-text-secondary)", display: "flex", flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 13, color: danger ? "var(--color-text-danger)" : "var(--color-text-primary)" }}>{label}</span>
    </button>
  );
}
