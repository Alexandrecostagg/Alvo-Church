"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { planHasModule, planModuleDefaults } from "@alvo/firebase/src/plans";
import {
  COMPANY_FIELDS,
  emptyCompanyProfile,
  type CompanyProfile,
} from "../../lib/platform-organization";
import type { PlatformOrganizationDetail } from "../../../app/api/_lib/platform-organization-admin";

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
  ai: "Sabedoria Pastoral",
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

type Detail = PlatformOrganizationDetail;

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
    signal: AbortSignal.timeout(30_000),
  }).catch(() => {
    throw new Error(
      "Não foi possível confirmar a operação. Confira a conexão e use Atualizar dados antes de tentar novamente.",
    );
  });
  const data = await response.json().catch(() => {
    throw new Error(
      "A resposta não pôde ser carregada. Atualize a ficha antes de tentar novamente.",
    );
  });
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
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const busyRef = useRef(false);
  const [companyDraft, setCompanyDraft] =
    useState<CompanyProfile>(emptyCompanyProfile);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [feedbackAction, setFeedbackAction] = useState("");
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
      setCompanyDraft(next.company);
      return true;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível carregar a instituição.",
      );
      return false;
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
    setFeedbackAction(action);
    setSuccess("");
    if (busyRef.current && !confirmOverLimit) return;
    if (!reasonReady) {
      setError(
        "Informe um motivo com pelo menos 8 caracteres para registrar na auditoria.",
      );
      reasonRef.current?.focus();
      reasonRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }
    busyRef.current = true;
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
      setReason("");
      const refreshed = await load();
      setSuccess(
        refreshed
          ? label
          : `${label} Não foi possível atualizar a ficha; clique em Atualizar dados.`,
      );
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
      busyRef.current = false;
      setSaving("");
    }
  }

  async function loadMoreUsers() {
    if (!detail?.usersPage.nextCursor || loadingUsers) return;
    setLoadingUsers(true);
    try {
      const page = await platformRequest(user, {
        action: "users",
        organizationId,
        cursor: detail.usersPage.nextCursor,
      });
      setDetail((current) =>
        current
          ? {
              ...current,
              users: [
                ...current.users,
                ...page.users.filter(
                  (row: Detail["users"][number]) =>
                    !current.users.some((old) => old.id === row.id),
                ),
              ],
              usersPage: page.usersPage,
              authWarning: page.authWarning || current.authWarning,
            }
          : current,
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar mais usuários.",
      );
    } finally {
      setLoadingUsers(false);
    }
  }
  const resultFor = (action: string) =>
    feedbackAction === action ? (
      saving ? (
        <p role="status">Salvando com auditoria…</p>
      ) : error ? (
        <Notice error>{error}</Notice>
      ) : success ? (
        <Notice>{success}</Notice>
      ) : null
    ) : null;

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
      {detail.authWarning && <Notice error>{detail.authWarning}</Notice>}
      <button
        type="button"
        style={secondaryButton}
        disabled={!!saving || loading}
        onClick={() => void load()}
      >
        {loading ? "Atualizando…" : "Atualizar dados"}
      </button>
      <EditorCard
        title="Dados da instituição e responsável"
        description="Informações cadastradas pela instituição. Campos sem registro aparecem como não informado."
      >
        <div style={gridStyle}>
          <ReadValue
            label="E-mail de cadastro / responsável"
            value={detail.organization.registrationEmail}
          />
          <ReadValue label="Responsável" value={detail.owner.displayName} />
          <ReadValue
            label="E-mail atual do responsável"
            value={detail.owner.email}
          />
          <ReadValue
            label="Telefone do responsável"
            value={detail.owner.phone}
          />
          <ReadValue label="UID do responsável" value={detail.owner.id} />
          <ReadValue
            label="Cadastro da instituição"
            value={formatDate(detail.organization.createdAt)}
          />
          <ReadValue
            label="Criação da conta responsável"
            value={formatDate(detail.owner.createdAt)}
          />
          <ReadValue
            label="Última atualização cadastral"
            value={formatDate(detail.organization.updatedAt)}
          />
          <ReadValue
            label="Tipo de instituição"
            value={detail.organization.organizationType}
          />
          <ReadValue
            label="País / idioma / fuso"
            value={[
              detail.organization.countryCode,
              detail.organization.locale,
              detail.organization.timezone,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
        </div>
        <p style={muted}>
          Em cadastros antigos sem e-mail original registrado, exibimos o e-mail
          disponível do responsável. A ficha cadastral não altera a conta de
          login.
        </p>
      </EditorCard>
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
          Motivo obrigatório para qualquer alteração (mínimo de 8 caracteres)
          <textarea
            ref={reasonRef}
            aria-invalid={Boolean(error && !reasonReady)}
            value={reason}
            disabled={!!saving}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ex.: solicitação do responsável em 08/09/2026"
            maxLength={500}
            style={{ ...inputStyle, minHeight: 66, resize: "vertical" }}
          />
        </label>
        <p style={{ ...muted, marginTop: 6 }}>
          O motivo, autor, alvo, estado anterior e novo estado ficam na
          auditoria. Preencha o motivo antes de salvar cada alteração.
        </p>
      </div>

      <EditorCard
        title="Dados empresariais e endereço"
        description="Complete ou corrija as informações fiscais e de contato da instituição."
      >
        <div style={gridStyle}>
          {COMPANY_FIELDS.map(([key, label, maxLength]) => (
            <Field key={key} label={label}>
              <input
                style={inputStyle}
                type={
                  key === "contactEmail"
                    ? "email"
                    : key === "website"
                      ? "url"
                      : "text"
                }
                value={companyDraft[key]}
                maxLength={maxLength}
                placeholder="Não informado"
                disabled={!!saving}
                onChange={(event) =>
                  setCompanyDraft((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }))
                }
              />
            </Field>
          ))}
        </div>
        <button
          style={primaryButton}
          disabled={!!saving}
          onClick={() =>
            void mutate(
              "updateOrganization",
              { ...orgDraft, ...companyDraft },
              "Dados da instituição atualizados.",
            )
          }
        >
          {saving === "updateOrganization" ? (
            <Loader2 size={15} className="spin" />
          ) : (
            <Save size={15} />
          )}{" "}
          {saving === "updateOrganization"
            ? "Salvando dados…"
            : "Salvar dados da instituição"}
        </button>
        {resultFor("updateOrganization")}
      </EditorCard>
      <div style={gridStyle}>
        <EditorCard
          title="Cadastro e situação"
          description="Suspender ou inativar bloqueia a operação da instituição, mantendo os dados."
        >
          <Field label="Nome de exibição">
            <input
              style={inputStyle}
              value={orgDraft.displayName}
              disabled={!!saving}
              onChange={(e) =>
                setOrgDraft({ ...orgDraft, displayName: e.target.value })
              }
            />
          </Field>
          <Field label="Nome público">
            <input
              style={inputStyle}
              value={orgDraft.publicName}
              disabled={!!saving}
              onChange={(e) =>
                setOrgDraft({ ...orgDraft, publicName: e.target.value })
              }
            />
          </Field>
          <Field label="Situação">
            <select
              style={inputStyle}
              value={orgDraft.status}
              disabled={!!saving}
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
            disabled={!!saving}
            onClick={() =>
              void mutate(
                "updateOrganization",
                { ...orgDraft, ...companyDraft },
                "Cadastro da instituição atualizado.",
              )
            }
          >
            {saving === "updateOrganization" ? (
              <Loader2 size={15} className="spin" />
            ) : (
              <Save size={15} />
            )}{" "}
            {saving === "updateOrganization"
              ? "Salvando cadastro…"
              : "Salvar cadastro"}
          </button>
          {resultFor("updateOrganization")}
        </EditorCard>

        <EditorCard
          title="Plano e cobrança"
          description={`Uso atual: ${detail.organization.memberCount} membros. Gratuito permanece limitado a 50.`}
        >
          <Field label="Plano">
            <select
              style={inputStyle}
              value={planDraft.plan}
              disabled={!!saving}
              onChange={(e) => {
                const plan = e.target.value as typeof planDraft.plan;
                setPlanDraft({ ...planDraft, plan });
                const defaults = planModuleDefaults(plan);
                setModuleDraft(
                  Object.fromEntries(
                    MODULES.map((module) => [module, defaults[module]]),
                  ),
                );
              }}
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
              disabled={!!saving}
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
            disabled={!!saving}
            onClick={() =>
              void mutate(
                "updatePlan",
                planDraft,
                "Plano e cobrança atualizados. As funções padrão do plano foram aplicadas.",
              )
            }
          >
            {saving === "updatePlan" ? (
              <Loader2 size={15} className="spin" />
            ) : (
              <Save size={15} />
            )}{" "}
            {saving === "updatePlan" ? "Aplicando plano…" : "Aplicar plano"}
          </button>
          <p style={muted}>
            Ao aplicar, as funções abaixo serão ajustadas ao padrão do plano
            selecionado, substituindo pausas manuais anteriores. Alterar esta
            ficha não emite cobranças.
          </p>
          {resultFor("updatePlan")}
        </EditorCard>
      </div>

      <EditorCard
        title="Funções liberadas"
        description={`Padrão de ${PLAN_LABELS[planDraft.plan]}. Funções fora do plano ficam indisponíveis. Após aplicar o plano, você pode pausar funções incluídas.`}
      >
        {planDraft.plan !== detail.subscription.plan && (
          <Notice>
            Prévia do plano selecionado. Clique em Aplicar plano para salvar
            estas funções.
          </Notice>
        )}
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
                  checked={
                    moduleDraft[module] && planHasModule(planDraft.plan, module)
                  }
                  disabled={
                    !!saving ||
                    planDraft.plan !== detail.subscription.plan ||
                    !planHasModule(planDraft.plan, module)
                  }
                  onChange={(e) =>
                    setModuleDraft({
                      ...moduleDraft,
                      [module]: e.target.checked,
                    })
                  }
                />{" "}
                {MODULE_LABELS[module]}
                {!planHasModule(planDraft.plan, module)
                  ? " · fora do plano"
                  : ""}
              </label>
            ))}
        </div>
        <button
          style={primaryButton}
          disabled={
            !!saving ||
            !moduleDraft ||
            planDraft.plan !== detail.subscription.plan
          }
          onClick={() =>
            moduleDraft &&
            void mutate(
              "updateModules",
              { modules: moduleDraft },
              "Disponibilidade dos módulos atualizada.",
            )
          }
        >
          {saving === "updateModules" ? (
            <Loader2 size={15} className="spin" />
          ) : (
            <Save size={15} />
          )}{" "}
          {saving === "updateModules" ? "Salvando funções…" : "Salvar funções"}
        </button>
        {resultFor("updateModules")}
      </EditorCard>

      <EditorCard
        title={`Usuários internos (${detail.users.length}${detail.usersPage.nextCursor ? "+" : ""})`}
        description={`${activeAdmins} administrador(es) ativo(s) nesta página. Dados de cadastro, autenticação e acesso à instituição. O último administrador ativo não pode ser bloqueado ou removido.`}
      >
        <div style={{ display: "grid", gap: 8 }}>
          {detail.users.map((account) => (
            <UserRow
              key={account.id}
              account={account}
              busy={!!saving}
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
        {detail.usersPage.nextCursor && (
          <button
            type="button"
            style={secondaryButton}
            disabled={loadingUsers || !!saving}
            onClick={() => void loadMoreUsers()}
          >
            {loadingUsers ? "Carregando usuários…" : "Carregar mais usuários"}
          </button>
        )}
        {resultFor("updateUser")}
        {resultFor("removeUser")}
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
  onUpdate,
  onRemove,
}: {
  account: Detail["users"][number];
  busy: boolean;
  onUpdate: (payload: Record<string, unknown>) => void;
  onRemove: () => void;
}) {
  const [roles, setRoles] = useState<AppRole[]>(account.roles);
  useEffect(() => setRoles(account.roles), [account.roles]);
  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        padding: 14,
        border: "1px solid var(--color-border-tertiary)",
        borderRadius: 10,
      }}
    >
      <div>
        <strong>{account.displayName || "Nome não informado"}</strong>
        <p style={muted}>{account.email || "E-mail não informado"}</p>
      </div>
      <div style={gridStyle}>
        <ReadValue label="UID" value={account.id} />
        <ReadValue label="Telefone" value={account.phone} />
        <ReadValue
          label="Acesso à instituição"
          value={account.isActive ? "Ativo" : "Bloqueado"}
        />
        <ReadValue
          label="Conta de login"
          value={
            account.authStatus === "active"
              ? "Ativa"
              : account.authStatus === "disabled"
                ? "Desativada"
                : account.authStatus === "missing"
                  ? "Não encontrada"
                  : "Consulta indisponível"
          }
        />
        <ReadValue
          label="E-mail verificado"
          value={
            account.emailVerified === null
              ? "Não disponível"
              : account.emailVerified
                ? "Sim"
                : "Não"
          }
        />
        <ReadValue
          label="Cadastro na instituição"
          value={formatDate(account.createdAt ?? "")}
        />
        <ReadValue
          label="Criação da conta"
          value={formatDate(account.authCreatedAt)}
        />
        <ReadValue
          label="Último acesso"
          value={formatDate(account.lastSignInAt)}
        />
        <ReadValue
          label="Última alteração de acesso"
          value={formatDate(account.updatedAt)}
        />
        <ReadValue label="Cadastrado por" value={account.createdBy} />
        <ReadValue label="Membro vinculado (ID)" value={account.personId} />
        <ReadValue
          label="Campi vinculados"
          value={account.campusIds.join(", ")}
        />
        <ReadValue
          label="Papéis atuais"
          value={account.roles
            .map(
              (role) =>
                ROLES.find((option) => option.value === role)?.label ?? role,
            )
            .join(", ")}
        />
      </div>
      <details>
        <summary>Editar papéis deste usuário</summary>
        <div style={{ ...gridStyle, marginTop: 10 }}>
          {ROLES.map((role) => (
            <label key={role.value} style={checkStyle}>
              <input
                type="checkbox"
                disabled={busy}
                checked={roles.includes(role.value)}
                onChange={(event) =>
                  setRoles((current) =>
                    event.target.checked
                      ? [...current, role.value]
                      : current.filter((value) => value !== role.value),
                  )
                }
              />{" "}
              {role.label}
            </label>
          ))}
        </div>
        <button
          type="button"
          style={{ ...secondaryButton, marginTop: 10 }}
          disabled={busy}
          onClick={() => onUpdate({ roles })}
        >
          Salvar papéis
        </button>
      </details>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          style={account.isActive ? dangerButton : secondaryButton}
          disabled={busy}
          onClick={() => onUpdate({ isActive: !account.isActive })}
        >
          {account.isActive ? <ShieldOff size={14} /> : <UserCheck size={14} />}
          {account.isActive
            ? "Bloquear acesso à instituição"
            : "Ativar acesso à instituição"}
        </button>
        {!account.linked && (
          <button
            title="Remover acesso sem vínculo"
            aria-label={`Remover ${account.email}`}
            style={iconDangerButton}
            disabled={busy}
            onClick={onRemove}
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

function ReadValue({ label, value }: { label: string; value: string }) {
  return (
    <dl style={{ minWidth: 0, margin: 0 }}>
      <dt style={muted}>{label}</dt>
      <dd style={{ margin: "4px 0 0", fontSize: 13, overflowWrap: "anywhere" }}>
        {value || "Não informado"}
      </dd>
    </dl>
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
  if (!value) return "";
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
