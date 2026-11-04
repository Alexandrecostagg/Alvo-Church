import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";
import { AccountError, accountTransaction } from "../../_lib/member-account-store";
import { documentId } from "../../_lib/member-account";
import { privateHeaders } from "../../_lib/kids-media";
import { assertModuleEnabled } from "../../_lib/module-access";

export async function GET(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    const orgId = documentId(req.nextUrl.searchParams.get("organizationId"), "Igreja");
    const programId = documentId(req.nextUrl.searchParams.get("programId"), "Trilha");
    const lessons = await accountTransaction(async tx => {
      const root = `organizations/${orgId}`;
      await assertModuleEnabled(tx, root, "journeys");
      const [org, actor, program, entitlement] = await tx.read(root, `${root}/users/${uid}`, `platformPrograms/${programId}`, `${root}/programEntitlements/${programId}`);
      if (org?.status !== "active" || actor?.organizationId !== orgId || actor.isActive !== true)
        throw new AccountError(403, "Acesso à instituição indisponível.");
      const purchased = entitlement?.status === "active" && entitlement.programId === programId;
      if (!program || !purchased)
        throw new AccountError(403, "Esta trilha não está liberada para sua instituição.");
      return tx.query(`platformPrograms/${programId}`, "lessons", undefined, undefined, undefined, 500);
    });
    return NextResponse.json({ lessons }, { headers: privateHeaders });
  } catch (e) {
    return NextResponse.json({ error: e instanceof AccountError ? e.message : "Conteúdo indisponível." }, { status: e instanceof AccountError ? e.status : 503, headers: privateHeaders });
  }
}
