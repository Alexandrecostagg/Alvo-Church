"use client";

import { useState, useRef, useEffect } from "react";

const FAQS = [
  {
    q: "Preciso de cartão de crédito para começar?",
    a: "Não. A conta grátis funciona imediatamente — você cadastra sua igreja, convida a equipe e já começa a usar. Só precisa de cartão para upgrade para plano pago.",
  },
  {
    q: "Quantos membros cabem no plano Gratuito?",
    a: "Até 100 membros cadastrados. É suficiente para igrejas que estão começando a organizar a gestão. Conforme a comunidade cresce, basta upgrade.",
  },
  {
    q: "A IA Pastoral substitui o pastor?",
    a: "Jamais. A IA é um auxiliar que sugere versículos, abordagens e próximos passos — mas a decisão final e o cuidado humano sempre são do pastor. Os limites éticos estão travados no sistema.",
  },
  {
    q: "Consegui migrar os dados de outra plataforma?",
    a: "Sim. Aceitamos importação de planilhas Excel/CSV com membros, células e finanças. A equipe ajuda no processo durante os 14 dias de teste dos planos pagos.",
  },
  {
    q: "Os dados da igreja são seguros?",
    a: "Sim. Usamos Firebase com regras de acesso por função, encriptação em trânsito e backups automáticos. Membros só veem o que a liderança permite.",
  },
  {
    q: "Posso usar com uma rede de igrejas?",
    a: "Sim — o plano Rede centraliza membros, finanças e células de todas as filiais em um único painel. Cada igreja mantém sua autonomia, a rede tem visão consolidada.",
  },
  {
    q: "Escala de voluntários funciona automaticamente?",
    a: "A plataforma monta a escala com os voluntários disponíveis e envia notificação para confirmação. O líder só valida — em minutos, tudo pronto.",
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
            Se a dúvida não estiver aqui, chama a gente no WhatsApp que respondemos em minutos.
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
