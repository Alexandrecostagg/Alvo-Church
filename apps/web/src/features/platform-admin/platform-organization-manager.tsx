"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  Loader2,
  Save,
  ShieldOff,
  Trash2,
  UserCheck,
} from "lucide-react";
import type { FirebaseAuthUser } from "@alvo/firebase";
import type { AppRole } from "@alvo/types";

const PLANS = ["free", "comunidade", "pastoral", "rede", "enterprise"] as const;
const PLAN_LABELS: Record<(typeof PLANS)[number], string> = {
  free: "Gratuito · 50 membros",
  comunidade: "Comunidade · 300 membros",
  pastoral: "Pastoral",
  rede: "Rede",
  enterprise: "Enterprise",
};
const MODULES = [
  "visitors",
  "groups",
  "events",
  "children",
  "youth",
  "volunteers",
  "tribes",
  "journeys",
  "communication",
  "marketplace",
  "giving",
  "publicForms",
  "finance",
  "ai",
] as const;
const MODULE_LABELS: Record<(typeof MODULES)[number], string> = {
  visitors: "Visitantes",
  groups: "Grupos",
  events: "Eventos",
  children: "Segurança Kids",
  youth: "Jovens",
  volunteers: "Escalas",
  tribes: "Tribos",
  journeys: "Jornadas / EAD",
  communication: "Comunicação",
  marketplace: "Marketplace",
  giving: "Doações",
  publicForms: "Formulários públicos",
  finance: "Finanças",
  ai: "IA pastoral",
};
const ROLES: { value: AppRole; label: string }[] = [
  { value: "super_admin", label: "Super Admin da igreja" },
  { value: "church_admin", label: "Administrador" },
  { value: "pastor", label: "Pastor" },
  { value: "secretary", label: "Secretaria" },
  { value: "ministry_leader", label: "Líder de ministério" },
  { value: "group_leader", label: "Líder de grupo" },
  { value: "member", label: "Membro" },
];

type Detail = {
  organization: {
    id: string;
    name: string;
    displayName: string;
    publicName: string;
    slug: string;
    status: "active" | "inactive" | "suspended";
    memberCount: number;
    ownerUid: string;
  };
  subscription: {
    plan: (typeof PLANS)[number];
    billingStatus: "active" | "overdue" | "suspended";
  };
  modules: Record<(typeof MODULES)[number], boolean>;
  users: Array<{
    id: string;
    email: string;
    roles: AppRole[];
    isActive: boolean;
    linked: boolean;
    createdAt?: string;
  }>;
  audits: Array<{
    id: string;
    action: string;
    targetId: string;
    reason: string;
    actorId: string;
    createdAt: string;
  }>;
};

async function platformRequest(
  user: FirebaseAuthUser,
  body: Record<string, unknown>,
) {
  const response = await fetch("/api/platform/organizations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${await user.getIdToken()}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Não foi possível concluir a operação.");
  return data;
}

export function PlatformOrganizationManager({
  organizationId,
  user,
  onClose,
  onChanged,
}: {
  organizationId: string;
  user: FirebaseAuthUser;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reason, setReason] = useState("");
  const [orgDraft, setOrgDraft] = useState({
    displayName: "",
    publicName: "",
    status: "active" as Detail["organization"]["status"],
  });
  const [planDraft, setPlanDraft] = useState({
    plan: "free" as Detail["subscription"]["plan"],
    billingStatus: "active" as Detail["subscription"]["billingStatus"],
  });
  const [moduleDraft, setModuleDraft] = useState<Detail["modules"] | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const next = (await platformRequest(user, {
        action: "detail",
        organizationId,
      })) as Detail;
      setDetail(next);
      setOrgDraft({
        displayName: next.organization.displayName,
        publicName: next.organization.publicName,
        status: next.organization.status,
      });
      setPlanDraft(next.subscription);
      setModuleDraft(next.modules);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível carregar a instituição.",
      );
    } finally {
      setLoading(false);
    }
  }, [organizationId, user]);

  useEffect(() => {
    void load();
  }, [load]);
  const reasonReady = reason.trim().length >= 8;

  async function mutate(
    action: string,
    payload: Record<string, unknown>,
    label: string,
    confirmOverLimit = false,
  ) {
    if (!reasonReady) {
      setError(
        "Informe um motivo com pelo menos 8 caracteres para registrar na auditoria.",
      );
      return;
    }
    setSaving(action);
    setError("");
    setSuccess("");
    try {
      await platformRequest(user, {
        action,
        organizationId,
        reason,
        ...payload,
        confirmOverLimit,
      });
      setSuccess(label);
      setReason("");
      await load();
      onChanged();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Não foi possível salvar.";
      if (
        action === "updatePlan" &&
        !confirmOverLimit &&
        message.includes("Confirme o bloqueio") &&
        window.confirm(`${message}\n\nDeseja continuar mesmo assim?`)
      ) {
        await mutate(action, payload, label, true);
        return;
      }
      setError(message);
    } finally {
      setSaving("");
    }
  }

  const activeAdmins = useMemo(
    () =>
      detail?.users.filter(
        (account) =>
          account.isActive &&
          account.roles.some(
            (role) => role === "super_admin" || role === "church_admin",
          ),
      ).length ?? 0,
    [detail],
  );

  if (loading && !detail)
    return (
      <section style={panelStyle}>
        <Loader2 className="spin" size={24} />
      </section>
    );
  if (!detail)
    return (
      <section style={panelStyle}>
        <button style={secondaryButton} onClick={onClose}>
          <ChevronLeft size={15} /> Voltar
        </button>
        <p role="alert">{error}</p>
      </section>
    );

  return (
    <section
      style={panelStyle}
      aria-label={`Gerenciar ${detail.organization.displayName}`}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div>
          <button style={linkButton} onClick={onClose}>
            <ChevronLeft size={15} /> Todas as instituições
          </button>
          <h2 style={{ margin: "8px 0 2px", fontSize: 22 }}>
            {detail.organization.displayName}
          </h2>
          <p style={muted}>
            {detail.organization.id} · /p/
            {detail.organization.slug || "sem-slug"}
          </p>
        </div>
        <StatusBadge
          active={detail.organization.status === "active"}
          label={
            detail.organization.status === "active"
              ? "Ativa"
              : detail.organization.status === "suspended"
                ? "Suspensa"
                : "Inativa"
          }
        />
      </div>

      {error && <Notice error>{error}</Notice>}
      {success && <Notice>{success}</Notice>}
      <div
        style={{
          padding: 14,
          borderRadius: 12,
          background: "#FFF7ED",
          border: "1px solid #FED7AA",
        }}
      >
        <label
          style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}
        >
          Motivo obrigatório para qualquer alteração
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ex.: solicitação do responsável em 08/09/2026"
            maxLength={500}
            style={{ ...inputStyle, minHeight: 66, resize: "vertical" }}
          />
        </label>
        <p style={{ ...muted, marginTop: 6 }}>
          O motivo, autor, alvo, estado anterior e novo estado ficam na
          auditoria.
        </p>
      </div>

      <div style={gridStyle}>
        <EditorCard
          title="Cadastro e situação"
          description="Suspender ou inativar bloqueia a operação da instituição, mantendo os dados."
        >
          <Field label="Nome de exibição">
            <input
              style={inputStyle}
              value={orgDraft.displayName}
              onChange={(e) =>
                setOrgDraft({ ...orgDraft, displayName: e.target.value })
              }
            />
          </Field>
          <Field label="Nome público">
            <input
              style={inputStyle}
              value={orgDraft.publicName}
              onChange={(e) =>
                setOrgDraft({ ...orgDraft, publicName: e.target.value })
              }
            />
          </Field>
          <Field label="Situação">
            <select
              style={inputStyle}
              value={orgDraft.status}
              onChange={(e) =>
                setOrgDraft({
                  ...orgDraft,
                  status: e.target.value as typeof orgDraft.status,
                })
              }
            >
              <option value="active">Ativa</option>
              <option value="inactive">Inativa</option>
              <option value="suspended">Suspensa</option>
            </select>
          </Field>
          <button
            style={primaryButton}
            disabled={!reasonReady || !!saving}
            onClick={() =>
              void mutate(
                "updateOrganization",
                orgDraft,
                "Cadastro da instituição atualizado.",
              )
            }
          >
            <Save size={15} /> Salvar cadastro
          </button>
        </EditorCard>

        <EditorCard
          title="Plano e cobrança"
          description={`Uso atual: ${detail.organization.memberCount} membros. Gratuito permanece limitado a 50.`}
        >
          <Field label="Plano">
            <select
              style={inputStyle}
              value={planDraft.plan}
              onChange={(e) =>
                setPlanDraft({
                  ...planDraft,
                  plan: e.target.value as typeof planDraft.plan,
                })
              }
            >
              {PLANS.map((plan) => (
                <option key={plan} value={plan}>
                  {PLAN_LABELS[plan]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cobrança">
            <select
              style={inputStyle}
              value={planDraft.billingStatus}
              onChange={(e) =>
                setPlanDraft({
                  ...planDraft,
                  billingStatus: e.target
                    .value as typeof planDraft.billingStatus,
                })
              }
            >
              <option value="active">Ativa</option>
              <option value="overdue">Em atraso</option>
              <option value="suspended">Suspensa</option>
            </select>
          </Field>
          <button
            style={primaryButton}
            disabled={!reasonReady || !!saving}
            onClick={() =>
              void mutate(
                "updatePlan",
                planDraft,
                "Plano e cobrança atualizados.",
              )
            }
          >
            <Save size={15} /> Aplicar plano
          </button>
        </EditorCard>
      </div>

      <EditorCard
        title="Funções liberadas"
        description="O plano continua sendo o teto comercial. Estes controles podem desligar módulos incluídos no plano; não liberam funções que o plano não possui."
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 8,
          }}
        >
          {moduleDraft &&
            MODULES.map((module) => (
              <label key={module} style={checkStyle}>
                <input
                  type="checkbox"
                  checked={moduleDraft[module]}
                  onChange={(e) =>
                    setModuleDraft({
                      ...moduleDraft,
                      [module]: e.target.checked,
                    })
                  }
                />{" "}
                {MODULE_LABELS[module]}
              </label>
            ))}
        </div>
        <button
          style={primaryButton}
          disabled={!reasonReady || !!saving || !moduleDraft}
          onClick={() =>
            moduleDraft &&
            void mutate(
              "updateModules",
              { modules: moduleDraft },
              "Disponibilidade dos módulos atualizada.",
            )
          }
        >
          <Save size={15} /> Salvar funções
        </button>
      </EditorCard>

      <EditorCard
        title={`Usuários (${detail.users.length})`}
        description={`${activeAdmins} administrador(es) ativo(s). O último administrador ativo nunca pode ser bloqueado ou removido.`}
      >
        <div style={{ display: "grid", gap: 8 }}>
          {detail.users.map((account) => (
            <UserRow
              key={account.id}
              account={account}
              busy={!!saving}
              reasonReady={reasonReady}
              onUpdate={(payload) =>
                void mutate(
                  "updateUser",
                  { userId: account.id, ...payload },
                  "Acesso do usuário atualizado.",
                )
              }
              onRemove={() => {
                if (
                  window.confirm(
                    `Remover o acesso de ${account.email || account.id}?`,
                  )
                )
                  void mutate(
                    "removeUser",
                    { userId: account.id },
                    "Acesso sem vínculo removido.",
                  );
              }}
            />
          ))}
          {detail.users.length === 0 && (
            <p style={muted}>Nenhum usuário cadastrado.</p>
          )}
        </div>
      </EditorCard>

      <EditorCard
        title="Auditoria recente"
        description="Últimas alterações feitas pela administração Esdras."
      >
        {detail.audits.length ? (
          <div style={{ display: "grid", gap: 8 }}>
            {detail.audits.map((entry) => (
              <div
                key={entry.id}
                style={{
                  borderTop: "1px solid var(--color-border-tertiary)",
                  paddingTop: 8,
                }}
              >
                <strong style={{ fontSize: 12 }}>
                  {auditLabel(entry.action)}
                </strong>
                <p style={{ ...muted, marginTop: 3 }}>
                  {entry.reason} · {formatDate(entry.createdAt)} · alvo{" "}
                  {entry.targetId}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p style={muted}>
            Nenhuma alteração administrativa registrada ainda.
          </p>
        )}
      </EditorCard>
      {saving && (
        <p style={{ ...muted, display: "flex", gap: 6, alignItems: "center" }}>
          <Loader2 size={14} className="spin" /> Salvando com auditoria…
        </p>
      )}
    </section>
  );
}

function UserRow({
  account,
  busy,
  reasonReady,
  onUpdate,
  onRemove,
}: {
  account: Detail["users"][number];
  busy: boolean;
  reasonReady: boolean;
  onUpdate: (payload: Record<string, unknown>) => void;
  onRemove: () => void;
}) {
  const primaryRole = account.roles[0] ?? "member";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(180px, 1fr) 190px auto",
        gap: 10,
        alignItems: "center",
        padding: 12,
        border: "1px solid var(--color-border-tertiary)",
        borderRadius: 10,
      }}
    >
      <div>
        <strong style={{ fontSize: 13 }}>
          {account.email || "Sem e-mail"}
        </strong>
        <p style={muted}>
          {account.id} · {account.linked ? "vinculado a membro" : "sem vínculo"}
        </p>
      </div>
      <select
        aria-label={`Papel de ${account.email}`}
        style={inputStyle}
        value={primaryRole}
        disabled={busy}
        onChange={(e) => onUpdate({ roles: [e.target.value] })}
      >
        {ROLES.map((role) => (
          <option key={role.value} value={role.value}>
            {role.label}
          </option>
        ))}
      </select>
      <div style={{ display: "flex", gap: 6 }}>
        <button
          style={account.isActive ? dangerButton : secondaryButton}
          disabled={!reasonReady || busy}
          onClick={() => onUpdate({ isActive: !account.isActive })}
        >
          {account.isActive ? <ShieldOff size={14} /> : <UserCheck size={14} />}
          {account.isActive ? "Bloquear" : "Ativar"}
        </button>
        {!account.linked && (
          <button
            title="Remover acesso sem vínculo"
            aria-label={`Remover ${account.email}`}
            style={iconDangerButton}
            disabled={!reasonReady || busy}
            onClick={onRemove}
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

function EditorCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div style={cardStyle}>
      <div>
        <h3 style={{ margin: 0, fontSize: 15 }}>{title}</h3>
        <p style={{ ...muted, marginTop: 4 }}>{description}</p>
      </div>
      {children}
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 700 }}>
      {label}
      {children}
    </label>
  );
}
function StatusBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      style={{
        padding: "5px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 800,
        background: active ? "#E1F5EE" : "#FCEBEB",
        color: active ? "#085041" : "#A32D2D",
      }}
    >
      {label}
    </span>
  );
}
function Notice({
  children,
  error = false,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <div
      role={error ? "alert" : "status"}
      style={{
        display: "flex",
        gap: 8,
        padding: 12,
        borderRadius: 10,
        background: error ? "#FCEBEB" : "#E1F5EE",
        color: error ? "#A32D2D" : "#085041",
        fontSize: 13,
      }}
    >
      {error ? <AlertTriangle size={16} /> : <Check size={16} />}
      {children}
    </div>
  );
}
function auditLabel(action: string) {
  return (
    (
      {
        organization_updated: "Cadastro alterado",
        plan_updated: "Plano/cobrança alterados",
        modules_updated: "Funções alteradas",
        user_access_updated: "Acesso de usuário alterado",
        user_access_removed: "Acesso removido",
      } as Record<string, string>
    )[action] ?? action
  );
}
function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("pt-BR");
}

const panelStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
  padding: 20,
  borderRadius: 14,
  background: "var(--color-background-primary)",
  border: "1px solid var(--color-border-tertiary)",
};
const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 12,
};
const cardStyle: React.CSSProperties = {
  display: "grid",
  alignContent: "start",
  gap: 12,
  padding: 16,
  borderRadius: 12,
  border: "1px solid var(--color-border-tertiary)",
  background: "var(--color-background-secondary, #fafafa)",
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 10px",
  borderRadius: 8,
  border: "1px solid var(--color-border-secondary, #d1d5db)",
  background: "var(--color-background-primary)",
  color: "var(--color-text-primary)",
  font: "inherit",
  fontSize: 13,
};
const primaryButton: React.CSSProperties = {
  justifySelf: "start",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "9px 13px",
  border: 0,
  borderRadius: 8,
  background: "#534AB7",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 12,
};
const secondaryButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "7px 10px",
  border: "1px solid var(--color-border-secondary, #d1d5db)",
  borderRadius: 8,
  background: "var(--color-background-primary)",
  color: "var(--color-text-primary)",
  cursor: "pointer",
  fontSize: 12,
};
const dangerButton: React.CSSProperties = {
  ...secondaryButton,
  color: "#A32D2D",
  borderColor: "#F5C2C2",
};
const iconDangerButton: React.CSSProperties = { ...dangerButton, padding: 8 };
const linkButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  border: 0,
  padding: 0,
  background: "transparent",
  color: "#534AB7",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
};
const checkStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  fontSize: 12,
  padding: "8px 10px",
  borderRadius: 8,
  background: "var(--color-background-primary)",
  border: "1px solid var(--color-border-tertiary)",
};
const muted: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  color: "var(--color-text-secondary)",
  overflowWrap: "anywhere",
};
