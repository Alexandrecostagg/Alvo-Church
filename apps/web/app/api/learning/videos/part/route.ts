import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../../_lib/verify-auth";
import { AccountError, privateHeaders } from "../../../_lib/kids-media";
import { uploadVideoPart } from "../../../_lib/course-videos";
import { COURSE_VIDEO_PART_BYTES } from "../../../../../src/lib/course-video";

export async function PUT(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    const reader = req.body?.getReader();
    if (!reader) throw new AccountError(400, "Arquivo vazio.");
    const bytes = new Uint8Array(COURSE_VIDEO_PART_BYTES);
    let size = 0;
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      if (size + value.length > bytes.length) { await reader.cancel(); throw new AccountError(413, "Parte de vídeo muito grande."); }
      bytes.set(value, size); size += value.length;
    }
    const q = req.nextUrl.searchParams;
    const result = await uploadVideoPart(q.get("organizationId") || "", q.get("videoId") || "", uid, Number(q.get("part")), bytes.subarray(0, size));
    return NextResponse.json(result, { headers: privateHeaders });
  } catch (e) {
    return NextResponse.json({ error: e instanceof AccountError ? e.message : "Envio interrompido. Tente novamente." }, { status: e instanceof AccountError ? e.status : 503, headers: privateHeaders });
  }
}
