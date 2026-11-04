import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../_lib/verify-auth";
import { boundedJson, AccountError } from "../_lib/kids-media";
import { registerMember, RegistrationError } from "../_lib/member-registration";

export async function POST(req: NextRequest) {
  const uid = await verifyFirebaseIdToken(req);
  if (!uid)
    return NextResponse.json(
      { error: "Entre na sua conta para cadastrar membros." },
      { status: 401 },
    );
  try {
    const body = await boundedJson(req, 16000);
    const result = await registerMember(body, uid);
    return NextResponse.json(result, {
      status: 200,
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    if (error instanceof RegistrationError || error instanceof AccountError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    console.error(
      "[members] cadastro não concluído",
      error instanceof Error ? error.message : "unknown",
    );
    return NextResponse.json(
      { error: "Não foi possível salvar o cadastro. Tente novamente." },
      { status: 503 },
    );
  }
}
