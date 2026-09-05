import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../_lib/verify-auth";
import { registerMember, RegistrationError } from "../_lib/member-registration";

export async function POST(req: NextRequest) {
  const uid = await verifyFirebaseIdToken(req);
  if (!uid)
    return NextResponse.json(
      { error: "Entre na sua conta para cadastrar membros." },
      { status: 401 },
    );
  try {
    const raw = await req.text();
    if (new TextEncoder().encode(raw).length > 16000)
      return NextResponse.json(
        { error: "Cadastro muito grande." },
        { status: 413 },
      );
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Cadastro inválido." },
        { status: 400 },
      );
    }
    const result = await registerMember(body, uid);
    return NextResponse.json(result, {
      status: 200,
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    if (error instanceof RegistrationError)
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
