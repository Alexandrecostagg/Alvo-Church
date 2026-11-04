"use client";

import { useRef } from "react";
import { navigation, WEB_APP_URL } from "../lib/site";

export function MobileMenu() {
  const details = useRef<HTMLDetailsElement>(null);
  return (
    <details className="lp-mobile-menu" ref={details} onKeyDown={(event) => {
      if (event.key === "Escape" && details.current?.open) {
        details.current.open = false;
        details.current.querySelector("summary")?.focus();
      }
    }}>
      <summary>Menu <span aria-hidden="true">☰</span></summary>
      <nav aria-label="Navegação móvel" className="lp-mobile-panel" onClick={(event) => {
        if ((event.target as HTMLElement).closest("a") && details.current) details.current.open = false;
      }}>
        {navigation.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}
        <a href="/#perguntas">Dúvidas</a>
        <a href={`${WEB_APP_URL}/login`}>Entrar</a>
        <a href={`${WEB_APP_URL}/signup`} className="lp-btn-primary">Criar conta grátis</a>
      </nav>
    </details>
  );
}
