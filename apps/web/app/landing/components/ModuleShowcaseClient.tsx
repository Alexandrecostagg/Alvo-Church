"use client";

import Link from "next/link";
import { useState } from "react";

const MODULES = [
  {
    tag: "Recepção",
    title: "Recepção & Visitantes",
    subtitle: "Cada visitante conhecido em segundos",
    description:
      "Check-in digital no culto, ficha do visitante, follow-up automático e painel do pastor em tempo real — tudo na tela enquanto o culto acontece. Pastor sabe quem chegou antes de descer do palco.",
    visual: "reception",
  },
  {
    tag: "Células",
    title: "Grupos & Discipulado",
    subtitle: "Ninguém se perde no meio da multidão",
    description:
      "Presença por célula, jornada de discipulado por membro e radar de quem está se afastando — antes que a liderança precise perguntar. Você enxerga a igreja como um organismo vivo.",
    visual: "groups",
  },
  {
    tag: "IA Pastoral",
    title: "Cuidado Pastoral com IA",
    subtitle: "Um auxiliar que conhece a Bíblia profundamente",
    description:
      "O pastor descreve a situação e a IA sugere abordagem, versículos e próximos passos — respeitando os limites do cuidado pastoral e nunca substituindo o discernimento humano.",
    visual: "ai",
  },
  {
    tag: "Escalas",
    title: "Escalas & Voluntários",
    subtitle: "Escala pronta em minutos, não em horas",
    description:
      "Monte a escala de louvor, portaria e kids em minutos. Cada voluntário recebe notificação automática e confirma presença pelo celular. Fim dos grupos de WhatsApp confusos.",
    visual: "serving",
  },
  {
    tag: "Finanças",
    title: "Finanças Transparentes",
    subtitle: "Relatório mensal com um clique",
    description:
      "Lançamentos de dízimos e ofertas, controle de despesas, metas e relatório mensal com um clique. Dados só para quem deve ver. A congregação tem transparência, a liderança tem controle.",
    visual: "finance",
  },
];

function VisualChrome() {
  return (
    <div className="lp-visual-chrome">
      <span className="lp-visual-chrome-dot" />
      <span className="lp-visual-chrome-dot" />
      <span className="lp-visual-chrome-dot" />
    </div>
  );
}

function ModuleVisual({ type }: { type: string }) {
  if (type === "reception") {
    return (
      <div className="lp-visual-card">
        <VisualChrome />
        <div className="lp-visual-header">Recepção · Culto de Domingo</div>
        <div className="lp-visual-row highlight">
          <span className="lp-visual-dot green live" /> João Silva —{" "}
          <em>1ª visita</em>
          <span className="lp-visual-badge">Novo</span>
        </div>
        <div className="lp-visual-row">
          <span className="lp-visual-dot blue" /> Maria Souza — Membro
        </div>
        <div className="lp-visual-row">
          <span className="lp-visual-dot blue" /> Pedro Alves — Membro
        </div>
        <div className="lp-visual-row">
          <span className="lp-visual-dot green live" /> Ana Lima —{" "}
          <em>2ª visita</em>
          <span className="lp-visual-badge">Retorno</span>
        </div>
        <div className="lp-visual-footer">
          <span>47 presentes · 3 visitantes</span>
          <span>Atualizado agora</span>
        </div>
      </div>
    );
  }
  if (type === "groups") {
    return (
      <div className="lp-visual-card">
        <VisualChrome />
        <div className="lp-visual-header">
          Células · Presença dos últimos 6 encontros
        </div>
        <div className="lp-visual-bars">
          {[
            { label: "CG Centro", value: 92 },
            { label: "CG Norte", value: 78 },
            { label: "CG Jardins", value: 65 },
            { label: "Jovens", value: 88 },
          ].map((row) => (
            <div key={row.label} className="lp-visual-bar-row">
              <span className="lp-visual-bar-label">{row.label}</span>
              <span className="lp-visual-bar-track">
                <span
                  className="lp-visual-bar-fill"
                  style={{ width: `${row.value}%` }}
                />
              </span>
              <span className="lp-visual-bar-value">{row.value}%</span>
            </div>
          ))}
        </div>
        <div className="lp-visual-footer">
          <span>3 pessoas há 30+ dias sem célula</span>
          <span className="lp-visual-badge">Radar Pastoral</span>
        </div>
      </div>
    );
  }
  if (type === "ai") {
    return (
      <div className="lp-visual-card lp-visual-chat">
        <VisualChrome />
        <div className="lp-visual-header">IA Pastoral</div>
        <div className="lp-visual-bubble user">
          Um membro está passando por depressão severa. Como posso ajudar
          pastoralmente?
        </div>
        <div className="lp-visual-bubble ai">
          <strong>Abordagem sugerida:</strong> Presença e escuta ativa
          primeiro. Indicar acompanhamento profissional paralelamente. Versículo
          inicial: Salmo 34:18
          <span className="lp-visual-cursor" />
          <div className="lp-visual-disclaimer">
            Sugestão pastoral · Valide com seu discernimento
          </div>
        </div>
      </div>
    );
  }
  if (type === "serving") {
    return (
      <div className="lp-visual-card">
        <VisualChrome />
        <div className="lp-visual-header">Escalas · Culto de Domingo</div>
        <div className="lp-visual-schedule">
          {[
            { label: "Louvor", filled: true },
            { label: "Portaria", filled: true },
            { label: "Kids", filled: true },
            { label: "Recepção", filled: false },
            { label: "Som", filled: true },
            { label: "Mídia", filled: false },
            { label: "Diáconos", filled: true },
            { label: "Louvor 2", filled: true },
          ].map((slot) => (
            <div
              key={slot.label}
              className={`lp-visual-slot${slot.filled ? " filled" : ""}`}
            >
              {slot.label}
            </div>
          ))}
        </div>
        <div className="lp-visual-footer">
          <span>6 de 8 posições confirmadas</span>
          <span>Notificado às 08:00</span>
        </div>
      </div>
    );
  }
  return (
    <div className="lp-visual-card">
      <VisualChrome />
      <div className="lp-visual-header">Finanças · Junho 2025</div>
      <div className="lp-visual-finance-row">
        <span>Dízimos</span>
        <span className="lp-visual-green">R$ 38.420</span>
      </div>
      <div className="lp-visual-finance-row">
        <span>Ofertas</span>
        <span className="lp-visual-green">R$ 4.100</span>
      </div>
      <div className="lp-visual-finance-row border-top">
        <span>Total entradas</span>
        <strong className="lp-visual-green">R$ 42.520</strong>
      </div>
      <div className="lp-visual-finance-row">
        <span>Despesas</span>
        <span className="lp-visual-red">R$ 28.900</span>
      </div>
      <div className="lp-visual-finance-row border-top">
        <span>Saldo</span>
        <strong className="lp-visual-green">R$ 13.620</strong>
      </div>
    </div>
  );
}

export function ModuleShowcaseClient() {
  const [active, setActive] = useState(0);
  const mod = MODULES[active]!;

  return (
    <>
      <div
        className="lp-module-tabs"
        role="tablist"
        aria-label="Módulos da plataforma"
      >
        {MODULES.map((m, i) => (
          <button
            key={m.title}
            type="button"
            role="tab"
            aria-selected={i === active}
            className={`lp-module-tab${i === active ? " active" : ""}`}
            onClick={() => setActive(i)}
          >
            {m.tag}
          </button>
        ))}
      </div>
      <div className="lp-module-row lp-module-panel" key={mod.title}>
        <div className="lp-module-text">
          <span className="lp-module-tag">{mod.tag}</span>
          <h3>
            {mod.title}
            <br />
            <span className="lp-module-subtitle">{mod.subtitle}</span>
          </h3>
          <p>{mod.description}</p>
          <Link href="/signup" className="lp-btn-primary">
            Experimentar →
          </Link>
        </div>
        <div className="lp-module-visual">
          <ModuleVisual type={mod.visual} />
        </div>
      </div>
    </>
  );
}
