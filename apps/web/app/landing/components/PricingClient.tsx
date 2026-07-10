"use client";

import Link from "next/link";
import { useState } from "react";

const PLANS = [
  {
    id: "free",
    name: "Gratuito",
    priceMonthly: 0,
    desc: "Para igrejas começando",
    features: ["Até 50 membros", "Recepção & visitantes", "Cadastro completo", "Dashboard básico"],
    cta: "Começar grátis",
    highlight: false,
  },
  {
    id: "comunidade",
    name: "Comunidade",
    priceMonthly: 79,
    desc: "Gestão completa do dia a dia",
    features: [
      "Até 300 membros",
      "Tribos & Células",
      "Finanças & Doações (PIX)",
      "Eventos & Comunicação",
      "50 consultas de IA/mês",
    ],
    cta: "Começar 14 dias grátis",
    highlight: false,
  },
  {
    id: "pastoral",
    name: "Pastoral",
    priceMonthly: 159,
    desc: "IA e crescimento sem limites",
    features: [
      "Membros ilimitados",
      "IA Pastoral completa",
      "500 consultas de IA/mês",
      "Escalas & Voluntários",
      "Escola EAD",
      "Marketplace da comunidade",
    ],
    cta: "Começar 14 dias grátis",
    highlight: true,
  },
  {
    id: "rede",
    name: "Rede",
    priceMonthly: 399,
    desc: "Para denominações e redes",
    features: [
      "Tudo do Pastoral",
      "Até 10 igrejas filiais",
      "Painel unificado de rede",
      "Financeiro consolidado",
      "Suporte prioritário",
    ],
    cta: "Falar com consultor",
    highlight: false,
  },
];

const ANNUAL_DISCOUNT = 0.2;

export function PricingClient() {
  const [annual, setAnnual] = useState(false);

  return (
    <>
      <div className="lp-pricing-toggle">
        <span className={annual ? "" : "active"}>Mensal</span>
        <button
          type="button"
          role="switch"
          aria-checked={annual}
          aria-label="Alternar entre cobrança mensal e anual"
          className={`lp-toggle-switch${annual ? " on" : ""}`}
          onClick={() => setAnnual((a) => !a)}
        >
          <span className="lp-toggle-thumb" />
        </button>
        <span className={annual ? "active" : ""}>
          Anual <span className="lp-toggle-badge">-20%</span>
        </span>
      </div>

      <div className="lp-pricing-grid">
        {PLANS.map((plan) => {
          const price = annual ? Math.round(plan.priceMonthly * (1 - ANNUAL_DISCOUNT)) : plan.priceMonthly;
          return (
            <div key={plan.id} className={`lp-plan-card${plan.highlight ? " highlight" : ""}`}>
              {plan.highlight && <div className="lp-plan-badge">Mais popular</div>}
              <div className="lp-plan-name">{plan.name}</div>
              <div className="lp-plan-price">
                <strong>{price === 0 ? "R$ 0" : `R$ ${price.toLocaleString("pt-BR")}`}</strong>
                <span>/mês</span>
              </div>
              {annual && plan.priceMonthly > 0 && (
                <div className="lp-plan-annual-note">cobrado R$ {(price * 12).toLocaleString("pt-BR")}/ano</div>
              )}
              <div className="lp-plan-desc">{plan.desc}</div>
              <ul className="lp-plan-features">
                {plan.features.map((f) => (
                  <li key={f}>
                    <span className="lp-check">✓</span> {f}
                  </li>
                ))}
              </ul>
              {plan.id === "rede" ? (
                <a
                  href="https://wa.me/5562993330336?text=Ol%C3%A1!%20Somos%20uma%20rede%20de%20igrejas%20e%20quero%20saber%20mais%20sobre%20a%20Plataforma%20Esdras."
                  target="_blank"
                  rel="noreferrer"
                  className={`lp-plan-cta${plan.highlight ? " primary" : ""}`}
                >
                  {plan.cta}
                </a>
              ) : (
                <Link href="/signup" className={`lp-plan-cta${plan.highlight ? " primary" : ""}`}>
                  {plan.cta}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
