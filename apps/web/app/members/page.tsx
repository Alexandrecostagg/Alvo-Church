"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  createFirebaseWebRuntimeConfigFromEnv,
  fetchFamilies,
  fetchPeople,
  isFirebaseWebRuntimeConfigured
} from "@alvo/firebase";
import type { Family, Person } from "@alvo/types";
import { useAppAuth } from "../providers";

const organizationId = "org_alvo_demo";

export default function MembersDirectoryPage() {
  const { configured, firebaseReady, user } = useAppAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [status, setStatus] = useState("Entre no painel para consultar a base real.");
  const [query, setQuery] = useState(() => getInitialQuery());
  const [memberStatusFilter, setMemberStatusFilter] = useState("all");
  const [passFilter, setPassFilter] = useState("all");
  const deferredQuery = useDeferredValue(query);

  const firebaseConfig = useMemo(
    () =>
      createFirebaseWebRuntimeConfigFromEnv({
        NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
          process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
          process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
          process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
      }),
    []
  );

  useEffect(() => {
    if (!configured || !firebaseReady || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      return;
    }

    let cancelled = false;

    async function loadMembers() {
      setStatus("Carregando membros e familias do Firestore...");

      try {
        const [nextPeople, nextFamilies] = await Promise.all([
          fetchPeople(firebaseConfig, { organizationId }, 40),
          fetchFamilies(firebaseConfig, { organizationId }, 20)
        ]);

        if (cancelled) {
          return;
        }

        setPeople(nextPeople);
        setFamilies(nextFamilies);
        setStatus(
          `${nextPeople.length} pessoa(s) e ${nextFamilies.length} familia(s) sincronizadas.`
        );
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : "Nao foi possivel carregar membros.");
        }
      }
    }

    void loadMembers();

    return () => {
      cancelled = true;
    };
  }, [configured, firebaseConfig, firebaseReady, user]);

  const members = people.filter((person) =>
    ["member", "leader", "volunteer"].includes(person.memberStatus)
  );
  const visitors = people.filter((person) => person.memberStatus === "visitor");
  const getroPassEnabled = people.filter((person) => person.partnerBenefitsEnabled);
  const ungroupedPeople = people.filter((person) => !person.primaryFamilyId);
  const peopleWithProtectedData = people.filter(
    (person) => person.cpf || person.birthDate || person.householdIncomeRange
  );
  const filteredPeople = people.filter((person) => {
    const normalizedQuery = normalizeSearch(deferredQuery);
    const matchesQuery = normalizedQuery
      ? normalizeSearch(
          `${getFullName(person)} ${person.email ?? ""} ${person.mobilePhone ?? ""} ${
            person.whatsappPhone ?? ""
          } ${person.cpf ?? ""} ${formatAddress(person.address)}`
        ).includes(normalizedQuery)
      : true;
    const matchesStatus =
      memberStatusFilter === "all" || person.memberStatus === memberStatusFilter;
    const matchesPass =
      passFilter === "all" ||
      (passFilter === "enabled" && person.partnerBenefitsEnabled) ||
      (passFilter === "disabled" && !person.partnerBenefitsEnabled);

    return matchesQuery && matchesStatus && matchesPass;
  });
  const directoryFlowSteps = [
    {
      label: "01",
      title: "Cadastrar pessoa",
      detail: "Comece pelo membro, visitante ou aspirante com dados essenciais.",
      href: "/members/new"
    },
    {
      label: "02",
      title: "Vincular familia",
      detail: "Organize casa, responsaveis, renda declarada e endereco protegido.",
      href: "/members/new"
    },
    {
      label: "03",
      title: "Ativar cuidado",
      detail: "Use status pastoral para alimentar jornadas, grupos e comunicacao.",
      href: "/#journeys"
    },
    {
      label: "04",
      title: "Liberar Getro Pass",
      detail: "Habilite beneficios externos sem expor CPF, renda ou historico pastoral.",
      href: "/members/new"
    }
  ];

  return (
    <main className="form-page directory-page">
      <section className="form-hero">
        <Link className="back-link" href="/">
          Voltar ao painel
        </Link>
        <p className="eyebrow">Base pastoral</p>
        <h1>Membros, familias e aspirantes</h1>
        <p>
          Visao operacional para lideres acompanharem pessoas, casas, visitantes em
          transicao e elegibilidade para Getro Pass.
        </p>
        <div className="directory-actions">
          <Link className="primary-button" href="/members/new">
            Cadastrar membro
          </Link>
          <Link className="ghost-button" href="/#reception">
            Capturar visitante
          </Link>
          <span className="form-status">{status}</span>
        </div>
      </section>

      <section className="member-command-center">
        <article className="member-flow-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Fluxo recomendado</p>
              <h2>Da ficha ao cuidado pastoral</h2>
            </div>
            <span className="soft-pill">4 passos</span>
          </div>
          <div className="member-flow-lane">
            {directoryFlowSteps.map((step) => (
              <Link className="member-flow-step" href={step.href} key={step.label}>
                <span>{step.label}</span>
                <strong>{step.title}</strong>
                <p>{step.detail}</p>
              </Link>
            ))}
          </div>
        </article>

        <aside className="member-segment-card">
          <p className="eyebrow">Atenção rápida</p>
          <h2>Segmentos que pedem cuidado</h2>
          <div className="segment-list">
            <div>
              <span>Sem familia</span>
              <strong>{ungroupedPeople.length}</strong>
              <p>pessoas sem grupo familiar vinculado</p>
            </div>
            <div>
              <span>Dados protegidos</span>
              <strong>{peopleWithProtectedData.length}</strong>
              <p>perfis com CPF, renda ou nascimento</p>
            </div>
            <div>
              <span>Pass externo</span>
              <strong>{getroPassEnabled.length}</strong>
              <p>podem se identificar em parceiros</p>
            </div>
          </div>
        </aside>
      </section>

      <section className="directory-metrics">
        <article>
          <span>Pessoas</span>
          <strong>{people.length}</strong>
          <p>{members.length} membro(s) ativo(s)</p>
        </article>
        <article>
          <span>Familias</span>
          <strong>{families.length}</strong>
          <p>casas mapeadas no tenant</p>
        </article>
        <article>
          <span>Aspirantes</span>
          <strong>{visitors.length}</strong>
          <p>visitantes em transicao</p>
        </article>
        <article>
          <span>Getro Pass</span>
          <strong>{getroPassEnabled.length}</strong>
          <p>pessoas habilitadas</p>
        </article>
      </section>

      <section className="directory-grid">
        <article className="directory-panel span-2">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Pessoas</p>
              <h2>Cadastro sensivel</h2>
            </div>
            <span className="soft-pill">
              {filteredPeople.length} de {people.length}
            </span>
          </div>
          <div className="directory-toolbar" aria-label="Filtros da base de membros">
            <label>
              Buscar
              <input
                aria-label="Buscar membro"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nome, CPF, telefone, bairro..."
                value={query}
              />
            </label>
            <label>
              Status
              <select
                aria-label="Filtrar por status"
                onChange={(event) => setMemberStatusFilter(event.target.value)}
                value={memberStatusFilter}
              >
                <option value="all">Todos</option>
                <option value="visitor">Visitantes</option>
                <option value="congregant">Congregados</option>
                <option value="new_believer">Novos convertidos</option>
                <option value="member">Membros</option>
                <option value="leader">Lideres</option>
                <option value="volunteer">Voluntarios</option>
              </select>
            </label>
            <label>
              Getro Pass
              <select
                aria-label="Filtrar por Getro Pass"
                onChange={(event) => setPassFilter(event.target.value)}
                value={passFilter}
              >
                <option value="all">Todos</option>
                <option value="enabled">Habilitados</option>
                <option value="disabled">Nao habilitados</option>
              </select>
            </label>
          </div>
          <div className="directory-list">
            {filteredPeople.length ? (
              filteredPeople.map((person) => (
                <Link key={person.id} className="directory-row" href={`/members/${person.id}`}>
                  <div className="avatar">{getInitials(getFullName(person))}</div>
                  <div>
                    <strong>{getFullName(person)}</strong>
                    <p>
                      {getMemberStatusLabel(person.memberStatus)} - {person.birthDate ? `${calculateAge(person.birthDate)} anos` : "idade nao informada"}
                    </p>
                    <small>
                      {person.cpf ? `CPF ${maskCpf(person.cpf)} - ` : ""}
                      {formatAddress(person.address)}
                    </small>
                  </div>
                  <span className={person.partnerBenefitsEnabled ? "pass-status on" : "pass-status"}>
                    {person.partnerBenefitsEnabled ? "Getro Pass" : "Interno"}
                  </span>
                  <small className="row-action">Abrir ficha</small>
                </Link>
              ))
            ) : (
              <div className="empty-state">
                <strong>{people.length ? "Nenhum resultado" : "Nenhum membro carregado"}</strong>
                <p>
                  {people.length
                    ? "Ajuste os filtros para encontrar outra pessoa."
                    : "Entre no Firebase ou cadastre uma pessoa para iniciar a base."}
                </p>
                {!people.length ? (
                  <Link className="ghost-button" href="/members/new">
                    Criar primeiro cadastro
                  </Link>
                ) : null}
              </div>
            )}
          </div>
        </article>

        <article className="directory-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Familias</p>
              <h2>Casas</h2>
            </div>
            <span className="soft-pill">{families.length}</span>
          </div>
          <div className="directory-list">
            {families.length ? (
              families.map((family) => (
                <div key={family.id} className="family-card">
                  <strong>{family.displayName || family.familyName}</strong>
                  <p>
                    {countFamilyPeople(people, family.id)} pessoa(s) -{" "}
                    {getIncomeRangeLabel(family.incomeRange)}
                  </p>
                  <small>{formatAddress(family.address)}</small>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <strong>Nenhuma familia</strong>
                <p>Crie uma familia no cadastro de membro para popular esta visao.</p>
                <Link className="ghost-button" href="/members/new">
                  Vincular familia
                </Link>
              </div>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}

function getInitialQuery() {
  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.search).get("q") ?? "";
}

function getFullName(person: Person) {
  return `${person.preferredName || person.firstName} ${person.lastName}`.trim();
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
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

function formatAddress(address: Person["address"] | Family["address"]) {
  if (!address) {
    return "endereco nao informado";
  }

  return [address.street, address.number, address.district, address.city, address.state]
    .filter(Boolean)
    .join(", ") || "endereco nao informado";
}

function maskCpf(cpf: string) {
  const numbers = cpf.replace(/\D/g, "");

  if (numbers.length !== 11) {
    return cpf;
  }

  return `***.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-**`;
}

function countFamilyPeople(people: readonly Person[], familyId: string) {
  return people.filter((person) => person.primaryFamilyId === familyId).length;
}

function getMemberStatusLabel(status: Person["memberStatus"]) {
  switch (status) {
    case "visitor":
      return "Visitante";
    case "congregant":
      return "Congregado";
    case "new_believer":
      return "Novo convertido";
    case "member":
      return "Membro";
    case "leader":
      return "Lider";
    case "volunteer":
      return "Voluntario";
  }
}

function getIncomeRangeLabel(range: Family["incomeRange"]) {
  switch (range) {
    case "up_to_1_minimum_wage":
      return "ate 1 salario minimo";
    case "one_to_3_minimum_wages":
      return "1 a 3 salarios minimos";
    case "three_to_5_minimum_wages":
      return "3 a 5 salarios minimos";
    case "five_to_10_minimum_wages":
      return "5 a 10 salarios minimos";
    case "above_10_minimum_wages":
      return "acima de 10 salarios minimos";
    case "not_informed":
    case undefined:
      return "renda nao informada";
  }
}
