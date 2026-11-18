import { NextRequest } from "next/server";
import { AccountError, privateHeaders } from "../../../../../_lib/kids-media";
import { readVideoSession, videoRange } from "../../../../../_lib/course-videos";
import { courseVideoBucket } from "../../../../../_lib/course-video-storage";

type Context = { params: Promise<{ organizationId: string; videoId: string }> };
async function serve(req: NextRequest, context: Context, head = false) {
  let size: number | undefined;
  try {
    const { organizationId, videoId } = await context.params;
    const video = await readVideoSession(organizationId, videoId, req.cookies.get("esdras_video")?.value || "");
    size = video.size;
    const range = videoRange(req.headers.get("range"), video.size);
    const headers = {
      ...privateHeaders, Vary: "Cookie, Range", "content-type": "video/mp4", "accept-ranges": "bytes",
      "content-length": String(range.length), "content-disposition": "inline",
      ...(range.partial ? { "content-range": `bytes ${range.offset}-${range.offset + range.length - 1}/${video.size}` } : {}),
    };
    if (head) return new Response(null, { status: range.partial ? 206 : 200, headers });
    const object = await (await courseVideoBucket()).get(video.key, { range: { offset: range.offset, length: range.length } });
    if (!object) throw new AccountError(404, "Vídeo indisponível.");
    return new Response(object.body, { status: range.partial ? 206 : 200, headers });
  } catch (e) {
    return Response.json({ error: e instanceof AccountError ? e.message : "Não foi possível reproduzir o vídeo." }, { status: e instanceof AccountError ? e.status : 503, headers: { ...privateHeaders, ...(e instanceof AccountError && e.status === 416 && size ? { "content-range": `bytes */${size}` } : {}) } });
  }
}
export const GET = (req: NextRequest, context: Context) => serve(req, context);
export const HEAD = (req: NextRequest, context: Context) => serve(req, context, true);
