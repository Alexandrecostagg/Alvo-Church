import type { Metadata } from "next";

const WEB_APP_URL = "https://alvo-church-web.alexandrecostagg.workers.dev";

import { Reveal } from "./components/Reveal";
import { ModuleShowcaseClient } from "./components/ModuleShowcaseClient";
import { PricingClient } from "./components/PricingClient";
import { FAQClient } from "./components/FAQClient";

export const metadata: Metadata = {
  metadataBase: new URL(WEB_APP_URL),
  title: "Plataforma Esdras — Gestão que mantém as pessoas à vista",
  description:
    "Organize membros, recepção, células, finanças, escalas e cuidado pastoral. Plano gratuito para igrejas com até 50 membros.",
  alternates: { canonical: "/landing" },
  openGraph: {
    title: "Plataforma Esdras — Gestão que mantém as pessoas à vista",
    description:
      "Membros, recepção, células, finanças, escalas e cuidado pastoral trabalhando juntos.",
    type: "website",
    url: "https://alvo-church-web.alexandrecostagg.workers.dev",
    siteName: "Plataforma Esdras",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Plataforma Esdras — Gestão que mantém as pessoas à vista",
    description:
      "Membros, recepção, células, finanças, escalas e cuidado pastoral trabalhando juntos.",
  },
};

export default function LandingPage() {
  return (
    <div className="lp-root">
      <LPNav />
      <Hero />
      <TrustBar />
      <Features />
      <ModuleShowcase />
      <Pricing />
      <FAQClient />
      <Contact />
      <FinalCTA />
      <LPFooter />
    </div>
  );
}

function LPNav() {
  return (
    <>
      <div className="lp-announcement">
        <span>Plano gratuito para igrejas com até 50 membros</span>
        <span aria-hidden="true">·</span>
        <span>Sem cartão de crédito</span>
      </div>
      <header className="lp-nav">
        <div className="lp-container lp-nav-inner">
          <div className="lp-logo">
            <img className="lp-logo-mark" src="/esdrasapp-icon.png" width="36" height="36" alt="" />
            <span className="lp-logo-name">Plataforma Esdras</span>
          </div>
          <nav className="lp-nav-links" aria-label="Navegação principal">
            <a href="#modulos" className="lp-nav-link">
              Produto
            </a>
            <a href="#planos" className="lp-nav-link">
              Planos
            </a>
            <a href="#trust" className="lp-nav-link">
              Segurança
            </a>
            <a href="#perguntas" className="lp-nav-link">
              Dúvidas
            </a>
          </nav>
          <div className="lp-nav-ctas">
            <a href={`${WEB_APP_URL}/login`} className="lp-btn-ghost">
              Entrar
            </a>
            <a href={`${WEB_APP_URL}/signup`} className="lp-btn-primary">
              Criar conta grátis
            </a>
          </div>
        </div>
      </header>
    </>
  );
}

function Hero() {
  return (
    <section className="lp-hero" id="hero">
      <div className="lp-container lp-hero-inner">
        <div className="lp-hero-copy">
          <p className="lp-kicker">Gestão para igrejas brasileiras</p>
          <h1 className="lp-hero-title">
            A igreja cresce. A gestão acompanha sem perder as pessoas de vista.
          </h1>
          <p className="lp-hero-subtitle">
            Membros, recepção, células, finanças, escalas e cuidado pastoral
            trabalham juntos para a liderança agir no momento certo.
          </p>
          <div className="lp-hero-ctas">
            <a href={`${WEB_APP_URL}/signup`} className="lp-btn-primary lp-btn-lg">
              Criar conta grátis
            </a>
            <a href="#modulos" className="lp-btn-ghost lp-btn-lg">
              Conhecer a plataforma
            </a>
          </div>
          <p className="lp-hero-note">
            Até 50 membros no plano gratuito. Você só escolhe um plano pago quando precisar.
          </p>
        </div>
        <div className="lp-hero-story" aria-label="Fluxo integrado da Plataforma Esdras">
          <div className="lp-story-head">
            <span>Do culto ao cuidado</span>
            <span>Produto em funcionamento</span>
          </div>
          <p className="lp-story-intro">
            Uma informação registrada por uma equipe ajuda a próxima a cuidar melhor.
          </p>
          <ol className="lp-story-steps">
            <li>
              <span>01</span>
              <div><strong>Receber</strong><p>Visitantes e membros entram pelo mesmo fluxo, sem fichas soltas.</p></div>
            </li>
            <li>
              <span>02</span>
              <div><strong>Organizar</strong><p>Células, jornadas e escalas mantêm a rotina visível para cada responsável.</p></div>
            </li>
            <li>
              <span>03</span>
              <div><strong>Cuidar</strong><p>A liderança encontra os sinais certos e decide como acompanhar cada pessoa.</p></div>
            </li>
          </ol>
          <div className="lp-story-foot">
            <span>Kids com retirada vinculada</span>
            <span>IA com revisão humana</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustBar() {
  return (
    <section className="lp-trust" id="trust">
      <div className="lp-container lp-trust-inner">
        <span className="lp-trust-label">O que você pode conferir hoje</span>
        <div className="lp-trust-stats">
          <div className="lp-trust-stat">
            <strong>50</strong>
            <span>membros no plano gratuito</span>
          </div>
          <div className="lp-trust-divider" />
          <div className="lp-trust-stat">
            <strong>Por papel</strong>
            <span>acesso separado por igreja e função</span>
          </div>
          <div className="lp-trust-divider" />
          <div className="lp-trust-stat">
            <strong>Auditável</strong>
            <span>operações sensíveis deixam histórico</span>
          </div>
          <div className="lp-trust-divider" />
          <div className="lp-trust-stat">
            <strong>Web + app</strong>
            <span>contratos compartilhados entre as interfaces</span>
          </div>
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    title: "Conheça cada membro, de verdade",
    body:
      "Ficha completa, histórico de visitas, documentos, batismo e jornada espiritual. Tudo conectado ao fluxo real da sua igreja.",
    tag: "Todos os planos",
  },
  {
    title: "IA que auxilia, sem ocupar o lugar do pastor",
    body:
      "Apoio ao pastor com análise de situações delicadas, orientação bíblica contextualizada e acompanhamento de membros em crise — com limites éticos claros.",
    tag: "Plano Pastoral +",
  },
  {
    title: "Dízimos e ofertas sem planilha",
    body:
      "Controle de dízimos, ofertas, despesas e relatórios. Transparência total para a liderança e para a congregação.",
    tag: "Comunidade +",
  },
  {
    title: "Tribos & Células",
    body:
      "Classifique membros por vocação (tribos) e comunidade (células). A IA sugere pertencimento; o pastor decide.",
    tag: "Comunidade +",
  },
  {
    title: "Escalas prontas em minutos",
    body:
      "Monte escalas de louvor, portaria, kids e ministérios e acompanhe confirmações e trocas.",
    tag: "Pastoral +",
  },
  {
    title: "Rede de Igrejas",
    body:
      "Para denominações e redes: visão unificada de todas as igrejas, consolidação de membros e financeiro centralizado.",
    tag: "Plano Rede",
  },
];

function Features() {
  return (
    <section className="lp-features" id="features">
      <div className="lp-container">
        <div className="lp-features-heading">
          <p className="lp-kicker">Uma rotina, uma história</p>
          <h2>O trabalho continua humano. A plataforma organiza o que costuma ficar pelo caminho.</h2>
        </div>
        <div className="lp-features-strip">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 60}>
              <div className="lp-feature-pill">
                <span className="lp-feature-number">0{i + 1}</span>
                <div>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                  <span className="lp-feature-tag">{f.tag}</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ModuleShowcase() {
  return (
    <section className="lp-modules" id="modulos">
      <div className="lp-container">
        <Reveal>
          <div className="lp-section-header">
            <h2>Veja como funciona na prática</h2>
            <p>Fluxos demonstrativos do produto com dados ilustrativos.</p>
          </div>
        </Reveal>
        <ModuleShowcaseClient />
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section className="lp-pricing" id="planos">
      <div className="lp-container">
        <Reveal>
          <div className="lp-section-header">
            <h2>Planos simples, sem surpresas</h2>
            <p>Comece grátis. Escale conforme a sua igreja cresce.</p>
          </div>
        </Reveal>
        <PricingClient />
        <p className="lp-pricing-note">
          Planos anuais com 20% de desconto · Enterprise sob consulta
        </p>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="lp-final-cta" id="cta-final">
      <div className="lp-container lp-final-cta-inner">
        <Reveal>
          <h2>Sua igreja merece uma gestão à altura da missão.</h2>
        </Reveal>
        <Reveal delay={80}>
          <p>
            Comece hoje, gratuitamente. Sem cartão de crédito.
            <br />
            <span className="lp-final-cta-guarantee">
              Plano gratuito para até 50 membros. Conheça os planos antes de contratar.
            </span>
          </p>
        </Reveal>
        <Reveal delay={160}>
          <div className="lp-hero-ctas">
            <a href={`${WEB_APP_URL}/signup`} className="lp-btn-primary lp-btn-lg lp-btn-white">
              Criar conta grátis
            </a>
            <a
              href="https://wa.me/5562993330336?text=Ol%C3%A1!%20Somos%20uma%20rede%20de%20igrejas%20e%20quero%20saber%20mais%20sobre%20a%20Plataforma%20Esdras."
              target="_blank"
              rel="noreferrer"
              className="lp-btn-ghost lp-btn-lg lp-btn-network"
            >
              Sou uma rede de igrejas
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section className="lp-contact" id="contato">
      <div className="lp-container">
        <Reveal>
          <div className="lp-contact-card">
            <div>
              <p className="lp-contact-eyebrow">FALE CONOSCO</p>
              <h2>Precisa de ajuda ou quer saber mais?</h2>
              <p>
                Nossa equipe está pronta para orientar sua igreja e tirar suas dúvidas sobre a Plataforma Esdras.
              </p>
            </div>
            <a className="lp-contact-email" href="mailto:contato@plataformaesdras.com.br">
              contato@plataformaesdras.com.br
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function LPFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-container lp-footer-inner">
        <div className="lp-logo">
          <img className="lp-logo-mark" src="/esdrasapp-icon.png" width="36" height="36" alt="" />
          <span className="lp-logo-name">Plataforma Esdras</span>
        </div>
        <div className="lp-footer-links">
          <a href="#modulos">Módulos</a>
          <a href="#planos">Planos</a>
          <a href="#perguntas">Perguntas frequentes</a>
          <a href="#contato">Fale conosco</a>
          <a href={`${WEB_APP_URL}/privacy`}>Privacidade</a>
          <a href={`${WEB_APP_URL}/account-deletion`}>Exclusão de conta</a>
          <a href={`${WEB_APP_URL}/login`}>Entrar</a>
        </div>
        <p className="lp-footer-copy">
          © {new Date().getFullYear()} Plataforma Esdras. Feito com propósito.
        </p>
      </div>
    </footer>
  );
}
