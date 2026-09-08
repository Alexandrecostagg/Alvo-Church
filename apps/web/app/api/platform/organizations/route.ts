import { NextRequest, NextResponse } from "next/server";
import { boundedJson, privateHeaders } from "../../_lib/kids-media";
import { AccountError } from "../../_lib/member-account-store";
import {
  readPlatformOrganization,
  removePlatformUser,
  updatePlatformModules,
  updatePlatformOrganization,
  updatePlatformPlan,
  updatePlatformUser,
} from "../../_lib/platform-organization-admin";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";

export async function POST(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    const body = await boundedJson(req, 16_000);
    const result =
      body.action === "detail"
        ? await readPlatformOrganization(body, uid)
        : body.action === "updateOrganization"
          ? await updatePlatformOrganization(body, uid)
          : body.action === "updatePlan"
            ? await updatePlatformPlan(body, uid)
            : body.action === "updateModules"
              ? await updatePlatformModules(body, uid)
              : body.action === "updateUser"
                ? await updatePlatformUser(body, uid)
                : body.action === "removeUser"
                  ? await removePlatformUser(body, uid)
                  : (() => {
                      throw new AccountError(400, "Operação inválida.");
                    })();
    return NextResponse.json(result, { headers: privateHeaders });
  } catch (error) {
    if (!(error instanceof AccountError))
      console.error(
        "[platform-organizations] operação não concluída",
        error instanceof Error ? error.message : "unknown",
      );
    return NextResponse.json(
      {
        error:
          error instanceof AccountError
            ? error.message
            : "Não foi possível concluir a gestão da instituição.",
      },
      {
        status: error instanceof AccountError ? error.status : 503,
        headers: privateHeaders,
      },
    );
  }
}
