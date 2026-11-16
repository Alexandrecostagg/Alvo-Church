import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";
import { AccountError, boundedJson, privateHeaders } from "../../_lib/kids-media";
import { completeVideo, deleteVideo, startVideo, videoInventory } from "../../_lib/course-videos";

export async function POST(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    const data = await boundedJson(req, 3000);
    let result;
    switch (data.action) {
      case "inventory": result = await videoInventory(data.organizationId, uid, data.courseId); break;
      case "start": result = await startVideo(data, uid); break;
      case "complete": result = await completeVideo(data.organizationId, data.videoId, uid); break;
      case "delete": result = await deleteVideo(data.organizationId, data.videoId, uid); break;
      default: throw new AccountError(400, "Operação inválida.");
    }
    return NextResponse.json(result, { headers: privateHeaders });
  } catch (e) {
    return NextResponse.json({ error: e instanceof AccountError ? e.message : "Não foi possível concluir a operação de vídeo. Tente novamente." }, { status: e instanceof AccountError ? e.status : 503, headers: privateHeaders });
  }
}
