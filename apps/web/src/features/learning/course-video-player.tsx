"use client";
import { useEffect, useState } from "react";
import { useAppAuth } from "../../../app/providers";
import { courseVideoEmbedUrl } from "../../lib/course-video";
import type { Lesson } from "@alvo/types";

export function CourseVideoPlayer({ lesson }: { lesson: Lesson }) {
  const { user, organizationId } = useAppAuth();
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setSource(""); setError("");
    if (!lesson.videoAssetId) return;
    void (async () => {
      if (!user) throw new Error("Entre na sua conta para assistir.");
      const response = await fetch("/api/learning/videos/access", { method: "POST", headers: { "content-type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ organizationId, videoId: lesson.videoAssetId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Vídeo indisponível.");
      if (active) setSource(data.url);
    })().catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [lesson.videoAssetId, organizationId, user, retry]);
  const style = { position: "absolute" as const, inset: 0, width: "100%", height: "100%", border: "none", zIndex: 2 };
  if (lesson.videoAssetId) {
    if (error) return <div role="alert" style={{ ...style, padding: 20, color: "white" }}>{error} <button onClick={() => setRetry(n => n + 1)}>Tentar novamente</button></div>;
    return source ? <video key={`${lesson.id}:${retry}`} src={source} controls playsInline preload="metadata" aria-label={lesson.title} style={style} onError={() => setError("Não foi possível reproduzir o vídeo. Tente renovar o acesso; se persistir, peça ao responsável para conferir o formato MP4 H.264/AAC.")} /> : <p role="status" style={{ ...style, padding: 20, color: "white" }}>Abrindo vídeo…</p>;
  }
  const embed = courseVideoEmbedUrl(lesson.videoUrl);
  return embed ? <iframe src={embed} style={style} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={lesson.title} /> : <p role="alert" style={{ ...style, padding: 20, color: "white" }}>Link do vídeo inválido. Peça ao responsável pelo curso para conferir o endereço.</p>;
}
