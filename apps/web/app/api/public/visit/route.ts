import { NextRequest, NextResponse } from "next/server";
import {
  getFirebaseFirestore,
  getVisitorIntakesCollectionPath,
  getPeopleCollectionPath,
  doc,
  setDoc,
  getDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "@alvo/firebase";

function buildFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      orgSlug: string;
      name: string;
      phone: string;
      email?: string;
      birthDate?: string;
      neighborhood?: string;
      firstVisit: boolean;
      howHeard?: string;
      consent: boolean;
    };

    const { orgSlug, name, phone, firstVisit, howHeard, consent, email, birthDate, neighborhood } = body;

    if (!orgSlug || !name || !phone) {
      return NextResponse.json({ error: "orgSlug, name e phone são obrigatórios." }, { status: 400 });
    }

    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      return NextResponse.json({ error: "Telefone inválido." }, { status: 400 });
    }

    const config = buildFirebaseConfig();
    const db = getFirebaseFirestore(config);
    const now = serverTimestamp();

    // Resolve orgSlug → organizationId
    const slugRef = doc(db, "org_slugs", orgSlug);
    const slugSnap = await getDoc(slugRef);
    const organizationId: string = slugSnap.exists()
      ? String(slugSnap.data()["organizationId"])
      : orgSlug;

    const tenantCtx = { organizationId };
    const peopleColPath = getPeopleCollectionPath(tenantCtx);
    const peopleCol = collection(db, peopleColPath);

    // Dedup by phone
    const dupSnap = await getDocs(query(peopleCol, where("phone", "==", digits)));
    let personId: string;

    if (!dupSnap.empty) {
      personId = dupSnap.docs[0].id;
    } else {
      const personRef = doc(peopleCol);
      personId = personRef.id;
      await setDoc(personRef, {
        name: name.trim(),
        phone: digits,
        email: email?.trim() || null,
        birthDate: birthDate || null,
        neighborhood: neighborhood?.trim() || null,
        status: "visitor",
        createdAt: now,
        updatedAt: now,
      });
    }

    // Create visitorIntake
    const intakePath = getVisitorIntakesCollectionPath(tenantCtx);
    const intakeRef = doc(collection(db, intakePath));
    await setDoc(intakeRef, {
      personId,
      organizationId,
      firstVisit,
      howHeard: howHeard || null,
      consentMarketing: consent,
      source: "public_form",
      orgSlug,
      createdAt: now,
    });

    return NextResponse.json({ ok: true, personId });
  } catch (err) {
    console.error("[public/visit] error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
