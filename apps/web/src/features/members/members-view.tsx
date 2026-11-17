"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Family, Person } from "@alvo/types";
import { useAppAuth } from "../../../app/providers";
import { peopleRequest } from "../../lib/people-client";
import s from "./people.module.css";

export const personName = (p: Person) =>
  `${p.preferredName || p.firstName} ${p.lastName || ""}`.trim();
export const statusLabels: Record<string, string> = {
  visitor: "Visitante",
  congregant: "Congregado",
  new_believer: "Novo convertido",
  member: "Membro",
  leader: "Líder",
  volunteer: "Voluntário",
};
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
type Directory = {
  people: Person[];
  families: (Family & { peopleCount: number })[];
  totalPeople: number;
  totalFamilies: number;
  peopleCursor: string | null;
  familiesCursor: string | null;
};
const empty: Directory = {
  people: [],
  families: [],
  totalPeople: 0,
  totalFamilies: 0,
  peopleCursor: null,
  familiesCursor: null,
};
export function MembersView() {
  const { tenantReady, user, organizationId, roles } = useAppAuth();
  const allowed = roles.some((r) =>
    ["church_admin", "super_admin", "pastor", "secretary"].includes(r),
  );
  const [data, setData] = useState(empty);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [attention, setAttention] = useState("all");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [reload, setReload] = useState(0);
  const generation = useRef(0);
  const lock = useRef(false);
  useEffect(() => {
    setQuery(new URLSearchParams(window.location.search).get("q") || "");
  }, []);
  useEffect(() => {
    const version = ++generation.current;
    setData(empty);
    setLoaded(false);
    setStatus("");
    lock.current = false;
    setBusy(false);
    if (!tenantReady || !user || !allowed) return;
    setBusy(true);
    lock.current = true;
    Promise.all([
      peopleRequest(user, { organizationId, action: "people" }),
      peopleRequest(user, { organizationId, action: "families" }),
    ])
      .then(([p, f]) => {
        if (version !== generation.current) return;
        setData({
          people: p.items,
          families: f.items,
          totalPeople: p.total,
          totalFamilies: f.total,
          peopleCursor: p.nextCursor,
          familiesCursor: f.nextCursor,
        });
        setLoaded(true);
        setStatus("Base atualizada.");
      })
      .catch((e) => {
        if (version === generation.current) setStatus(e.message);
      })
      .finally(() => {
        if (version === generation.current) {
          setBusy(false);
          lock.current = false;
        }
      });
    return () => {
      generation.current++;
    };
  }, [tenantReady, user, organizationId, allowed, reload]);
  async function more(kind: "people" | "families") {
    if (!user || lock.current) return;
    const version = generation.current;
    lock.current = true;
    setBusy(true);
    try {
      const result = await peopleRequest(user, {
        organizationId,
        action: kind,
        cursor: kind === "people" ? data.peopleCursor : data.familiesCursor,
      });
      if (version !== generation.current) return;
      setData((old) =>
        kind === "people"
          ? {
              ...old,
              people: [
                ...new Map(
                  [...old.people, ...result.items].map((p) => [p.id, p]),
                ).values(),
              ],
              peopleCursor: result.nextCursor,
              totalPeople: result.total,
            }
          : {
              ...old,
              families: [
                ...new Map(
                  [...old.families, ...result.items].map((f) => [f.id, f]),
                ).values(),
              ],
              familiesCursor: result.nextCursor,
              totalFamilies: result.total,
            },
      );
      setStatus("Mais registros carregados.");
    } catch (e) {
      if (version === generation.current)
        setStatus(
          e instanceof Error ? e.message : "Não foi possível carregar.",
        );
    } finally {
      if (version === generation.current) {
        setBusy(false);
        lock.current = false;
      }
    }
  }
  const rows = data.people.filter(
    (p) =>
      normalize(
        `${personName(p)} ${p.email || ""} ${p.mobilePhone || ""} ${p.whatsappPhone || ""} ${p.cpf || ""}`,
      ).includes(normalize(query)) &&
      (filter === "all" || p.memberStatus === filter) &&
      (attention === "all" ||
        (attention === "family" && !p.primaryFamilyId) ||
        (attention === "contact" &&
          !p.mobilePhone &&
          !p.whatsappPhone &&
          !p.email) ||
        (attention === "pass" && p.partnerBenefitsEnabled)),
  );
  return (
    <main className={s.page}>
      <Link href="/app">Voltar ao painel</Link>
      <h1>Pessoas e famílias</h1>
      <p>
        Cadastros da igreja para acompanhamento pastoral, integração e contato.
      </p>
      {!tenantReady ? (
        <p role="status">Verificando acesso…</p>
      ) : !allowed ? (
        <section className={s.card}>
          <h2>Acesso à base completa restrito</h2>
          <p>
            A secretaria e os pastores consultam estes dados. Líderes acompanham
            as pessoas das suas células no painel de liderança.
          </p>
          <Link href="/app">Abrir meu painel</Link> ·{" "}
          <Link href="/me">Meu perfil</Link>
        </section>
      ) : (
        <>
          <div className={s.actions}>
            <Link className={s.action} href="/members/new">
              Cadastrar pessoa
            </Link>
            <Link className={s.action} href="/reception">
              Receber visitante
            </Link>
            <button disabled={busy} onClick={() => setReload((v) => v + 1)}>
              Atualizar
            </button>
          </div>
          <p className={s.status} role="status">
            {busy ? "Carregando cadastros…" : status}
          </p>
          {loaded && (
            <>
              <section className={s.metrics}>
                <article className={s.card}>
                  Pessoas cadastradas<strong>{data.totalPeople}</strong>
                </article>
                <article className={s.card}>
                  Famílias cadastradas<strong>{data.totalFamilies}</strong>
                </article>
                <article className={s.card}>
                  Sem família nesta consulta
                  <strong>
                    {data.people.filter((p) => !p.primaryFamilyId).length}
                  </strong>
                </article>
                <article className={s.card}>
                  Sem contato nesta consulta
                  <strong>
                    {
                      data.people.filter(
                        (p) => !p.mobilePhone && !p.whatsappPhone && !p.email,
                      ).length
                    }
                  </strong>
                </article>
              </section>
              {data.peopleCursor && (
                <p className={s.notice}>
                  Exibindo {data.people.length} de {data.totalPeople} pessoas.
                  Os filtros e alertas usam os registros carregados. Carregue
                  mais para ampliar a busca.
                </p>
              )}
              <div className={s.grid}>
                <section className={s.card}>
                  <h2>Buscar pessoa</h2>
                  <div className={s.filters}>
                    <label>
                      Nome, e-mail, CPF ou telefone
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    <label>
                      Situação pastoral
                      <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      >
                        <option value="all">Todas</option>
                        {Object.entries(statusLabels).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Atenção
                      <select
                        value={attention}
                        onChange={(e) => setAttention(e.target.value)}
                      >
                        <option value="all">Todas as pessoas</option>
                        <option value="family">Sem família</option>
                        <option value="contact">Sem contato</option>
                        <option value="pass">Esdras Passe habilitado</option>
                      </select>
                    </label>
                  </div>
                  <p>
                    {rows.length} resultado(s) nos {data.people.length}{" "}
                    registros carregados.
                  </p>
                  <div className={`${s.list} ${s.directoryList}`}>
                    {rows.map((p) => (
                      <Link
                        className={s.row}
                        href={`/members/${p.id}`}
                        key={p.id}
                      >
                        <span>
                          <strong>{personName(p)}</strong>
                          <small>
                            {statusLabels[p.memberStatus] || p.memberStatus} ·{" "}
                            {p.status === "active"
                              ? "Cadastro ativo"
                              : "Cadastro inativo"}
                            {!p.primaryFamilyId ? " · Sem família" : ""}
                          </small>
                        </span>
                        <span>Abrir ficha →</span>
                      </Link>
                    ))}
                  </div>
                  {!rows.length && (
                    <p>
                      {data.totalPeople
                        ? "Nenhum resultado nesta consulta. Ajuste os filtros ou carregue mais registros."
                        : "Nenhuma pessoa cadastrada."}
                    </p>
                  )}
                  {data.peopleCursor && (
                    <button disabled={busy} onClick={() => void more("people")}>
                      Carregar mais pessoas
                    </button>
                  )}
                </section>
                <section className={s.card}>
                  <h2>Famílias</h2>
                  <p>
                    {data.families.length} de {data.totalFamilies} famílias. Os
                    vínculos são consultados na base da igreja.
                  </p>
                  <div className={`${s.list} ${s.directoryList}`}>
                    {data.families.map((f) => (
                      <article className={s.row} key={f.id}>
                        <span>
                          <strong>{f.displayName || f.familyName}</strong>
                          <small>{f.peopleCount} pessoa(s) vinculada(s)</small>
                        </span>
                      </article>
                    ))}
                  </div>
                  {!data.families.length && <p>Nenhuma família cadastrada.</p>}
                  {data.familiesCursor && (
                    <button
                      disabled={busy}
                      onClick={() => void more("families")}
                    >
                      Carregar mais famílias
                    </button>
                  )}
                </section>
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}
