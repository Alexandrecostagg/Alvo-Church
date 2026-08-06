"use client";

import { useEffect, useRef, useState } from "react";

const TESTIMONIALS = [
  {
    name: "Pr. Carlos Mendes",
    church: "Igreja Batista Nova Esperança, SP",
    text: "Antes eu ficava 5 horas por semana em planilhas. Hoje lanço o culto em 5 minutos e já tenho o relatório do mês automaticamente. Economizo mais de 20 horas por mês — e isso voltou a significar tempo pro rebanho.",
    avatar: "CM",
    metric: "20h/mês economizadas",
  },
  {
    name: "Pastora Renata Oliveira",
    church: "Comunidade Shalom, MG",
    text: "A IA Pastoral me ajuda a pensar melhor nas situações difíceis. Não substitui o discernimento, mas é como ter um auxiliar que conhece a Bíblia profundamente. Uso antes de cada visita pastoral — e os membros notam a diferença.",
    avatar: "RO",
    metric: "Antes de cada visita",
  },
  {
    name: "Pr. Diego Ferreira",
    church: "Rede Avivamento, RS — 12 igrejas",
    text: "Com o plano Rede, consigo ver todas as nossas igrejas em um painel. Membros, finanças, células. Antes eu demorava 3 dias para consolidar o relatório da rede. Agora tenho em tempo real. Nunca tivemos essa visão antes.",
    avatar: "DF",
    metric: "De 3 dias para tempo real",
  },
];

const AUTOPLAY_MS = 5500;

export function TestimonialsClient() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const hovering = useRef(false);

  function scrollToIndex(i: number) {
    const track = trackRef.current;
    if (!track) return;
    const card = track.children[i] as HTMLElement | undefined;
    if (card)
      track.scrollTo({
        left: card.offsetLeft - track.offsetLeft,
        behavior: "smooth",
      });
    setIndex(i);
  }

  useEffect(() => {
    const id = setInterval(() => {
      if (hovering.current) return;
      setIndex((prev) => {
        const next = (prev + 1) % TESTIMONIALS.length;
        scrollToIndex(next);
        return next;
      });
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="lp-testimonials-wrap">
      <div
        className="lp-testimonials-grid"
        ref={trackRef}
        onMouseEnter={() => {
          hovering.current = true;
        }}
        onMouseLeave={() => {
          hovering.current = false;
        }}
      >
        {TESTIMONIALS.map((t) => (
          <div key={t.name} className="lp-testimonial-card">
            <div className="lp-testimonial-metric">
              <span className="lp-testimonial-metric-value">
                {t.metric}
              </span>
            </div>
            <p className="lp-testimonial-text">"{t.text}"</p>
            <div className="lp-testimonial-author">
              <div className="lp-testimonial-avatar">{t.avatar}</div>
              <div>
                <strong>{t.name}</strong>
                <span>{t.church}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="lp-testimonials-dots">
        {TESTIMONIALS.map((t, i) => (
          <button
            key={t.name}
            type="button"
            className={`lp-dot${i === index ? " active" : ""}`}
            onClick={() => scrollToIndex(i)}
            aria-label={`Ver depoimento de ${t.name}`}
          />
        ))}
      </div>
    </div>
  );
}
