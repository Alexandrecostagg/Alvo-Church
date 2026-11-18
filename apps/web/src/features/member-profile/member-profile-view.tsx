"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ACCOUNT_ROLE_LABELS,
  PROFILE_INTERESTS,
  PROFILE_SERVING,
  PROFILE_DAYS,
  PROFILE_EDUCATION,
  PROFILE_INCOME,
  type OwnProfileFields,
  GIVING_STATUS,
} from "@alvo/domain";
import { useAppAuth } from "../../../app/providers";
import s from "../members/people.module.css";
import styles from "./profile.module.css";
type Profile = {
  name: string;
  organizationName: string;
  roles: string[];
  personId: string | null;
  linked: boolean;
  revision: number;
  profile: OwnProfileFields;
  contributions: Array<{
    id: string;
    amount: number;
    type: string;
    date: string;
    status: string;
  }> | null;
  contributionsTruncated: boolean;
  contributionsNotice: string;
};
const formatMoney = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const categories: Record<string, string> = {
  dizimo: "Dízimo",
  oferta: "Oferta",
  campanha: "Campanha",
  missao: "Missões",
  outro: "Outro",
};
export function MemberProfileView() {
  const { user, organizationId, tenantReady, signOut } = useAppAuth();
  const router = useRouter();
  const [data, setData] = useState<Profile | null>(null);
  const [fields, setFields] = useState<OwnProfileFields | null>(null);
  const [loading, setLoading] = useState(false),
    [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(""),
    [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const generation = useRef(0),
    lock = useRef(false);
  async function request(body: Record<string, unknown>) {
    if (!user) throw Error("Entre na sua conta.");
    const response = await fetch("/api/members/profile", {
      method: "POST",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${await user.getIdToken()}`,
      },
      body: JSON.stringify({ ...body, organizationId }),
    });
    const result = await response.json();
    if (!response.ok)
      throw Error(result.error || "Não foi possível atualizar o perfil.");
    return result;
  }
  useEffect(() => {
    const version = ++generation.current;
    setData(null);
    setFields(null);
    setError("");
    setStatus("");
    setSaving(false);
    lock.current = false;
    if (!tenantReady || !user) return;
    setLoading(true);
    void request({ action: "read" })
      .then((result: Profile) => {
        if (generation.current === version) {
          setData(result);
          setFields(result.profile);
        }
      })
      .catch((e) => {
        if (generation.current === version) setError(e.message);
      })
      .finally(() => {
        if (generation.current === version) setLoading(false);
      });
    return () => {
      generation.current++;
    };
  }, [user, organizationId, tenantReady, revision]);
  function field<K extends keyof OwnProfileFields>(
    key: K,
    value: OwnProfileFields[K],
  ) {
    setFields((old) => (old ? { ...old, [key]: value } : old));
    setStatus("");
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!data || !fields || lock.current) return;
    lock.current = true;
    setSaving(true);
    setStatus("");
    setError("");
    const version = generation.current;
    try {
      const result = await request({
        action: "save",
        fields,
        expectedRevision: data.revision,
        expectedPersonId: data.personId,
      });
      if (version === generation.current) {
        setData((old) =>
          old
            ? { ...old, revision: result.revision, profile: result.profile }
            : old,
        );
        setFields(result.profile);
        setStatus(
          data.linked
            ? "Perfil salvo e atualizado no cadastro da igreja."
            : "Perfil salvo na sua conta. O vínculo com Pessoas ainda precisa ser confirmado.",
        );
      }
    } catch (e) {
      if (version === generation.current)
        setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      if (version === generation.current) {
        lock.current = false;
        setSaving(false);
      }
    }
  }
  async function logout() {
    if (lock.current) return;
    lock.current = true;
    setSaving(true);
    try {
      await signOut();
      router.push("/login");
    } catch {
      setError("Não foi possível sair. Tente novamente.");
      lock.current = false;
      setSaving(false);
    }
  }
  const total =
    data?.contributions
      ?.filter((c) => c.status === "confirmed")
      .reduce((n, c) => n + c.amount, 0) || 0;
  return (
    <main className={s.page} style={{ maxWidth: 1100 }}>
      <h1>Meu Perfil</h1>
      <p>Sua conta, seus interesses e suas contribuições na igreja.</p>
      <div className={s.actions}>
        <button
          disabled={saving || loading}
          onClick={() => setRevision((v) => v + 1)}
        >
          Atualizar perfil
        </button>
        <Link href="/app">Meu painel</Link>
      </div>
      {(loading || !tenantReady) && <p role="status">Carregando seu perfil…</p>}
      {error && (
        <p role="alert" className={s.notice}>
          {error}
        </p>
      )}
      <p role="status">{saving ? "Salvando…" : status}</p>
      {data && fields && (
        <>
          <section className={styles.hero}>
            <div className={styles.avatar} aria-hidden="true">
              {data.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2>{data.name}</h2>
              <p>{user?.email}</p>
              <p>
                {data.roles
                  .map((r) => ACCOUNT_ROLE_LABELS[r] || r)
                  .join(" · ") || "Sem função atribuída"}
              </p>
            </div>
          </section>
          <section className={s.metrics}>
            <article className={s.card}>
              Instituição<strong>{data.organizationName}</strong>
            </article>
            <article className={s.card}>
              Vínculo com Pessoas
              <strong>{data.linked ? "Confirmado" : "Pendente"}</strong>
              <p>
                {data.linked
                  ? "O app e a liderança consultam o mesmo cadastro."
                  : "Peça à administração para vincular sua conta ao cadastro existente. Não é necessário criar outra pessoa."}
              </p>
            </article>
          </section>
          <div className={s.grid}>
            <section className={s.card}>
              <h2>Meu perfil ministerial</h2>
              <p>
                Informe seus interesses e disponibilidade. Essas respostas
                ajudam a liderança a acompanhar sua participação.
              </p>
              <form onSubmit={save}>
                <fieldset className={styles.fields} disabled={saving}>
                  <label>
                    Profissão ou ocupação
                    <input
                      maxLength={120}
                      value={fields.occupation}
                      onChange={(e) => field("occupation", e.target.value)}
                    />
                  </label>
                  <label>
                    Escolaridade
                    <select
                      value={fields.educationLevel}
                      onChange={(e) => field("educationLevel", e.target.value)}
                    >
                      {Object.entries(PROFILE_EDUCATION).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Renda familiar (opcional)
                    <select
                      value={fields.householdIncomeRange}
                      onChange={(e) =>
                        field("householdIncomeRange", e.target.value)
                      }
                    >
                      {Object.entries(PROFILE_INCOME).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <fieldset className={styles.choices}>
                    <legend>Áreas de interesse</legend>
                    {Object.entries(PROFILE_INTERESTS).map(([k, v]) => (
                      <label key={k}>
                        <input
                          type="checkbox"
                          checked={fields.ministerialInterests.includes(k)}
                          onChange={(e) =>
                            field(
                              "ministerialInterests",
                              e.target.checked
                                ? [...fields.ministerialInterests, k]
                                : fields.ministerialInterests.filter(
                                    (i) => i !== k,
                                  ),
                            )
                          }
                        />
                        {v}
                      </label>
                    ))}
                  </fieldset>
                  <label>
                    Como prefere servir?
                    <select
                      value={fields.servingProfile}
                      onChange={(e) => field("servingProfile", e.target.value)}
                    >
                      <option value="">Ainda não definido</option>
                      {Object.entries(PROFILE_SERVING).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <fieldset className={styles.choices}>
                    <legend>Disponibilidade semanal</legend>
                    {Object.entries(PROFILE_DAYS).map(([k, v]) => (
                      <label key={k}>
                        <input
                          type="checkbox"
                          checked={fields.availability.includes(k)}
                          onChange={(e) =>
                            field(
                              "availability",
                              e.target.checked
                                ? [...fields.availability, k]
                                : fields.availability.filter((i) => i !== k),
                            )
                          }
                        />
                        {v}
                      </label>
                    ))}
                  </fieldset>
                  <button type="submit" disabled={saving}>
                    {saving ? "Salvando…" : "Salvar perfil"}
                  </button>
                  {(status || error) && (
                    <p className={s.notice}>{error || status}</p>
                  )}
                </fieldset>
              </form>
            </section>
            <aside className={s.list} style={{ alignContent: "start" }}>
              <section className={s.card}>
                <h2>Minhas contribuições</h2>
                {data.contributions === null ? (
                  <p role="status">
                    {data.contributionsNotice ||
                      "Não foi possível consultar as contribuições. Tente atualizar."}
                  </p>
                ) : (
                  <>
                    <p>
                      <strong>{formatMoney(total)}</strong> confirmados nos
                      registros exibidos.
                    </p>
                    {data.contributionsTruncated && (
                      <p className={s.notice}>
                        Exibindo até 200 contribuições recentes. Este valor não
                        representa todo o histórico.
                      </p>
                    )}
                    <p>Valores pendentes aguardam conferência da igreja.</p>
                    {!data.contributions.length ? (
                      <p>
                        Nenhuma contribuição encontrada para sua conta
                        {data.linked
                          ? " ou cadastro vinculado"
                          : ". Contribuições registradas no cadastro pessoal aparecerão após confirmar o vínculo"}
                        .
                      </p>
                    ) : (
                      <div className={`${s.list} ${s.directoryList}`}>
                        {data.contributions.map((c) => (
                          <article className={s.row} key={c.id}>
                            <span>
                              <strong>
                                {formatMoney(c.amount)} ·{" "}
                                {categories[c.type] || c.type}
                              </strong>
                              <small>
                                {c.date} ·{" "}
                                {GIVING_STATUS[c.status] ||
                                  "Sem confirmação registrada"}
                              </small>
                            </span>
                          </article>
                        ))}
                      </div>
                    )}
                  </>
                )}
                <div className={s.actions}>
                  <Link href="/giving">Consultar Doações</Link>
                </div>
              </section>
              <section className={s.card}>
                <h2>Minha conta</h2>
                <div className={s.list}>
                  {data.roles.some((r) =>
                    [
                      "church_admin",
                      "super_admin",
                      "pastor",
                      "secretary",
                    ].includes(r),
                  ) && (
                    <Link href="/settings">Configurações da organização</Link>
                  )}
                  <Link href="/privacy">Privacidade</Link>
                  <Link href="/account-deletion">
                    Solicitar exclusão da conta
                  </Link>
                  <button disabled={saving} onClick={() => void logout()}>
                    Sair da conta
                  </button>
                </div>
              </section>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
