import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import {
  seedEventCheckIns,
  seedEventRegistrations,
  seedEvents,
  seedFamilies,
  seedFamilyMembers,
  seedFinancialTransparencyReports,
  seedFollowUpTasks,
  seedGroupAttendance,
  seedGroupMeetings,
  seedGroups,
  seedOrganizationBranding,
  seedOrganizationFeatures,
  seedOrganization,
  seedOrganizationSubscription,
  seedPartnerBenefits,
  seedPartners,
  seedMemberBenefitValidations,
  seedPeople,
  seedVisitorIntakes,
  seedVisitorJourneys
} from "./seed-data";
// Catálogo global da Loja de Capacitação (trilhas da Plataforma Esdras).
// Reusa a MESMA fonte que a UI semeia, evitando duplicar os 12 cursos/46 aulas.
import { MOCK_TRAINING_PROGRAMS, MOCK_TRAINING_LESSONS } from "../apps/web/src/lib/mock-data";

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

function getServiceAccount(): ServiceAccount | null {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    return null;
  }

  const rawFromEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const rawFromPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    ? readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf8")
    : null;
  const raw = rawFromEnv ?? rawFromPath;

  if (!raw) {
    throw new Error(
      "Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH (or use FIRESTORE_EMULATOR_HOST)."
    );
  }

  const parsed = JSON.parse(raw) as ServiceAccount;

  return {
    ...parsed,
    private_key: parsed.private_key.replace(/\\n/g, "\n")
  };
}

function getProjectId(serviceAccount: ServiceAccount | null) {
  return process.env.FIREBASE_PROJECT_ID ?? serviceAccount?.project_id ?? "alvo-church";
}

async function run() {
  const serviceAccount = getServiceAccount();

  if (getApps().length === 0) {
    if (serviceAccount) {
      initializeApp({
        credential: cert(serviceAccount),
        projectId: getProjectId(serviceAccount)
      });
    } else {
      initializeApp({
        projectId: getProjectId(null)
      });
    }
  }

  const firestore = getFirestore();
  const batch = firestore.batch();

  const organizationRef = firestore.collection("organizations").doc(seedOrganization.id);
  batch.set(organizationRef, seedOrganization, { merge: true });
  batch.set(
    organizationRef.collection("settings").doc("branding"),
    seedOrganizationBranding,
    { merge: true }
  );
  batch.set(
    organizationRef.collection("settings").doc("subscription"),
    seedOrganizationSubscription,
    { merge: true }
  );
  batch.set(
    organizationRef.collection("settings").doc("features"),
    seedOrganizationFeatures,
    { merge: true }
  );

  for (const person of seedPeople) {
    const personRef = organizationRef.collection("people").doc(person.id);
    batch.set(personRef, person, { merge: true });
  }

  for (const family of seedFamilies) {
    const familyRef = organizationRef.collection("families").doc(family.id);
    batch.set(familyRef, family, { merge: true });
  }

  for (const member of seedFamilyMembers) {
    const memberRef = organizationRef
      .collection("families")
      .doc(member.familyId)
      .collection("members")
      .doc(member.id);
    batch.set(memberRef, member, { merge: true });
  }

  for (const partner of seedPartners) {
    const partnerRef = organizationRef.collection("partners").doc(partner.id);
    batch.set(partnerRef, partner, { merge: true });
  }

  for (const benefit of seedPartnerBenefits) {
    const benefitRef = organizationRef.collection("partnerBenefits").doc(benefit.id);
    batch.set(benefitRef, benefit, { merge: true });
  }

  for (const validation of seedMemberBenefitValidations) {
    const validationRef = organizationRef
      .collection("memberBenefitValidations")
      .doc(validation.id);
    batch.set(validationRef, validation, { merge: true });
  }

  for (const journey of seedVisitorJourneys) {
    const journeyRef = organizationRef.collection("visitorJourneys").doc(journey.id);
    batch.set(journeyRef, journey, { merge: true });
  }

  for (const task of seedFollowUpTasks) {
    const taskRef = organizationRef.collection("followUpTasks").doc(task.id);
    batch.set(taskRef, task, { merge: true });
  }

  for (const intake of seedVisitorIntakes) {
    const intakeRef = organizationRef.collection("visitorIntakes").doc(intake.id);
    batch.set(intakeRef, intake, { merge: true });
  }

  for (const group of seedGroups) {
    const groupRef = organizationRef.collection("groups").doc(group.id);
    batch.set(groupRef, group, { merge: true });
  }

  for (const meeting of seedGroupMeetings) {
    const meetingRef = organizationRef
      .collection("groups")
      .doc(meeting.groupId)
      .collection("meetings")
      .doc(meeting.id);
    batch.set(meetingRef, meeting, { merge: true });
  }

  for (const attendance of seedGroupAttendance) {
    const attendanceRef = organizationRef
      .collection("groups")
      .doc(attendance.groupId)
      .collection("meetings")
      .doc(attendance.groupMeetingId)
      .collection("attendance")
      .doc(attendance.id);
    batch.set(attendanceRef, attendance, { merge: true });
  }

  for (const event of seedEvents) {
    const eventRef = organizationRef.collection("events").doc(event.id);
    batch.set(eventRef, event, { merge: true });
  }

  for (const registration of seedEventRegistrations) {
    const registrationRef = organizationRef
      .collection("events")
      .doc(registration.eventId)
      .collection("registrations")
      .doc(registration.id);
    batch.set(registrationRef, registration, { merge: true });
  }

  for (const checkIn of seedEventCheckIns) {
    const checkInRef = organizationRef
      .collection("events")
      .doc(checkIn.eventId)
      .collection("checkIns")
      .doc(checkIn.id);
    batch.set(checkInRef, checkIn, { merge: true });
  }

  for (const report of seedFinancialTransparencyReports) {
    const reportRef = organizationRef.collection("financeReports").doc(report.id);
    batch.set(reportRef, report, { merge: true });
  }

  // Loja de Capacitação (catálogo GLOBAL — coleção top-level, fora de organizations/).
  for (const program of MOCK_TRAINING_PROGRAMS) {
    const programRef = firestore.collection("platformPrograms").doc(program.id);
    batch.set(programRef, program, { merge: true });
  }

  for (const lesson of MOCK_TRAINING_LESSONS) {
    const lessonRef = firestore
      .collection("platformPrograms")
      .doc(lesson.programId)
      .collection("lessons")
      .doc(lesson.id);
    batch.set(lessonRef, lesson, { merge: true });
  }

  await batch.commit();

  console.log(
    `Seed concluido para ${seedOrganization.name}: ${seedPeople.length} pessoas, ${seedFamilies.length} familias, ${seedVisitorJourneys.length} jornadas, ${seedVisitorIntakes.length} entradas de portaria, ${seedGroups.length} grupos, ${seedEvents.length} eventos e ${seedFinancialTransparencyReports.length} demonstrativo(s).`
  );
  console.log(
    `Loja de Capacitacao: ${MOCK_TRAINING_PROGRAMS.length} trilhas + ${MOCK_TRAINING_LESSONS.length} aulas em platformPrograms/ (catalogo global da Esdras).`
  );
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
