"use client";

import Image from "next/image";
import { useState } from "react";

const MODULES = [
  {
    tag: "Pessoas",
    title: "Membros & Visitantes",
    subtitle: "Cadastros e vínculos em um só lugar",
    description:
      "Organize os cadastros de membros e visitantes, suas famílias e vínculos com a instituição. A equipe consulta as informações conforme suas permissões de acesso.",
    visual: "reception",
    image: "/product/members-demo.webp",
    imageAlt:
      "Demonstração ilustrativa da Plataforma Esdras para gestão de membros, famílias e visitantes",
  },
  {
    tag: "Células",
    title: "Grupos & Discipulado",
    subtitle: "Ninguém se perde no meio da multidão",
    description:
      "Presença por célula, jornada de discipulado por membro e radar de quem está se afastando — antes que a liderança precise perguntar. Você enxerga a igreja como um organismo vivo.",
    visual: "groups",
    image: "/product/groups-demo.webp",
    imageAlt:
      "Demonstração ilustrativa da Plataforma Esdras para gestão de células e integração de pessoas",
  },
  {
    tag: "IA Pastoral",
    title: "Cuidado Pastoral com IA",
    subtitle: "Um auxiliar que conhece a Bíblia profundamente",
    description:
      "O pastor descreve a situação e a IA sugere abordagem, versículos e próximos passos — respeitando os limites do cuidado pastoral e nunca substituindo o discernimento humano.",
    visual: "ai",
    image: "/product/pastoral-ai-demo.webp",
    imageAlt:
      "Demonstração ilustrativa da Plataforma Esdras para cuidado pastoral supervisionado com IA",
  },
  {
    tag: "Escalas",
    title: "Escalas & Voluntários",
    subtitle: "Escala pronta em minutos, não em horas",
    description:
      "Monte a escala de louvor, portaria e kids, acompanhe confirmações e organize trocas. Cada voluntário confirma presença pelo celular quando a conta está vinculada.",
    visual: "serving",
    image: "/product/serving-demo.webp",
    imageAlt: "Demonstração ilustrativa da Plataforma Esdras para escalas e voluntários",
  },
  {
    tag: "Finanças",
    title: "Finanças Transparentes",
    subtitle: "Relatório mensal com um clique",
    description:
      "Lançamentos de dízimos e ofertas, controle de despesas, metas e relatório mensal com um clique. Dados só para quem deve ver. A congregação tem transparência, a liderança tem controle.",
    visual: "finance",
    image: "/product/finance-demo.webp",
    imageAlt:
      "Demonstração ilustrativa da Plataforma Esdras para gestão financeira e transparência",
  },
] as const;

function ModuleVisual({
  image,
  imageAlt,
}: {
  image: string;
  imageAlt: string;
}) {
  return (
    <figure className="lp-product-shot">
      <Image
        src={image}
        alt={imageAlt}
        width={1672}
        height={941}
        sizes="(max-width: 780px) 100vw, 62vw"
      />
      <figcaption>
        Demonstração ilustrativa da interface · dados fictícios
      </figcaption>
    </figure>
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
        {MODULES.map((module, index) => (
          <button
            key={module.title}
            type="button"
            role="tab"
            aria-selected={index === active}
            className={`lp-module-tab${index === active ? " active" : ""}`}
            onClick={() => setActive(index)}
            data-analytics-event="module_view"
            data-analytics-placement="modules"
            data-analytics-target={module.visual}
          >
            {module.tag}
          </button>
        ))}
      </div>
      <div className="lp-module-row lp-module-panel" key={mod.title}>
        <div className="lp-module-text">
          <span className="lp-module-tag">{mod.tag}</span>
          <h3>
            {mod.title}
            <span className="lp-module-subtitle">{mod.subtitle}</span>
          </h3>
          <p>{mod.description}</p>
          <a
            href="https://alvo-church-web.alexandrecostagg.workers.dev/signup"
            className="lp-btn-primary"
            data-analytics-event="primary_cta_click"
            data-analytics-placement={`module-${mod.visual}`}
            data-analytics-target="signup"
          >
            Experimentar →
          </a>
        </div>
        <div className="lp-module-visual">
          <ModuleVisual image={mod.image} imageAlt={mod.imageAlt} />
        </div>
      </div>
    </>
  );
}
