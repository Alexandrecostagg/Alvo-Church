import type { ReactNode } from "react";
import { BrandLogo } from "./BrandLogo";
import { MobileMenu } from "./MobileMenu";
import { ConversionAnalytics } from "./ConversionAnalytics";
import { navigation, WEB_APP_URL } from "../lib/site";

export function LPNav() {
  return <>
    <div className="lp-announcement"><span>Plano gratuito para igrejas com até 50 membros</span><span aria-hidden="true">·</span><span>Sem cartão de crédito</span></div>
    <header className="lp-nav"><div className="lp-container lp-nav-inner">
      <BrandLogo />
      <nav className="lp-nav-links" aria-label="Navegação principal">
        {navigation.map(link => <a key={link.href} href={link.href} className="lp-nav-link">{link.label}</a>)}
      </nav>
      <div className="lp-nav-ctas">
        <a href={`${WEB_APP_URL}/login`} className="lp-btn-ghost" data-analytics-event="secondary_cta_click" data-analytics-placement="navigation" data-analytics-target="login">Entrar</a>
        <a href={`${WEB_APP_URL}/signup`} className="lp-btn-primary" data-analytics-event="primary_cta_click" data-analytics-placement="navigation" data-analytics-target="signup">Criar conta grátis</a>
      </div>
      <MobileMenu />
    </div></header>
  </>;
}

export function LPFooter() {
  return <footer className="lp-footer"><div className="lp-container lp-footer-inner">
    <BrandLogo />
    <nav className="lp-footer-links" aria-label="Navegação do rodapé">
      {navigation.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}
      <a href="/#perguntas">Dúvidas</a><a href="/#contato">Fale conosco</a>
      <a href={`${WEB_APP_URL}/privacy`}>Privacidade</a>
      <a href={`${WEB_APP_URL}/account-deletion`}>Exclusão de conta</a>
      <a href={`${WEB_APP_URL}/login`}>Entrar</a>
    </nav>
    <p className="lp-footer-copy">© {new Date().getFullYear()} Plataforma Esdras. Feito com propósito.</p>
  </div></footer>;
}

export function SitePage({ children }: { children: ReactNode }) {
  return <div className="lp-root">
    <a href="#conteudo" className="lp-skip-link">Pular para o conteúdo</a>
    <LPNav /><main id="conteudo" tabIndex={-1}>{children}</main><LPFooter /><ConversionAnalytics />
  </div>;
}
