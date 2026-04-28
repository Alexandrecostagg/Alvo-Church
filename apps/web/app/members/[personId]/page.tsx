"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  createFirebaseWebRuntimeConfigFromEnv,
  fetchFamilyById,
  fetchFamilyMembers,
  fetchPeople,
  fetchPersonById,
  isFirebaseWebRuntimeConfigured
} from "@alvo/firebase";
import type { Family, FamilyMember, Person } from "@alvo/types";
import { useAppAuth } from "../../providers";

const organizationId = "org_alvo_demo";

export default function MemberProfilePage() {
  const params = useParams<{ personId?: string }>();
  const personId = typeof params.personId === "string" ? params.personId : "";
  const { configured, firebaseReady, user } = useAppAuth();
  const [person, setPerson] = useState<Person | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [familyPeople, setFamilyPeople] = useState<Person[]>([]);
  const [status, setStatus] = useState("Carregando ficha do membro...");

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
    if (!personId) {
      setStatus("Membro nao informado.");
      return;
    }

    if (!configured || !firebaseReady || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setStatus("Entre no Firebase para abrir a ficha completa.");
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      setStatus("Buscando pessoa, familia e contexto pastoral...");

      try {
        const nextPerson = await fetchPersonById(firebaseConfig, { organizationId }, personId);

        if (cancelled) {
          return;
        }

        if (!nextPerson) {
          setStatus("Membro nao encontrado no Firestore.");
          setPerson(null);
          return;
        }

        setPerson(nextPerson);

        if (!nextPerson.primaryFamilyId) {
          setFamily(null);
          setFamilyMembers([]);
          setFamilyPeople([]);
          setStatus("Ficha carregada sem familia vinculada.");
          return;
        }

        const [nextFamily, nextFamilyMembers, nextPeople] = await Promise.all([
          fetchFamilyById(firebaseConfig, { organizationId }, nextPerson.primaryFamilyId),
          fetchFamilyMembers(firebaseConfig, { organizationId }, nextPerson.primaryFamilyId),
          fetchPeople(firebaseConfig, { organizationId }, 80)
        ]);

        if (cancelled) {
          return;
        }

        const familyPersonIds = new Set(nextFamilyMembers.map((member) => member.personId));
        setFamily(nextFamily);
        setFamilyMembers(nextFamilyMembers);
        setFamilyPeople(nextPeople.filter((item) => familyPersonIds.has(item.id)));
        setStatus("Ficha completa sincronizada com o Firestore.");
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : "Nao foi possivel carregar a ficha.");
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [configured, firebaseConfig, firebaseReady, personId, user]);

  const fullName = person ? getFullName(person) : "Ficha de membro";
  const profileHealth = person ? getProfileHealth(person) : [];

  return (
    <main className="form-page profile-page">
      <section className="profile-hero">
        <div>
          <Link className="back-link" href="/members">
            Voltar para membros
          </Link>
          <p className="eyebrow">Ficha completa</p>
          <h1>{fullName}</h1>
          <p>
            Visao pastoral, familiar e operacional para entender quem e a pessoa,
            onde ela esta conectada e quais proximos cuidados fazem sentido.
          </p>
        </div>
        <aside className="profile-id-card">
          <span>{person ? getMemberStatusLabel(person.memberStatus) : "Carregando"}</span>
          <strong>{person?.memberCardCode ?? "Getro Pass interno"}</strong>
          <p>{status}</p>
        </aside>
      </section>

      {person ? (
        <>
          <section className="profile-summary-grid">
            <article>
              <span>Idade</span>
              <strong>{person.birthDate ? `${calculateAge(person.birthDate)} anos` : "--"}</strong>
              <p>{person.birthDate ? formatDate(person.birthDate) : "nascimento nao informado"}</p>
            </article>
            <article>
              <span>Familia</span>
              <strong>{family ? family.displayName || family.familyName : "Sem vinculo"}</strong>
              <p>{familyPeople.length || familyMembers.length} pessoa(s) mapeada(s)</p>
            </article>
            <article>
              <span>Getro Pass</span>
              <strong>{person.partnerBenefitsEnabled ? "Ativo" : "Interno"}</strong>
              <p>{person.partnerBenefitsEnabled ? "pode validar beneficios" : "sem exposicao externa"}</p>
            </article>
            <article>
              <span>LGPD</span>
              <strong>{person.consentLgpdAt ? "Registrado" : "Pendente"}</strong>
              <p>{person.consentLgpdAt ? formatDate(person.consentLgpdAt) : "solicitar consentimento"}</p>
            </article>
          </section>

          <section className="profile-grid">
            <article className="profile-panel span-2">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Dados principais</p>
                  <h2>Identificacao e contato</h2>
                </div>
                <span className="soft-pill">dados sensiveis</span>
              </div>
              <div className="profile-data-grid">
                <ProfileField label="Nome civil" value={`${person.firstName} ${person.lastName}`} />
                <ProfileField label="Nome preferido" value={person.preferredName} />
                <ProfileField label="CPF" value={person.cpf ? maskCpf(person.cpf) : undefined} />
                <ProfileField label="E-mail" value={person.email} />
                <ProfileField label="Celular" value={person.mobilePhone} />
                <ProfileField label="WhatsApp" value={person.whatsappPhone} />
                <ProfileField label="Profissao" value={person.occupation} />
                <ProfileField label="Escolaridade" value={getEducationLabel(person.educationLevel)} />
                <ProfileField label="Renda familiar" value={getIncomeRangeLabel(person.householdIncomeRange)} />
                <ProfileField label="Endereco" value={formatAddress(person.address)} wide />
              </div>
            </article>

            <aside className="profile-panel">
              <p className="eyebrow">Proximas acoes</p>
              <h2>Cuidado sugerido</h2>
              <div className="care-stack">
                {profileHealth.map((item) => (
                  <div key={item.title}>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </div>
                ))}
              </div>
            </aside>

            <article className="profile-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Familia</p>
                  <h2>{family ? family.displayName || family.familyName : "Sem familia"}</h2>
                </div>
                <span className="soft-pill">{familyPeople.length || familyMembers.length}</span>
              </div>
              <p className="profile-muted">{family ? formatAddress(family.address) : "Vincule uma familia para montar o panorama da casa."}</p>
              <div className="family-member-list">
                {familyMembers.length ? (
                  familyMembers.map((member) => {
                    const memberPerson = familyPeople.find((item) => item.id === member.personId);

                    return (
                      <div key={member.id}>
                        <strong>{memberPerson ? getFullName(memberPerson) : member.personId}</strong>
                        <p>
                          {getRelationshipLabel(member.relationshipType)}
                          {member.isPrimaryContact ? " - contato principal" : ""}
                          {member.isFinancialResponsible ? " - financeiro" : ""}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="empty-state">
                    <strong>Nenhum vinculo familiar</strong>
                    <p>O proximo passo e conectar esta pessoa a uma casa.</p>
                  </div>
                )}
              </div>
            </article>

            <article className="profile-panel">
              <p className="eyebrow">Privacidade</p>
              <h2>Getro Pass seguro</h2>
              <p className="profile-muted">
                Parceiros externos devem receber apenas confirmacao de beneficio.
                CPF, renda, endereco e historico pastoral continuam protegidos.
              </p>
              <div className="pass-preview">
                <span>Codigo</span>
                <strong>{person.memberCardCode ?? "nao habilitado"}</strong>
                <p>{person.partnerBenefitsEnabled ? "Apto para validacao externa." : "Uso restrito ao ambiente interno."}</p>
              </div>
            </article>
          </section>
        </>
      ) : (
        <section className="profile-panel">
          <h2>{status}</h2>
          <p className="profile-muted">
            Se voce acabou de cadastrar a pessoa, volte para a base de membros e tente abrir a ficha novamente.
          </p>
          <Link className="primary-button" href="/members">
            Voltar para membros
          </Link>
        </section>
      )}
    </main>
  );
}

function ProfileField({
  label,
  value,
  wide
}: {
  label: string;
  value?: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "profile-field wide" : "profile-field"}>
      <span>{label}</span>
      <strong>{value || "nao informado"}</strong>
    </div>
  );
}

function getFullName(person: Person) {
  return `${person.preferredName || person.firstName} ${person.lastName}`.trim();
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value));
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

function getEducationLabel(level: Person["educationLevel"]) {
  switch (level) {
    case "elementary":
      return "Fundamental";
    case "high_school":
      return "Medio";
    case "technical":
      return "Tecnico";
    case "undergraduate":
      return "Superior";
    case "postgraduate":
      return "Pos-graduacao";
    case "not_informed":
    case undefined:
      return "nao informado";
  }
}

function getIncomeRangeLabel(range: Person["householdIncomeRange"] | Family["incomeRange"]) {
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
      return "nao informado";
  }
}

function getRelationshipLabel(type: FamilyMember["relationshipType"]) {
  switch (type) {
    case "self":
      return "propria pessoa";
    case "spouse":
      return "conjuge";
    case "child":
      return "filho(a)";
    case "parent":
      return "responsavel";
    case "sibling":
      return "irmao(a)";
    case "other":
      return "outro vinculo";
  }
}

function getProfileHealth(person: Person) {
  const items = [];

  if (!person.primaryFamilyId) {
    items.push({
      title: "Vincular familia",
      detail: "Sem grupo familiar, a lideranca perde a visao da casa e dos responsaveis."
    });
  }

  if (!person.whatsappPhone && !person.mobilePhone) {
    items.push({
      title: "Completar contato",
      detail: "Inclua telefone ou WhatsApp antes de acionar comunicacao e follow-up."
    });
  }

  if (!person.consentLgpdAt) {
    items.push({
      title: "Registrar LGPD",
      detail: "O consentimento deve vir antes de ativar jornadas e beneficios externos."
    });
  }

  if (person.partnerBenefitsEnabled && !person.memberCardCode) {
    items.push({
      title: "Gerar codigo Getro Pass",
      detail: "A pessoa esta habilitada, mas ainda precisa de codigo de validacao."
    });
  }

  if (!items.length) {
    items.push({
      title: "Ficha bem encaminhada",
      detail: "Dados principais, privacidade e contexto familiar estao prontos para operacao."
    });
  }

  return items;
}
