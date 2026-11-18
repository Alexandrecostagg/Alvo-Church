import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../../_lib/verify-auth";
import { AccountError, boundedJson, privateHeaders } from "../../../_lib/kids-media";
import { issueVideoAccess, playbackPath, redeemVideoHandoff } from "../../../_lib/course-videos";
import { documentId } from "../../../_lib/member-account";

export async function POST(req: NextRequest) {
  try {
    const data = await boundedJson(req, 2000);
    const org = documentId(data.organizationId, "Igreja");
    const id = documentId(data.videoId, "Vídeo");
    let credential: string;
    if (typeof data.ticket === "string") {
      credential = await redeemVideoHandoff(org, id, data.ticket);
    } else {
      const uid = await verifyFirebaseIdToken(req);
      if (!uid) throw new AccountError(401, "Entre na sua conta.");
      credential = await issueVideoAccess(org, id, uid, data.handoff === true);
      if (data.handoff === true) {
        return NextResponse.json({ watchPath: `/api/learning/videos/watch?organizationId=${org}&videoId=${id}#ticket=${credential}` }, { headers: privateHeaders });
      }
    }
    const path = playbackPath(org, id);
    const response = NextResponse.json({ url: path }, { headers: privateHeaders });
    response.cookies.set("esdras_video", credential, { httpOnly: true, secure: req.nextUrl.protocol === "https:", sameSite: "strict", path, maxAge: 4 * 60 * 60 });
    return response;
  } catch (e) {
    return NextResponse.json({ error: e instanceof AccountError ? e.message : "Não foi possível abrir o vídeo." }, { status: e instanceof AccountError ? e.status : 503, headers: privateHeaders });
  }
}
