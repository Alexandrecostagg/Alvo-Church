import Link from "next/link";
import type { Metadata } from "next";

import { Reveal } from "./components/Reveal";
import { Counter } from "./components/Counter";
import { ModuleShowcaseClient } from "./components/ModuleShowcaseClient";
import { PricingClient } from "./components/PricingClient";
import { TestimonialsClient } from "./components/TestimonialsClient";
import { FAQClient } from "./components/FAQClient";
import { NavActive } from "./components/NavActive";

export const metadata: Metadata = {
  title: "Plataforma Esdras — Gestão para Igrejas e Redes",
  description:
    "Toda a sua igreja, finalmente em um só lugar. Membros, células, finanças, pastoral e IA — tudo integrado. Grátis até 100 membros, sem cartão de crédito.",
  openGraph: {
    title: "Plataforma Esdras — Gestão para Igrejas e Redes",
    description:
      "Toda a sua igreja, finalmente em um só lugar. Membros, células, finanças, pastoral e IA — tudo integrado.",
    type: "website",
    url: "https://alvo-church-web.alexandrecostagg.workers.dev",
    siteName: "Plataforma Esdras",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Plataforma Esdras — Gestão para Igrejas e Redes",
    description:
      "Toda a sua igreja, finalmente em um só lugar. Membros, células, finanças, pastoral e IA — tudo integrado.",
  },
};

export default function LandingPage() {
  return (
    <div className="lp-root">
      <LPNav />
      <NavActive />
      <Hero />
      <TrustBar />
      <Features />
      <ModuleShowcase />
      <Testimonials />
      <Pricing />
      <FAQClient />
      <FinalCTA />
      <LPFooter />
    </div>
  );
}

function LPNav() {
  return (
    <header className="lp-nav">
      <div className="lp-container lp-nav-inner">
        <div className="lp-logo">
          <div className="lp-logo-mark">E</div>
          <span className="lp-logo-name">Plataforma Esdras</span>
        </div>
        <nav className="lp-nav-links" aria-label="Navegação principal">
          <a href="#modulos" className="lp-nav-link" data-section="modulos">
            Módulos
          </a>
          <a href="#planos" className="lp-nav-link" data-section="planos">
            Planos
          </a>
          <a href="#depoimentos" className="lp-nav-link" data-section="depoimentos">
            Depoimentos
          </a>
          <a href="#perguntas" className="lp-nav-link" data-section="perguntas">
            FAQ
          </a>
        </nav>
        <div className="lp-nav-ctas">
          <Link href="/login" className="lp-btn-ghost">
            Entrar
          </Link>
          <Link href="/signup" className="lp-btn-primary">
            Começar grátis
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="lp-hero" id="hero">
      <div className="lp-container lp-hero-inner">
        <h1 className="lp-hero-title">
          Toda a sua igreja,<br />finalmente em um só lugar.
        </h1>
        <p className="lp-hero-subtitle">
          Membros, células, finanças, escalas e cuidado pastoral com IA —
          integrados, simples, e feitos para a realidade da igreja brasileira.
        </p>
        <div className="lp-hero-ctas">
          <Link href="/signup" className="lp-btn-primary lp-btn-lg">
            Começar gratuitamente
          </Link>
          <a href="#modulos" className="lp-btn-ghost lp-btn-lg">
            Ver como funciona →
          </a>
        </div>
        <p className="lp-hero-note">
          Grátis até 100 membros. Sem cartão de crédito.
          {" · "}
          <a
            href="https://wa.me/5562993330336?text=Ol%C3%A1!%20Somos%20uma%20rede%20de%20igrejas%20e%20quero%20saber%20mais%20sobre%20a%20Plataforma%20Esdras."
            target="_blank"
            rel="noreferrer"
            className="lp-hero-network-link"
          >
            Sou uma rede de igrejas →
          </a>
        </p>
        <div className="lp-hero-visual-wrap">
          <div className="lp-hero-blobs">
            <span className="lp-hero-blob lp-hero-blob-1" />
            <span className="lp-hero-blob lp-hero-blob-2" />
          </div>
          <div className="lp-hero-glow" />
          <div className="lp-hero-visual">
            <div className="lp-dashboard-preview">
              <div className="lp-preview-topbar">
                <span className="lp-preview-dot" />
                <span className="lp-preview-dot" />
                <span className="lp-preview-dot" />
              </div>
              <div className="lp-preview-body">
                <div className="lp-preview-sidebar">
                  {[
                    "Dashboard",
                    "Pessoas",
                    "Células",
                    "Finanças",
                    "IA Pastoral",
                  ].map((item, i) => (
                    <div
                      key={item}
                      className={`lp-preview-nav-item${i === 0 ? " active" : ""}`}
                    >
                      <span className="lp-preview-nav-dot" />
                      {item}
                    </div>
                  ))}
                </div>
                <div className="lp-preview-content">
                  <div className="lp-preview-cards">
                    <div className="lp-preview-card">
                      <div className="lp-preview-card-label">Membros</div>
                      <div className="lp-preview-card-value">247</div>
                    </div>
                    <div className="lp-preview-card">
                      <div className="lp-preview-card-label">Células ativas</div>
                      <div className="lp-preview-card-value">18</div>
                    </div>
                    <div className="lp-preview-card">
                      <div className="lp-preview-card-label">Dízimos / mês</div>
                      <div className="lp-preview-card-value">R$ 42k</div>
                    </div>
                  </div>
                  <div className="lp-preview-chart">
                    {[40, 65, 50, 80, 60, 90, 75].map((h, i) => (
                      <div
                        key={i}
                        className="lp-preview-bar"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="lp-hero-float lp-hero-float-1">
            <span className="lp-visual-dot green live" />
            <div>
              <strong>Check-in em tempo real</strong>
              <span>3 visitantes agora</span>
            </div>
          </div>
          <div className="lp-hero-float lp-hero-float-2">
            <span className="lp-hero-float-icon">🙏</span>
            <div>
              <strong>Radar Pastoral</strong>
              <span>7 dias de cuidado ativo</span>
            </div>
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
        <span className="lp-trust-label">
          Confiado por igrejas em todo o Brasil
        </span>
        <div className="lp-trust-stats">
          <div className="lp-trust-stat">
            <strong>
              <Counter to={500} prefix="+" />
            </strong>
            <span>Igrejas ativas</span>
          </div>
          <div className="lp-trust-divider" />
          <div className="lp-trust-stat">
            <strong>
              <Counter to={120} prefix="+" suffix=" mil" />
            </strong>
            <span>Membros gerenciados</span>
          </div>
          <div className="lp-trust-divider" />
          <div className="lp-trust-stat">
            <strong>
              <Counter to={98} suffix="%" />
            </strong>
            <span>Satisfação dos pastores</span>
          </div>
          <div className="lp-trust-divider" />
          <div className="lp-trust-stat">
            <strong>
              <Counter to={4} suffix=" estados" />
            </strong>
            <span>Com redes denominacionais</span>
          </div>
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: "👥",
    title: "Conheça cada membro, de verdade",
    body:
      "Ficha completa, histórico de visitas, documentos, batismo e jornada espiritual. Tudo conectado ao fluxo real da sua igreja.",
    tag: "Todos os planos",
  },
  {
    icon: "🤖",
    title: "Um auxiliar pastoral que nunca dorme",
    body:
      "Apoio ao pastor com análise de situações delicadas, orientação bíblica contextualizada e acompanhamento de membros em crise — com limites éticos claros.",
    tag: "Plano Pastoral +",
  },
  {
    icon: "💰",
    title: "Dízimos e ofertas sem planilha",
    body:
      "Controle de dízimos, ofertas, despesas e relatórios. Transparência total para a liderança e para a congregação.",
    tag: "Comunidade +",
  },
  {
    icon: "🏕️",
    title: "Tribos & Células",
    body:
      "Classifique membros por vocação (tribos) e comunidade (células). A IA sugere pertencimento; o pastor decide.",
    tag: "Comunidade +",
  },
  {
    icon: "📅",
    title: "Escalas prontas em minutos",
    body:
      "Monte escalas de louvor, portaria, kids e ministérios. Notificação automática para cada voluntário.",
    tag: "Pastoral +",
  },
  {
    icon: "🌐",
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
        <p className="lp-features-eyebrow">Uma plataforma. Tudo integrado.</p>
        <div className="lp-features-strip">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 60}>
              <div className="lp-feature-pill">
                <span className="lp-feature-pill-icon">{f.icon}</span>
                <span className="lp-feature-pill-label">{f.title}</span>
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
          </div>
        </Reveal>
        <ModuleShowcaseClient />
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="lp-testimonials" id="depoimentos">
      <div className="lp-container">
        <Reveal>
          <div className="lp-section-header">
            <h2>O que os pastores dizem</h2>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <TestimonialsClient />
        </Reveal>
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
              14 dias grátis nos planos pagos. Cancele quando quiser.
            </span>
          </p>
        </Reveal>
        <Reveal delay={160}>
          <div className="lp-hero-ctas">
            <Link href="/signup" className="lp-btn-primary lp-btn-lg lp-btn-white">
              Criar conta grátis
            </Link>
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

function LPFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-container lp-footer-inner">
        <div className="lp-logo">
          <div className="lp-logo-mark">E</div>
          <span className="lp-logo-name">Plataforma Esdras</span>
        </div>
        <div className="lp-footer-links">
          <a href="#modulos">Módulos</a>
          <a href="#planos">Planos</a>
          <a href="#perguntas">Perguntas frequentes</a>
          <Link href="/privacy">Privacidade</Link>
          <Link href="/login">Entrar</Link>
        </div>
        <p className="lp-footer-copy">
          © {new Date().getFullYear()} Plataforma Esdras. Feito com propósito.
        </p>
      </div>
    </footer>
  );
}
