import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";
import { AccountError, boundedJson, privateHeaders } from "../../_lib/kids-media";
import { readLearningProgress, toggleLearningLesson } from "../../_lib/learning-progress";

export async function POST(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    const body = await boundedJson(req, 4000);
    const result = body.action === "read"
      ? await readLearningProgress(body, uid)
      : body.action === "toggle"
        ? await toggleLearningLesson(body, uid)
        : (() => { throw new AccountError(400, "Operação inválida."); })();
    return NextResponse.json(result, { headers: privateHeaders });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof AccountError ? error.message : "Não foi possível atualizar o progresso. Tente novamente." },
      { status: error instanceof AccountError ? error.status : 503, headers: privateHeaders },
    );
  }
}
