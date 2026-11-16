export const COURSE_VIDEO_PART_BYTES = 8 * 1024 * 1024;
export const COURSE_VIDEO_MAX_BYTES = 200 * 1000 * 1000;
export function courseVideoEmbedUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.replace(/^www\./, "");
    if (["youtube.com", "youtube-nocookie.com", "youtu.be"].includes(host)) {
      const id = host === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v") || url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1];
      return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const match = url.pathname.match(/^\/(?:video\/)?(\d+)(?:\/([A-Za-z0-9]+))?\/?$/);
      const privateHash = url.searchParams.get("h") || match?.[2];
      return match ? `https://player.vimeo.com/video/${match[1]}${privateHash ? `?h=${encodeURIComponent(privateHash)}` : ""}` : null;
    }
    if (["cloudflarestream.com", "videodelivery.net"].some(h => host === h || host.endsWith(`.${h}`))) {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && /^[A-Za-z0-9_-]+$/.test(id) ? `${url.origin}/${id}/iframe` : null;
    }
  } catch { /* Invalid URL */ }
  return null;
}
