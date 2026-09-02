"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  ChevronRight,
  KeyRound,
  LogOut,
  Mail,
  Settings,
  Shield,
  User,
  Heart,
  TrendingUp,
  Calendar,
  Receipt,
  Loader2,
} from "lucide-react";
import { useAppAuth } from "../../../app/providers";
import {
  createFirebaseWebRuntimeConfigFromEnv,
  fetchMemberContributions,
  isFirebaseWebRuntimeConfigured,
} from "@alvo/firebase";
import type { MemberContribution, ContributionType } from "@alvo/types";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  church_admin: "Administrador",
  pastor: "Pastor",
  group_leader: "Líder de célula",
  staff: "Equipe",
  member: "Membro",
};

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  super_admin: { bg: "#FAECE7", text: "#712B13" },
  church_admin: { bg: "#EEEDFE", text: "#3C3489" },
  pastor: { bg: "#E1F5EE", text: "#085041" },
  group_leader: { bg: "#FAEEDA", text: "#633806" },
  staff: { bg: "#F1EFE8", text: "#444441" },
  member: { bg: "#F1EFE8", text: "#444441" },
};

const TYPE_LABELS: Record<ContributionType, string> = {
  dizimo: "Dízimo",
  oferta: "Oferta",
  campanha: "Campanha",
  missao: "Missões",
  outro: "Outro",
};

const TYPE_COLORS: Record<ContributionType, { bg: string; text: string }> = {
  dizimo: { bg: "#E1F5EE", text: "#085041" },
  oferta: { bg: "#EEEDFE", text: "#3C3489" },
  campanha: { bg: "#FAEEDA", text: "#633806" },
  missao: { bg: "#FAE8FF", text: "#6B21A8" },
  outro: { bg: "#F1EFE8", text: "#444441" },
};

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function MemberProfileView() {
  const { user, organizationId, tenantRuntime, signOut } = useAppAuth();
  const router = useRouter();

  const orgName =
    tenantRuntime?.organization?.displayName ??
    tenantRuntime?.organization?.name ??
    organizationId;
  const role = (user as any)?.role as string | undefined;
  const roleKey = role ?? "church_admin";
  const roleLabel = ROLE_LABELS[roleKey] ?? roleKey;
  const roleColor = ROLE_COLORS[roleKey] ?? ROLE_COLORS.church_admin;

  const emailName = (user?.email ?? "?").split("@")[0];
  const initials = emailName.slice(0, 2).toUpperCase();

  // Contributions
  const [contributions, setContributions] = useState<MemberContribution[]>([]);
  const [loadingContribs, setLoadingContribs] = useState(false);

  useEffect(() => {
    if (!user?.uid || !organizationId) return;
    const config = createFirebaseWebRuntimeConfigFromEnv(process.env);
    if (!isFirebaseWebRuntimeConfigured(config)) return;

    setLoadingContribs(true);
    fetchMemberContributions(config, { organizationId }, user.uid)
      .then(setContributions)
      .catch(() => {}) // silent on permission/missing collection
      .finally(() => setLoadingContribs(false));
  }, [user?.uid, organizationId]);

  // Computed stats
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisYear = String(now.getFullYear());

  const totalMonth = contributions
    .filter((c) => c.date.startsWith(thisMonth))
    .reduce((s, c) => s + c.amount, 0);

  const totalYear = contributions
    .filter((c) => c.date.startsWith(thisYear))
    .reduce((s, c) => s + c.amount, 0);

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <div style={{ padding: "2rem 1.5rem", maxWidth: 680, margin: "0 auto" }}>
      {/* Hero card */}
      <div
        style={{
          background: "linear-gradient(135deg, #7F77DD 0%, #534AB7 100%)",
          borderRadius: 16,
          padding: "2rem",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 20,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -40,
            top: -40,
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.07)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 40,
            bottom: -60,
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
          }}
        />

        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            fontWeight: 500,
            color: "#fff",
            flexShrink: 0,
            border: "2px solid rgba(255,255,255,0.3)",
          }}
        >
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <p
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.7)",
              margin: "0 0 4px",
            }}
          >
            Conta de administrador
          </p>
          <p
            style={{
              fontSize: 20,
              fontWeight: 500,
              color: "#fff",
              margin: "0 0 8px",
            }}
          >
            {user?.email ?? "—"}
          </p>
          <span
            style={{
              fontSize: 12,
              padding: "4px 12px",
              borderRadius: 20,
              background: "rgba(255,255,255,0.2)",
              color: "#fff",
              fontWeight: 500,
            }}
          >
            {roleLabel}
          </span>
        </div>
      </div>

      {/* Info cards grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 16,
        }}
      >
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

      {/* ── Contributions section ── */}
      <div
        style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: 12,
          overflow: "hidden",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "0.5px solid var(--color-border-tertiary)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Heart size={16} color="#534AB7" />
          <span
            style={{
              fontWeight: 600,
              fontSize: 15,
              color: "var(--color-text-primary)",
            }}
          >
            Minhas Contribuições
          </span>
        </div>

        {loadingContribs ? (
          <div
            style={{
              padding: "32px",
              display: "flex",
              justifyContent: "center",
              color: "var(--color-text-secondary)",
            }}
          >
            <Loader2 size={20} className="spin" />
          </div>
        ) : contributions.length === 0 ? (
          <div style={{ padding: "32px 20px", textAlign: "center" }}>
            <Receipt
              size={32}
              strokeWidth={1.3}
              style={{ color: "var(--color-text-secondary)", marginBottom: 8 }}
            />
            <p
              style={{
                fontSize: 14,
                color: "var(--color-text-secondary)",
                margin: "0 0 4px",
              }}
            >
              Nenhuma contribuição registrada ainda.
            </p>
            <p
              style={{
                fontSize: 12,
                color: "var(--color-text-secondary)",
                margin: 0,
                opacity: 0.7,
              }}
            >
              Seus dízimos e ofertas aparecerão aqui quando registrados.
            </p>
          </div>
        ) : (
          <>
            {/* Summary mini cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 1,
                background: "var(--color-border-tertiary)",
              }}
            >
              <SummaryMini
                icon={<Calendar size={14} />}
                label="Este mês"
                value={formatBRL(totalMonth)}
              />
              <SummaryMini
                icon={<TrendingUp size={14} />}
                label="Este ano"
                value={formatBRL(totalYear)}
              />
              <SummaryMini
                icon={<Heart size={14} />}
                label="Total geral"
                value={contributions.length + " reg."}
              />
            </div>

            {/* List */}
            <div style={{ maxHeight: 340, overflowY: "auto" }}>
              {contributions.map((c) => {
                const tc = TYPE_COLORS[c.type] ?? TYPE_COLORS.outro;
                return (
                  <div
                    key={c.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 20px",
                      borderBottom: "0.5px solid var(--color-border-tertiary)",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 2,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "var(--color-text-primary)",
                          }}
                        >
                          {formatBRL(c.amount)}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: tc.bg,
                            color: tc.text,
                          }}
                        >
                          {TYPE_LABELS[c.type]}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--color-text-secondary)",
                          margin: 0,
                        }}
                      >
                        {formatDate(c.date)}
                        {c.culto ? ` · ${c.culto}` : ""}
                        {c.description ? ` · ${c.description}` : ""}
                      </p>
                    </div>
                    {c.receiptNumber && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--color-text-secondary)",
                          fontFamily: "monospace",
                        }}
                      >
                        #{c.receiptNumber}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div
        style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
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

      <p
        style={{
          fontSize: 12,
          color: "var(--color-text-secondary)",
          textAlign: "center",
          marginTop: "1.5rem",
        }}
      >
        Plataforma Esdras · {orgName ?? organizationId}
      </p>
    </div>
  );
}

function SummaryMini({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: "12px 16px",
        background: "var(--color-background-primary)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          color: "var(--color-text-secondary)",
          fontSize: 11,
        }}
      >
        {icon} {label}
      </div>
      <span
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: "var(--color-text-primary)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
  bg,
  mono,
  small,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg: string;
  mono?: boolean;
  small?: boolean;
  badge?: { bg: string; text: string; label: string };
}) {
  return (
    <div
      style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: 12,
        padding: "1rem 1.25rem",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        {icon}
      </div>
      <p
        style={{
          fontSize: 12,
          color: "var(--color-text-secondary)",
          margin: "0 0 4px",
        }}
      >
        {label}
      </p>
      {badge ? (
        <span
          style={{
            fontSize: 12,
            padding: "3px 10px",
            borderRadius: 6,
            background: badge.bg,
            color: badge.text,
            fontWeight: 500,
          }}
        >
          {badge.label}
        </span>
      ) : (
        <p
          style={{
            fontSize: small ? 13 : 14,
            fontWeight: 500,
            margin: 0,
            fontFamily: mono ? "var(--font-mono)" : undefined,
            wordBreak: "break-all",
            color: "var(--color-text-primary)",
          }}
        >
          {value}
        </p>
      )}
    </div>
  );
}

function ActionRow({
  icon,
  label,
  sub,
  onClick,
  danger,
  divider,
}: {
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
      style={{
        width: "100%",
        borderTop: divider
          ? "0.5px solid var(--color-border-tertiary)"
          : undefined,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        background: "none",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: danger ? "#FCEBEB" : "var(--color-background-secondary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: danger ? "#A32D2D" : "var(--color-text-secondary)",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p
          style={{
            fontSize: 14,
            fontWeight: 500,
            margin: "0 0 2px",
            color: danger ? "#A32D2D" : "var(--color-text-primary)",
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontSize: 12,
            color: danger ? "#E24B4A" : "var(--color-text-secondary)",
            margin: 0,
          }}
        >
          {sub}
        </p>
      </div>
      <ChevronRight
        size={16}
        color={danger ? "#E24B4A" : "var(--color-text-secondary)"}
      />
    </button>
  );
}
