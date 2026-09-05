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

export function TestimonialsClient() {
  return (
    <div className="lp-testimonials-grid">
      {TESTIMONIALS.map((t) => (
        <div key={t.name} className="lp-testimonial-card">
          <div className="lp-testimonial-metric">
            <span className="lp-testimonial-metric-value">{t.metric}</span>
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
  );
}
