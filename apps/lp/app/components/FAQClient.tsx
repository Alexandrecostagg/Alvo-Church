"use client";

import { useState, useRef } from "react";

const FAQS = [
  {
    q: "Preciso de cartão de crédito para começar?",
    a: "Não. A conta grátis funciona imediatamente — você cadastra sua igreja, convida a equipe e já começa a usar. Só precisa de cartão para upgrade para plano pago.",
  },
  {
    q: "Quantos membros cabem no plano Gratuito?",
    a: "Até 50 membros cadastrados. É suficiente para igrejas que estão começando a organizar a gestão. Conforme a comunidade cresce, basta upgrade.",
  },
  {
    q: "A IA Pastoral substitui o pastor?",
    a: "Jamais. A IA é um auxiliar que sugere versículos, abordagens e próximos passos — mas a decisão final e o cuidado humano sempre são do pastor. Os limites éticos estão travados no sistema.",
  },
  {
    q: "Consigo migrar os dados de outra plataforma?",
    a: "A equipe analisa a origem e o formato antes da migração. Fale conosco para conferir o que pode ser importado com segurança.",
  },
  {
    q: "Os dados da igreja são seguros?",
    a: "A plataforma separa os dados por igreja, valida papéis de acesso e protege operações sensíveis no servidor. A política de privacidade explica o tratamento dos dados.",
  },
  {
    q: "Posso usar com uma rede de igrejas?",
    a: "Sim — o plano Rede centraliza membros, finanças e células de todas as filiais em um único painel. Cada igreja mantém sua autonomia, a rede tem visão consolidada.",
  },
  {
    q: "Escala de voluntários funciona automaticamente?",
    a: "O líder monta a escala e acompanha aceite, recusa e trocas. A confirmação pelo app depende do vínculo da conta do voluntário.",
  },
];

export function FAQClient() {
  const [open, setOpen] = useState<number | null>(null);
  const accordionRef = useRef<HTMLDivElement>(null);

  return (
    <div className="lp-faq" id="perguntas">
      <div className="lp-faq-inner">
        <div className="lp-faq-header">
          <span className="lp-faq-eyebrow">Tirando dúvidas</span>
          <h2>Perguntas frequentes</h2>
          <p>
            Se a dúvida não estiver aqui, envie uma mensagem para a equipe pelo WhatsApp.
          </p>
        </div>

        <div className="lp-faq-accordion" ref={accordionRef}>
          {FAQS.map((item, i) => (
            <div
              key={i}
              className={`lp-faq-item${open === i ? " open" : ""}`}
              data-faq-index={i}
            >
              <button
                type="button"
                className="lp-faq-question"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
                aria-controls={`lp-faq-answer-${i}`}
              >
                <span>{item.q}</span>
                <span className="lp-faq-chevron" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M4 6l4 4 4-4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>
              <div
                id={`lp-faq-answer-${i}`}
                className="lp-faq-answer"
                role="region"
                hidden={open !== i}
              >
                <p>{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
