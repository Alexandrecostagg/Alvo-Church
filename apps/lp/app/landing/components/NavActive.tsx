"use client";

import { useEffect, useRef } from "react";

const SECTION_IDS = ["modulos", "planos", "depoimentos", "perguntas", "features", "trust", "hero"];

export function NavActive() {
  const linksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const links = linksRef.current;
    if (!links) return;

    const setActive = (id: string) => {
      const allLinks = links.querySelectorAll(".lp-nav-link");
      allLinks.forEach((link) => {
        const linkId = (link as HTMLElement).dataset.section;
        if (linkId === id) {
          (link as HTMLElement).classList.add("is-active");
        } else {
          (link as HTMLElement).classList.remove("is-active");
        }
      });
    };

    const observers: IntersectionObserver[] = [];

    SECTION_IDS.forEach((sectionId) => {
      const section = document.getElementById(sectionId);
      if (!section) return;

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry && entry.isIntersecting) {
            setActive(sectionId);
          }
        },
        {
          rootMargin: "-40% 0px -40% 0px",
          threshold: 0,
        }
      );

      observer.observe(section);
      observers.push(observer);
    });

    return () => {
      observers.forEach((o) => o.disconnect());
    };
  }, []);

  return (
    <div ref={linksRef}>
      {/* Client-side wrapper for active tracking — links are rendered in parent */}
    </div>
  );
}
