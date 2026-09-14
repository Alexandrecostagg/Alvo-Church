"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

const MODULES = [
  {
    tag: "Pessoas",
    title: "Membros & Visitantes",
    subtitle: "Cadastros e vínculos em um só lugar",
    description:
      "Organize os cadastros de membros e visitantes, suas famílias e vínculos com a instituição. A equipe consulta as informações conforme suas permissões de acesso.",
    visual: "reception",
    image: "/product/members-capture.webp",
    imageAlt:
      "Captura real do ambiente demonstrativo Esdras: gestão de membros, famílias e visitantes",
  },
  {
    tag: "Células",
    title: "Grupos & Discipulado",
    subtitle: "Participantes, encontros e acompanhamento",
    description:
      "Vincule participantes, abra encontros e registre presenças. A liderança acompanha a capacidade dos grupos e os sinais de cuidado a partir dos registros da equipe.",
    visual: "groups",
    image: "/product/groups-capture.webp",
    imageAlt:
      "Captura real do ambiente demonstrativo Esdras: gestão de células e integração de pessoas",
  },
  {
    tag: "IA Pastoral",
    title: "Cuidado Pastoral com IA",
    subtitle: "Pedidos organizados, revisão humana sempre",
    description:
      "Organize solicitações e responsáveis pelo acompanhamento. Os rascunhos de IA dependem da configuração e da cota do plano e passam por revisão da liderança. A captura mostra a fila antes do primeiro pedido.",
    visual: "ai",
    image: "/product/pastoral-ai-capture.webp",
    imageAlt:
      "Captura real do ambiente demonstrativo Esdras: cuidado pastoral supervisionado com IA",
  },
  {
    tag: "Escalas",
    title: "Escalas & Voluntários",
    subtitle: "Escala pronta em minutos, não em horas",
    description:
      "Monte a escala de louvor, portaria e kids, acompanhe confirmações e organize trocas. Cada voluntário confirma presença pelo celular quando a conta está vinculada.",
    visual: "serving",
    image: "/product/serving-capture.webp",
    imageAlt: "Captura real do ambiente demonstrativo Esdras: escalas e voluntários",
  },
  {
    tag: "Finanças",
    title: "Finanças Transparentes",
    subtitle: "Relatório mensal com um clique",
    description:
      "Consulte entradas, despesas e registros de missões, filtre lançamentos e exporte o relatório mensal em CSV. O acesso segue as permissões da equipe; os registros não substituem o extrato bancário.",
    visual: "finance",
    image: "/product/finance-capture.webp",
    imageAlt:
      "Captura real do ambiente demonstrativo Esdras: gestão financeira e transparência",
  },
] as const;

function ModuleVisual({
  image,
  imageAlt,
}: {
  image: string;
  imageAlt: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <figure className="lp-product-shot">
      <Image
        src={image}
        alt={imageAlt}
        width={1433}
        height={1000}
        sizes="(max-width: 780px) 100vw, 62vw"
      />
      <figcaption>
        <span>Captura real · ambiente de demonstração · dados fictícios</span>
        <button type="button" className="lp-capture-open" onClick={() => {
          const modal = dialog.current;
          if (!modal) return;
          modal.showModal();
          const scroller = modal.querySelector<HTMLDivElement>(".lp-capture-scroll");
          if (scroller) scroller.scrollLeft = (scroller.scrollWidth - scroller.clientWidth) / 2;
        }}>
          Ampliar captura
        </button>
      </figcaption>
      <dialog ref={dialog} className="lp-capture-dialog" aria-label="Captura ampliada da plataforma">
        <div className="lp-capture-toolbar">
          <span>Interface real com dados fictícios<small className="lp-capture-hint">Deslize a imagem para explorar os detalhes.</small></span>
          <button type="button" onClick={() => dialog.current?.close()} autoFocus>Fechar captura</button>
        </div>
        <div className="lp-capture-scroll">
          <Image src={image} alt={imageAlt} width={1433} height={1000} sizes="1433px" />
        </div>
      </dialog>
    </figure>
  );
}

export function ModuleShowcaseClient() {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
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
            id={`module-tab-${module.visual}`}
            aria-controls="module-panel"
            aria-selected={index === active}
            tabIndex={index === active ? 0 : -1}
            ref={(element) => { tabs.current[index] = element; }}
            onKeyDown={(event) => {
              const next = event.key === "ArrowRight" ? (index + 1) % MODULES.length
                : event.key === "ArrowLeft" ? (index + MODULES.length - 1) % MODULES.length
                : event.key === "Home" ? 0 : event.key === "End" ? MODULES.length - 1 : null;
              if (next === null) return;
              event.preventDefault();
              setActive(next);
              tabs.current[next]?.focus();
            }}
            className={`lp-module-tab${index === active ? " active" : ""}`}
            onClick={() => setActive(index)}
          >
            {module.tag}
          </button>
        ))}
      </div>
      <div className="lp-module-row lp-module-panel" key={mod.title} role="tabpanel" id="module-panel" aria-labelledby={`module-tab-${mod.visual}`}>
        <div className="lp-module-text">
          <span className="lp-module-tag">{mod.tag}</span>
          <h3>
            {mod.title}
            <span className="lp-module-subtitle">{mod.subtitle}</span>
          </h3>
          <p>{mod.description}</p>
          <Link href="/signup" className="lp-btn-primary">
            Experimentar →
          </Link>
        </div>
        <div className="lp-module-visual">
          <ModuleVisual image={mod.image} imageAlt={mod.imageAlt} />
        </div>
      </div>
    </>
  );
}
