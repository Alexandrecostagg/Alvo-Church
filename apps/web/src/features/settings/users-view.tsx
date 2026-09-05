"use client";

import { useEffect, useState } from "react";
import { Shield, UserCircle, ChevronDown, Check } from "lucide-react";
import { AccountPersonLink } from "./account-person-link";
import { useAppAuth } from "../../../app/providers";
import type { AppRole } from "@alvo/types";

type TenantUser = {
  id: string;
  email: string;
  roles: AppRole[];
  isActive: boolean;
  createdAt?: string;
};

const ROLE_OPTIONS: { value: AppRole; label: string; color: string; bg: string }[] = [
  { value: "super_admin",   label: "Super Admin",       color: "#712B13", bg: "#FAECE7" },
  { value: "church_admin",  label: "Administrador",     color: "#3C3489", bg: "#EEEDFE" },
  { value: "pastor",        label: "Pastor",            color: "#085041", bg: "#E1F5EE" },
  { value: "secretary",     label: "Secretaria",        color: "#444441", bg: "#F1EFE8" },
  { value: "ministry_leader", label: "Líder de Ministério", color: "#633806", bg: "#FAEEDA" },
  { value: "group_leader",  label: "Líder de Célula",   color: "#633806", bg: "#FAEEDA" },
  { value: "member",        label: "Membro",            color: "#444441", bg: "#F1EFE8" },
];

function roleMeta(role: AppRole) {
  return ROLE_OPTIONS.find((r) => r.value === role) ?? { label: role, color: "#444", bg: "#eee" };
}

export function UsersView() {
  const { firebaseConfig, organizationId, tenantReady, user, refreshRoles, hasAnyRole } = useAppAuth();
  const [linkUser, setLinkUser] = useState<TenantUser | null>(null);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantReady) return;
    let cancelled = false;
    async function load() {
      const sdk = await import("@alvo/firebase");
      const list = await sdk.fetchTenantUsers(firebaseConfig, { organizationId });
      if (!cancelled) { setUsers(list); setLoading(false); }
    }
    void load().catch(() => { if (!cancelled) { setError("Não foi possível carregar os usuários."); setLoading(false); } });
    return () => { cancelled = true; };
  }, [tenantReady, firebaseConfig, organizationId]);

  async function handleRoleChange(userId: string, newRole: AppRole) {
    setSavingId(userId);
    setOpenDropdown(null);
    try {
      const sdk = await import("@alvo/firebase");
      await sdk.updateTenantUserRoles(firebaseConfig, { organizationId, userId, roles: [newRole] });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, roles: [newRole] } : u));
      // Se mudou o próprio usuário, recarrega roles na sessão imediatamente
      if (userId === user?.uid) await refreshRoles();
    } catch {
      setError("Não foi possível alterar o acesso. Atualize e tente novamente.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div style={{ padding: "2rem 1.5rem", maxWidth: 760, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, margin: "0 0 4px", color: "var(--color-text-primary)" }}>Usuários da organização</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>Gerencie os níveis de acesso de cada usuário.</p>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <div className="spinner" />
        </div>
      ) : users.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--color-text-secondary)", fontSize: 14 }}>
          Nenhum usuário encontrado.
        </div>
      ) : (
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
          {users.map((u, idx) => {
            const primaryRole = u.roles[0] ?? "member";
            const meta = roleMeta(primaryRole);
            const isSaving = savingId === u.id;
            return (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", padding: "14px 16px", borderTop: idx > 0 ? "0.5px solid var(--color-border-tertiary)" : undefined }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#EEEDFE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <UserCircle size={22} color="#534AB7" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 2px", color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</p>
                  <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: 0, fontFamily: "var(--font-mono)" }}>{u.id.slice(0, 16)}…</p>
                </div>

                {hasAnyRole(["church_admin", "super_admin"]) && <button onClick={() => setLinkUser(u)} aria-label={`Vincular cadastro de ${u.email}`}>Vincular cadastro</button>}
                {/* Role dropdown */}
                <div style={{ position: "relative" }}>
                  <button
                    disabled={isSaving}
                    onClick={() => setOpenDropdown(openDropdown === u.id ? null : u.id)}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, border: `1.5px solid ${meta.bg}`, background: meta.bg, cursor: "pointer", opacity: isSaving ? 0.5 : 1 }}
                  >
                    <Shield size={13} color={meta.color} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: meta.color }}>{meta.label}</span>
                    <ChevronDown size={13} color={meta.color} />
                  </button>

                  {openDropdown === u.id && (
                    <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 50, minWidth: 200, overflow: "hidden" }}>
                      {ROLE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => handleRoleChange(u.id, opt.value)}
                          style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                        >
                          <span style={{ width: 20, height: 20, borderRadius: 6, background: opt.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {primaryRole === opt.value && <Check size={12} color={opt.color} />}
                          </span>
                          <span style={{ fontSize: 13, color: primaryRole === opt.value ? opt.color : "var(--color-text-primary)", fontWeight: primaryRole === opt.value ? 500 : 400 }}>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && <p role="alert">{error}</p>}
      {linkUser && <AccountPersonLink key={`${organizationId}:${user?.uid}:${linkUser.id}`} userId={linkUser.id} email={linkUser.email} onClose={() => setLinkUser(null)} />}

      {/* close dropdown on outside click */}
      {openDropdown && (
        <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setOpenDropdown(null)} />
      )}
    </div>
  );
}
