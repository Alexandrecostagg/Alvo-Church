"use client";
import { useEffect, useRef, useState } from "react";
import { CourseVideoPlayer } from "./course-video-player";
import { useAppAuth } from "../../../app/providers";
import { COURSE_VIDEO_MAX_BYTES, COURSE_VIDEO_PART_BYTES } from "../../lib/course-video";

type Asset = { id: string; name: string; size: number; status: string; lessonId: string | null };
type Inventory = { usedBytes: number; quotaBytes: number; videos: Asset[] };
const mb = (bytes: number) => `${(bytes / 1_000_000).toFixed(1)} MB`;
export function CourseVideoInput({ courseId, value, disabled, onChange }: { courseId: string; value?: string; disabled: boolean; onChange: (id: string) => void }) {
  const { user, organizationId } = useAppAuth();
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  async function request(body: Record<string, unknown>) {
    if (!user) throw new Error("Entre na sua conta.");
    const response = await fetch("/api/learning/videos", { method: "POST", headers: { "content-type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ ...body, organizationId, courseId }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Não foi possível atualizar os vídeos.");
    return data;
  }
  async function refresh() {
    const data = await request({ action: "inventory" });
    if (mounted.current) setInventory(data);
  }
  useEffect(() => {
    mounted.current = true;
    void refresh().catch(e => setMessage(e.message));
    return () => { mounted.current = false; controller.current?.abort(); };
    // The parent remounts this input whenever the course/organization changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, organizationId, user]);
  async function validate(file: File) {
    if (!/\.mp4$/i.test(file.name) || file.size > COURSE_VIDEO_MAX_BYTES || file.size < 24) throw new Error("Selecione um MP4 de até 200 MB.");
    if (inventory && inventory.usedBytes + file.size > inventory.quotaBytes) throw new Error("Este arquivo ultrapassa o espaço disponível. Remova vídeos sem uso ou utilize um link.");
    const url = URL.createObjectURL(file);
    try {
      await new Promise<void>((resolve, reject) => {
        const video = document.createElement("video");
        const timer = setTimeout(() => { cleanup(); reject(new Error("Não foi possível validar o vídeo. Exporte em MP4 H.264/AAC e tente novamente.")); }, 15000);
        const cleanup = () => { clearTimeout(timer); video.removeAttribute("src"); video.load(); };
        video.preload = "metadata";
        video.onloadedmetadata = () => { const valid = Number.isFinite(video.duration) && video.duration > 0 && video.videoWidth > 0; cleanup(); valid ? resolve() : reject(new Error("Arquivo sem vídeo reproduzível.")); };
        video.onerror = () => { cleanup(); reject(new Error("Vídeo incompatível. Exporte em MP4 com vídeo H.264 e áudio AAC.")); };
        video.src = url;
      });
    } finally { URL.revokeObjectURL(url); }
  }
  async function upload(file: File) {
    if (controller.current || busy || !user) return;
    const abort = new AbortController(); controller.current = abort;
    setBusy(true); setProgress(0); setMessage("Conferindo o arquivo…");
    let videoId: string | undefined;
    try {
      await validate(file);
      if (abort.signal.aborted) throw new Error("Envio cancelado.");
      onChange("");
      videoId = crypto.randomUUID();
      await request({ action: "start", videoId, name: file.name, size: file.size, contentType: "video/mp4" });
      setMessage("Enviando vídeo. Mantenha esta tela aberta.");
      for (let offset = 0, part = 1; offset < file.size; offset += COURSE_VIDEO_PART_BYTES, part++) {
        if (abort.signal.aborted) throw new Error("Envio cancelado.");
        const query = new URLSearchParams({ organizationId, videoId, part: String(part) });
        let sent = false;
        for (let retry = 0; retry < 3 && !sent; retry++) {
          try {
            const res = await fetch(`/api/learning/videos/part?${query}`, { method: "PUT", headers: { Authorization: `Bearer ${await user.getIdToken()}`, "content-type": "application/octet-stream" }, body: file.slice(offset, offset + COURSE_VIDEO_PART_BYTES), signal: abort.signal });
            if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Falha no envio."); }
            sent = true;
          } catch (e) { if (abort.signal.aborted || retry === 2) throw e; }
        }
        if (mounted.current) setProgress(Math.min(99, Math.floor(Math.min(offset + COURSE_VIDEO_PART_BYTES, file.size) / file.size * 100)));
      }
      if (abort.signal.aborted) throw new Error("Envio cancelado.");
      setMessage("Finalizando o vídeo…");
      await request({ action: "complete", videoId });
      if (mounted.current) { onChange(videoId); setProgress(100); setMessage("Vídeo enviado. Preencha os dados e clique em Adicionar aula para vinculá-lo."); }
    } catch (e) {
      let cleanup = "";
      if (videoId) {
        try { await request({ action: "delete", videoId }); }
        catch { cleanup = " O arquivo continua reservado: use Finalizar ou Remover na lista abaixo."; }
      }
      if (mounted.current) { setProgress(null); setMessage((abort.signal.aborted ? "Envio cancelado." : e instanceof Error ? e.message : "Falha no envio.") + cleanup); }
    } finally {
      controller.current = null;
      if (mounted.current) { setBusy(false); void refresh().catch(e => setMessage(e.message)); }
    }
  }
  async function remove(video: Asset) {
    if (!window.confirm(`Remover o vídeo “${video.name}” e liberar seu espaço?`)) return;
    setBusy(true);
    try { await request({ action: "delete", videoId: video.id }); if (value === video.id) onChange(""); await refresh(); setMessage("Vídeo removido. Espaço liberado."); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Não foi possível remover."); }
    finally { setBusy(false); }
  }
  async function complete(video: Asset) {
    setBusy(true);
    try { await request({ action: "complete", videoId: video.id }); await refresh(); onChange(video.id); setMessage("Vídeo finalizado. Adicione a aula para vinculá-lo."); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Não foi possível finalizar."); }
    finally { setBusy(false); }
  }
  return <section aria-label="Vídeo enviado pelo Esdras" style={{ display: "grid", gap: 10, padding: 14, border: "1px solid var(--alvo-line)", borderRadius: 12 }}>
    <strong>Vídeo no Esdras</strong>
    <span>{inventory ? `${mb(inventory.usedBytes)} de ${mb(inventory.quotaBytes)} utilizados pela instituição (inclui envios pendentes).` : "Consultando espaço disponível…"}</span>
    <small>MP4, até 200 MB por arquivo. Recomendado: H.264/AAC, 720p. O vídeo será acessível aos alunos quando o curso for publicado.</small>
    <input type="file" accept="video/mp4,.mp4" aria-label="Selecionar vídeo MP4" disabled={disabled || busy || !inventory} onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void upload(file); }} />
    {progress !== null && <><progress value={progress} max={100} style={{ width: "100%" }} aria-label="Progresso do envio" /><span>{progress}%</span></>}
    {controller.current && <button type="button" className="btn-secondary" onClick={() => controller.current?.abort()}>Cancelar envio</button>}
    {message && <p role="status" style={{ margin: 0 }}>{message}</p>}
    <label>Ou selecione um vídeo já enviado neste curso
      <select value={value || ""} disabled={disabled || busy} onChange={e => onChange(e.target.value)} style={{ display: "block", width: "100%", padding: 12 }}>
        <option value="">Selecione o vídeo</option>
        {inventory?.videos.filter(v => v.status === "ready" && (!v.lessonId || v.id === value)).map(v => <option key={v.id} value={v.id}>{v.name} · {mb(v.size)}</option>)}
      </select>
    </label>
    {value && <div style={{ position: "relative", aspectRatio: "16/9", background: "#102b24", borderRadius: 12, overflow: "hidden" }}>
      <CourseVideoPlayer key={value} lesson={{ id: value, organizationId, courseId, moduleId: "preview", title: "Prévia do vídeo enviado", videoUrl: "", videoAssetId: value, durationMinutes: 0, sortOrder: 0 }} />
    </div>}
    {!!inventory?.videos.length && <details><summary>Gerenciar arquivos e liberar espaço</summary><p>Vídeos de aulas removidas podem ser excluídos aqui. Remova primeiro a aula se o arquivo estiver em uso.</p>
      {inventory.videos.map(v => <div key={v.id} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBlock: 8 }}>
        <span style={{ flex: 1, overflowWrap: "anywhere" }}>{v.name} · {mb(v.size)} · {v.status === "ready" ? "Enviado" : "Pendente"}</span>
        {v.status === "finishing" && <button type="button" disabled={disabled || busy} onClick={() => void complete(v)}>Finalizar</button>}
        <button type="button" disabled={disabled || busy || v.status === "finishing"} onClick={() => void remove(v)}>Remover</button>
      </div>)}
    </details>}
  </section>;
}
