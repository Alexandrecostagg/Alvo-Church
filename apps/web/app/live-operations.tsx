"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  Event,
  EventCheckIn,
  EventRegistration,
  Family,
  FinancialTransparencyReport,
  FollowUpTask,
  Group,
  GroupAttendance,
  GroupMeeting,
  MemberBenefitValidation,
  PartnerBenefit,
  PartnerOrganization,
  Person,
  VisitorIntake,
  VisitorJourney
} from "@alvo/types";
import {
  createFirebaseWebRuntimeConfigFromEnv,
  fetchEventCheckIns,
  fetchEventRegistrations,
  fetchEvents,
  fetchFinancialTransparencyReports,
  fetchFollowUpTasks,
  fetchFamilies,
  fetchGroupAttendance,
  fetchGroupMeetings,
  fetchGroups,
  fetchMemberBenefitValidations,
  fetchPartnerBenefits,
  fetchPartnerOrganizations,
  fetchPeople,
  fetchVisitorIntakes,
  fetchVisitorJourneys,
  getEventCheckInsCollectionPath,
  getEventRegistrationsCollectionPath,
  getEventsCollectionPath,
  getFamiliesCollectionPath,
  getFinanceReportsCollectionPath,
  getFollowUpTasksCollectionPath,
  getGroupAttendanceCollectionPath,
  getGroupMeetingsCollectionPath,
  getGroupsCollectionPath,
  getMemberBenefitValidationsCollectionPath,
  getPartnerBenefitsCollectionPath,
  getPartnersCollectionPath,
  getPeopleCollectionPath,
  getVisitorIntakesCollectionPath,
  getVisitorJourneysCollectionPath,
  isFirebaseWebRuntimeConfigured
} from "@alvo/firebase";
import {
  getBrandModeLabel,
  getAttendanceStatusLabel,
  createFamilyDisplayName,
  getEnabledModuleCount,
  getEventTypeLabel,
  getFollowUpStatusLabel,
  getGroupTypeLabel,
  getPartnerBenefitCategoryLabel,
  getPersonFullName,
  getPlanTierLabel,
  getRegistrationStatusLabel,
  isModuleEnabled,
  getVisitorStageLabel
} from "@alvo/domain";
import { useAppAuth } from "./providers";

interface LiveOperationsProps {
  organizationId: string;
}

export function LiveOperations({ organizationId }: LiveOperationsProps) {
  const { firebaseReady, tenantRuntime, user } = useAppAuth();
  const [visitorJourneys, setVisitorJourneys] = useState<VisitorJourney[]>([]);
  const [visitorIntakes, setVisitorIntakes] = useState<VisitorIntake[]>([]);
  const [followUpTasks, setFollowUpTasks] = useState<FollowUpTask[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupMeetings, setGroupMeetings] = useState<GroupMeeting[]>([]);
  const [groupAttendance, setGroupAttendance] = useState<GroupAttendance[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [eventRegistrations, setEventRegistrations] = useState<EventRegistration[]>([]);
  const [eventCheckIns, setEventCheckIns] = useState<EventCheckIn[]>([]);
  const [financeReports, setFinanceReports] = useState<FinancialTransparencyReport[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [partners, setPartners] = useState<PartnerOrganization[]>([]);
  const [partnerBenefits, setPartnerBenefits] = useState<PartnerBenefit[]>([]);
  const [benefitValidations, setBenefitValidations] = useState<MemberBenefitValidation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const configured = isFirebaseWebRuntimeConfigured(firebaseConfig);

  useEffect(() => {
    if (!configured || !firebaseReady || !user) {
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [
          nextVisitorJourneys,
          nextVisitorIntakes,
          nextFollowUpTasks,
          nextGroups,
          nextEvents,
          nextFinanceReports,
          nextPeople,
          nextFamilies,
          nextPartners,
          nextPartnerBenefits,
          nextBenefitValidations
        ] =
          await Promise.all([
            fetchVisitorJourneys(firebaseConfig, { organizationId }),
            fetchVisitorIntakes(firebaseConfig, { organizationId }),
            fetchFollowUpTasks(firebaseConfig, { organizationId }),
            fetchGroups(firebaseConfig, { organizationId }),
            fetchEvents(firebaseConfig, { organizationId }),
            fetchFinancialTransparencyReports(firebaseConfig, { organizationId }),
            fetchPeople(firebaseConfig, { organizationId }),
            fetchFamilies(firebaseConfig, { organizationId }),
            fetchPartnerOrganizations(firebaseConfig, { organizationId }),
            fetchPartnerBenefits(firebaseConfig, { organizationId }),
            fetchMemberBenefitValidations(firebaseConfig, { organizationId })
          ]);

        const [nextGroupMeetings, nextEventRegistrations, nextEventCheckIns] =
          await Promise.all([
            fetchGroupMeetings(firebaseConfig, { organizationId }, nextGroups),
            fetchEventRegistrations(firebaseConfig, { organizationId }, nextEvents),
            fetchEventCheckIns(firebaseConfig, { organizationId }, nextEvents)
          ]);

        const nextGroupAttendance = await fetchGroupAttendance(
          firebaseConfig,
          { organizationId },
          nextGroupMeetings
        );

        if (cancelled) {
          return;
        }

        setVisitorJourneys(nextVisitorJourneys);
        setVisitorIntakes(nextVisitorIntakes);
        setFollowUpTasks(nextFollowUpTasks);
        setGroups(nextGroups);
        setGroupMeetings(nextGroupMeetings);
        setGroupAttendance(nextGroupAttendance);
        setEvents(nextEvents);
        setEventRegistrations(nextEventRegistrations);
        setEventCheckIns(nextEventCheckIns);
        setFinanceReports(nextFinanceReports);
        setPeople(nextPeople);
        setFamilies(nextFamilies);
        setPartners(nextPartners);
        setPartnerBenefits(nextPartnerBenefits);
        setBenefitValidations(nextBenefitValidations);
      } catch (nextError) {
        if (cancelled) {
          return;
        }

        setError(
          nextError instanceof Error
            ? nextError.message
            : "Nao foi possivel carregar os modulos reais do Firebase."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [configured, firebaseConfig, firebaseReady, organizationId, user]);

  if (!configured || !firebaseReady || !user) {
    return null;
  }

  const settings = tenantRuntime?.settings ?? null;
  const visitorsEnabled = settings ? isModuleEnabled(settings.features, "visitors") : true;
  const groupsEnabled = settings ? isModuleEnabled(settings.features, "groups") : true;
  const eventsEnabled = settings ? isModuleEnabled(settings.features, "events") : true;
  const financeEnabled = settings ? isModuleEnabled(settings.features, "finance") : true;
  const memberCount = people.filter((person) =>
    ["member", "leader", "volunteer"].includes(person.memberStatus)
  ).length;
  const visitorCount = people.filter((person) => person.memberStatus === "visitor").length;
  const getroPassCount = people.filter((person) => person.partnerBenefitsEnabled).length;
  const activeBenefitCount = partnerBenefits.filter(
    (benefit) => benefit.status === "active"
  ).length;

  return (
    <section style={sectionStyle}>
      <div style={headerStyle}>
        <div>
          <strong style={{ display: "block", fontSize: 24 }}>Operacao real do Firebase</strong>
          <p style={{ margin: "8px 0 0", lineHeight: 1.6 }}>
            Modulos operacionais refletindo o contrato real do tenant autenticado.
          </p>
        </div>
        <div style={pillStyle}>
          {loading ? "Atualizando modulos..." : "Sincronizado com o Firestore"}
        </div>
      </div>

      {error ? <p style={errorStyle}>{error}</p> : null}

      {settings ? (
        <div style={runtimeStyle}>
          <span>
            Plano: <strong>{getPlanTierLabel(settings.subscription.planTier)}</strong>
          </span>
          <span>
            Marca: <strong>{getBrandModeLabel(settings.branding.brandMode)}</strong>
          </span>
          <span>
            Modulos ativos: <strong>{getEnabledModuleCount(settings.features)}</strong>
          </span>
        </div>
      ) : null}

      <div style={gridStyle}>
        <article style={cardStyle}>
          <strong>Membros e familias</strong>
          <p style={metaStyle}>
            {people.length} pessoa(s), {memberCount} membro(s), {visitorCount} visitante(s) e{" "}
            {families.length} familia(s)
          </p>
          <p style={pathStyle}>
            Pessoas: <code>{getPeopleCollectionPath({ organizationId })}</code>
          </p>
          <p style={pathStyle}>
            Familias: <code>{getFamiliesCollectionPath({ organizationId })}</code>
          </p>
          <div style={stackStyle}>
            {people.map((person) => (
              <div key={person.id} style={itemStyle}>
                <strong>{getPersonFullName(person)}</strong>
                <p style={itemTextStyle}>
                  {getMemberStatusLabel(person.memberStatus)} -{" "}
                  {person.birthDate ? `${calculateAge(person.birthDate)} anos` : "idade nao informada"}
                </p>
                <p style={miniPathStyle}>
                  {person.cpf ? `CPF ${maskCpf(person.cpf)} - ` : ""}
                  {formatAddress(person.address)}
                </p>
              </div>
            ))}
            {families.map((family) => (
              <div key={family.id} style={itemStyle}>
                <strong>{createFamilyDisplayName(family)}</strong>
                <p style={itemTextStyle}>
                  {countFamilyPeople(people, family.id)} pessoa(s) vinculada(s) -{" "}
                  {getIncomeRangeLabel(family.incomeRange)}
                </p>
                <p style={miniPathStyle}>{formatAddress(family.address)}</p>
              </div>
            ))}
          </div>
        </article>

        {visitorsEnabled ? (
          <article style={cardStyle}>
            <strong>Visitantes em jornada</strong>
            <p style={metaStyle}>
              {visitorJourneys.length} jornada(s), {visitorIntakes.length} entrada(s) e{" "}
              {followUpTasks.length} follow-up(s)
            </p>
            <p style={pathStyle}>
              Collection: <code>{getVisitorJourneysCollectionPath({ organizationId })}</code>
            </p>
            <div style={stackStyle}>
              {visitorJourneys.map((journey) => (
                <div key={journey.id} style={itemStyle}>
                  <strong>{journey.personId}</strong>
                  <p style={itemTextStyle}>
                    {getVisitorStageLabel(journey.currentStage)} · {journey.originChannel}
                  </p>
                </div>
              ))}
              {visitorIntakes.map((intake) => (
                <div key={intake.id} style={itemStyle}>
                  <strong>{intake.name}</strong>
                  <p style={itemTextStyle}>
                    {intake.status} Â· {intake.source}
                  </p>
                </div>
              ))}
              {followUpTasks.map((task) => (
                <div key={task.id} style={itemStyle}>
                  <strong>{task.title}</strong>
                  <p style={itemTextStyle}>
                    {getFollowUpStatusLabel(task.status)} · {task.type}
                  </p>
                </div>
              ))}
            </div>
            <p style={pathStyle}>
              Tasks: <code>{getFollowUpTasksCollectionPath({ organizationId })}</code>
            </p>
            <p style={pathStyle}>
              Portaria: <code>{getVisitorIntakesCollectionPath({ organizationId })}</code>
            </p>
          </article>
        ) : null}

        <article style={cardStyle}>
          <strong>Getro Pass e convenios</strong>
          <p style={metaStyle}>
            {partners.length} parceiro(s), {activeBenefitCount} beneficio(s) ativo(s),{" "}
            {getroPassCount} membro(s) habilitado(s) e {benefitValidations.length} validacao(oes)
          </p>
          <p style={pathStyle}>
            Parceiros: <code>{getPartnersCollectionPath({ organizationId })}</code>
          </p>
          <p style={pathStyle}>
            Beneficios: <code>{getPartnerBenefitsCollectionPath({ organizationId })}</code>
          </p>
          <div style={stackStyle}>
            {partners.map((partner) => (
              <div key={partner.id} style={itemStyle}>
                <strong>{partner.name}</strong>
                <p style={itemTextStyle}>
                  {getPartnerBenefitCategoryLabel(partner.category)} - {partner.city ?? "cidade nao informada"}
                </p>
              </div>
            ))}
            {partnerBenefits.map((benefit) => (
              <div key={benefit.id} style={itemStyle}>
                <strong>{benefit.title}</strong>
                <p style={itemTextStyle}>
                  {benefit.discountLabel} - {benefit.verificationMode}
                </p>
                <p style={miniPathStyle}>{benefit.privacyNotes}</p>
              </div>
            ))}
            {benefitValidations.map((validation) => (
              <div key={validation.id} style={itemStyle}>
                <strong>{validation.memberCardCode}</strong>
                <p style={itemTextStyle}>
                  {validation.validationStatus} - campos expostos:{" "}
                  {validation.exposedFields.join(", ") || "nenhum"}
                </p>
              </div>
            ))}
          </div>
          <p style={pathStyle}>
            Validacoes: <code>{getMemberBenefitValidationsCollectionPath({ organizationId })}</code>
          </p>
        </article>

        {groupsEnabled ? (
          <article style={cardStyle}>
            <strong>Grupos e presencas</strong>
            <p style={metaStyle}>
              {groups.length} grupo(s), {groupMeetings.length} encontro(s) e{" "}
              {groupAttendance.length} presenca(s)
            </p>
            <p style={pathStyle}>
              Collection: <code>{getGroupsCollectionPath({ organizationId })}</code>
            </p>
            <div style={stackStyle}>
              {groups.map((group) => (
                <div key={group.id} style={itemStyle}>
                  <strong>{group.name}</strong>
                  <p style={itemTextStyle}>
                    {getGroupTypeLabel(group.type)} · {group.meetingTime ?? "sem horario"}
                  </p>
                  <p style={miniPathStyle}>
                    <code>{getGroupMeetingsCollectionPath({ organizationId }, group.id)}</code>
                  </p>
                </div>
              ))}
              {groupAttendance.map((attendance) => (
                <div key={attendance.id} style={itemStyle}>
                  <strong>{attendance.personId}</strong>
                  <p style={itemTextStyle}>
                    {getAttendanceStatusLabel(attendance.attendanceStatus)}
                  </p>
                  <p style={miniPathStyle}>
                    <code>
                      {getGroupAttendanceCollectionPath(
                        { organizationId },
                        attendance.groupId,
                        attendance.groupMeetingId
                      )}
                    </code>
                  </p>
                </div>
              ))}
            </div>
          </article>
        ) : null}

        {eventsEnabled ? (
          <article style={cardStyle}>
            <strong>Eventos e inscricoes</strong>
            <p style={metaStyle}>
              {events.length} evento(s), {eventRegistrations.length} inscricao(oes) e{" "}
              {eventCheckIns.length} check-in(s)
            </p>
            <p style={pathStyle}>
              Collection: <code>{getEventsCollectionPath({ organizationId })}</code>
            </p>
            <div style={stackStyle}>
              {events.map((event) => (
                <div key={event.id} style={itemStyle}>
                  <strong>{event.name}</strong>
                  <p style={itemTextStyle}>
                    {getEventTypeLabel(event.type)} · {event.locationType}
                  </p>
                  <p style={miniPathStyle}>
                    <code>{getEventRegistrationsCollectionPath({ organizationId }, event.id)}</code>
                  </p>
                </div>
              ))}
              {eventRegistrations.map((registration) => (
                <div key={registration.id} style={itemStyle}>
                  <strong>{registration.registrationCode}</strong>
                  <p style={itemTextStyle}>
                    {getRegistrationStatusLabel(registration.status)} ·{" "}
                    {registration.paymentStatus}
                  </p>
                </div>
              ))}
              {eventCheckIns.map((checkIn) => (
                <div key={checkIn.id} style={itemStyle}>
                  <strong>{checkIn.personId}</strong>
                  <p style={itemTextStyle}>Check-in registrado</p>
                  <p style={miniPathStyle}>
                    <code>{getEventCheckInsCollectionPath({ organizationId }, checkIn.eventId)}</code>
                  </p>
                </div>
              ))}
            </div>
          </article>
        ) : null}

        {financeEnabled ? (
          <article style={cardStyle}>
            <strong>Transparencia financeira</strong>
            <p style={metaStyle}>
              {financeReports.length} demonstrativo(s) publicado(s)
            </p>
            <p style={pathStyle}>
              Collection: <code>{getFinanceReportsCollectionPath({ organizationId })}</code>
            </p>
            <div style={stackStyle}>
              {financeReports.map((report) => (
                <div key={report.id} style={itemStyle}>
                  <strong>{report.month}</strong>
                  <p style={itemTextStyle}>
                    {report.status} Â· saldo {formatCurrency(report.balance)}
                  </p>
                </div>
              ))}
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0
  }).format(value);
}

function formatAddress(address: Person["address"] | Family["address"]) {
  if (!address) {
    return "endereco nao informado";
  }

  const formatted = [address.street, address.number, address.district, address.city, address.state]
    .filter(Boolean)
    .join(", ");

  return formatted || "endereco nao informado";
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

function maskCpf(cpf: string) {
  const numbers = cpf.replace(/\D/g, "");

  if (numbers.length !== 11) {
    return cpf;
  }

  return `***.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-**`;
}

const sectionStyle = {
  marginTop: 28,
  padding: 24,
  borderRadius: 24,
  background: "#fffdf8",
  border: "1px solid var(--alvo-line)"
} as const;

const headerStyle = {
  display: "flex",
  gap: 16,
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap"
} as const;

const pillStyle = {
  padding: "10px 14px",
  borderRadius: 999,
  background: "#eef7ef",
  color: "#166534",
  fontSize: 13,
  fontWeight: 700
} as const;

const gridStyle = {
  marginTop: 20,
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))"
} as const;

const runtimeStyle = {
  marginTop: 18,
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  fontSize: 14,
  lineHeight: 1.6
} as const;

const cardStyle = {
  minWidth: 0,
  padding: 24,
  borderRadius: 24,
  background: "rgba(255, 253, 248, 0.96)",
  border: "1px solid var(--alvo-line)"
} as const;

const stackStyle = {
  display: "grid",
  gap: 10,
  marginTop: 16
} as const;

const itemStyle = {
  padding: 14,
  borderRadius: 16,
  background: "#f7f0e3",
  minWidth: 0
} as const;

const metaStyle = {
  margin: "10px 0 14px",
  lineHeight: 1.6
} as const;

const pathStyle = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.7,
  overflowWrap: "anywhere" as const
} as const;

const miniPathStyle = {
  margin: "6px 0 0",
  fontSize: 12,
  lineHeight: 1.6,
  overflowWrap: "anywhere" as const
} as const;

const itemTextStyle = {
  margin: "6px 0 0",
  fontSize: 14
} as const;

const errorStyle = {
  margin: "14px 0 0",
  color: "#b42318",
  lineHeight: 1.6
} as const;
