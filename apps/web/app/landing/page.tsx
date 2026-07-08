import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Plataforma Esdras — Gestão para Igrejas e Redes",
  description:
    "Toda a sua igreja, finalmente em um só lugar. Membros, células, finanças, pastoral e IA — tudo integrado.",
};

export default function LandingPage() {
  return (
    <div className="lp-root">
      <LPNav />
      <Hero />
      <TrustBar />
      <Features />
      <ModuleShowcase />
      <Testimonials />
      <Pricing />
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
        <nav className="lp-nav-links">
          <a href="#modulos">Módulos</a>
          <a href="#planos">Planos</a>
          <a href="#depoimentos">Depoimentos</a>
        </nav>
        <div className="lp-nav-ctas">
          <Link href="/login" className="lp-btn-ghost">Entrar</Link>
          <Link href="/signup" className="lp-btn-primary">Começar grátis</Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="lp-hero">
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
          <a href="https://wa.me/5562993330336?text=Ol%C3%A1!%20Somos%20uma%20rede%20de%20igrejas%20e%20quero%20saber%20mais%20sobre%20a%20Plataforma%20Esdras." target="_blank" rel="noreferrer" className="lp-hero-network-link">
            Sou uma rede de igrejas →
          </a>
        </p>
        <div className="lp-hero-visual-wrap">
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
                  {["Dashboard", "Pessoas", "Células", "Finanças", "IA Pastoral"].map((item, i) => (
                    <div key={item} className={`lp-preview-nav-item${i === 0 ? " active" : ""}`}>
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
                      <div key={i} className="lp-preview-bar" style={{ height: `${h}%` }} />
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
    <section className="lp-trust">
      <div className="lp-container lp-trust-inner">
        <span className="lp-trust-label">Confiado por igrejas em todo o Brasil</span>
        <div className="lp-trust-stats">
          <div className="lp-trust-stat">
            <strong>+500</strong>
            <span>Igrejas ativas</span>
          </div>
          <div className="lp-trust-divider" />
          <div className="lp-trust-stat">
            <strong>+120 mil</strong>
            <span>Membros gerenciados</span>
          </div>
          <div className="lp-trust-divider" />
          <div className="lp-trust-stat">
            <strong>98%</strong>
            <span>Satisfação dos pastores</span>
          </div>
          <div className="lp-trust-divider" />
          <div className="lp-trust-stat">
            <strong>4 estados</strong>
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
    title: "Gestão de Membros",
    body:
      "Ficha completa, histórico de visitas, documentos, batismo e jornada espiritual. Tudo conectado ao fluxo real da sua igreja.",
    tag: "Todos os planos",
  },
  {
    icon: "🤖",
    title: "IA Pastoral",
    body:
      "Apoio ao pastor com análise de situações delicadas, orientação bíblica contextualizada e acompanhamento de membros em crise — com limites éticos claros.",
    tag: "Plano Pastoral +",
  },
  {
    icon: "💰",
    title: "Finanças",
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
    title: "Escalas & Voluntários",
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
    <section className="lp-features">
      <div className="lp-container">
        <p className="lp-features-eyebrow">Uma plataforma. Tudo integrado.</p>
        <div className="lp-features-strip">
          {FEATURES.map((f) => (
            <div key={f.title} className="lp-feature-pill">
              <span className="lp-feature-pill-icon">{f.icon}</span>
              <span className="lp-feature-pill-label">{f.title}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const MODULES = [
  {
    tag: "Recepção",
    title: "Recepção & Visitantes",
    description:
      "Check-in digital no culto, ficha do visitante, follow-up automático e painel do pastor em tempo real — tudo na tela enquanto o culto acontece.",
    visual: "reception",
  },
  {
    tag: "Células",
    title: "Grupos & Discipulado",
    description:
      "Presença por célula, jornada de discipulado por membro e radar de quem está se afastando — antes que a liderança precise perguntar.",
    visual: "groups",
  },
  {
    tag: "IA Pastoral",
    title: "Cuidado Pastoral com IA",
    description:
      "O pastor descreve a situação e a IA sugere abordagem, versículos e próximos passos — respeitando os limites do cuidado pastoral e nunca substituindo o discernimento humano.",
    visual: "ai",
  },
  {
    tag: "Escalas",
    title: "Escalas & Voluntários",
    description:
      "Monte a escala de louvor, portaria e kids em minutos. Cada voluntário recebe notificação automática e confirma presença pelo celular.",
    visual: "serving",
  },
  {
    tag: "Finanças",
    title: "Finanças Transparentes",
    description:
      "Lançamentos de dízimos e ofertas, controle de despesas, metas e relatório mensal com um clique. Dados só para quem deve ver.",
    visual: "finance",
  },
];

function ModuleShowcase() {
  return (
    <section className="lp-modules" id="modulos">
      <div className="lp-container">
        <div className="lp-section-header">
          <h2>Veja como funciona na prática</h2>
        </div>
        <div className="lp-modules-list">
          {MODULES.map((mod, i) => (
            <div key={mod.title} className={`lp-module-row${i % 2 === 1 ? " reversed" : ""}`}>
              <div className="lp-module-text">
                <span className="lp-module-tag">{mod.tag}</span>
                <h3>{mod.title}</h3>
                <p>{mod.description}</p>
                <Link href="/signup" className="lp-btn-primary">
                  Experimentar →
                </Link>
              </div>
              <div className="lp-module-visual">
                <ModuleVisual type={mod.visual} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function VisualChrome() {
  return (
    <div className="lp-visual-chrome">
      <span className="lp-visual-chrome-dot" />
      <span className="lp-visual-chrome-dot" />
      <span className="lp-visual-chrome-dot" />
    </div>
  );
}

function ModuleVisual({ type }: { type: string }) {
  if (type === "reception") {
    return (
      <div className="lp-visual-card">
        <VisualChrome />
        <div className="lp-visual-header">Recepção · Culto de Domingo</div>
        <div className="lp-visual-row highlight">
          <span className="lp-visual-dot green live" /> João Silva — <em>1ª visita</em>
          <span className="lp-visual-badge">Novo</span>
        </div>
        <div className="lp-visual-row">
          <span className="lp-visual-dot blue" /> Maria Souza — Membro
        </div>
        <div className="lp-visual-row">
          <span className="lp-visual-dot blue" /> Pedro Alves — Membro
        </div>
        <div className="lp-visual-row">
          <span className="lp-visual-dot green live" /> Ana Lima — <em>2ª visita</em>
          <span className="lp-visual-badge">Retorno</span>
        </div>
        <div className="lp-visual-footer">
          <span>47 presentes · 3 visitantes</span>
          <span>Atualizado agora</span>
        </div>
      </div>
    );
  }
  if (type === "groups") {
    return (
      <div className="lp-visual-card">
        <VisualChrome />
        <div className="lp-visual-header">Células · Presença dos últimos 6 encontros</div>
        <div className="lp-visual-bars">
          {[
            { label: "CG Centro", value: 92 },
            { label: "CG Norte", value: 78 },
            { label: "CG Jardins", value: 65 },
            { label: "Jovens", value: 88 },
          ].map((row) => (
            <div key={row.label} className="lp-visual-bar-row">
              <span className="lp-visual-bar-label">{row.label}</span>
              <span className="lp-visual-bar-track">
                <span className="lp-visual-bar-fill" style={{ width: `${row.value}%` }} />
              </span>
              <span className="lp-visual-bar-value">{row.value}%</span>
            </div>
          ))}
        </div>
        <div className="lp-visual-footer">
          <span>3 pessoas há 30+ dias sem célula</span>
          <span className="lp-visual-badge">Radar Pastoral</span>
        </div>
      </div>
    );
  }
  if (type === "ai") {
    return (
      <div className="lp-visual-card lp-visual-chat">
        <VisualChrome />
        <div className="lp-visual-header">IA Pastoral</div>
        <div className="lp-visual-bubble user">
          Um membro está passando por depressão severa. Como posso ajudar pastoralmente?
        </div>
        <div className="lp-visual-bubble ai">
          <strong>Abordagem sugerida:</strong> Presença e escuta ativa primeiro. Indicar acompanhamento profissional paralelamente. Versículo inicial: Salmo 34:18<span className="lp-visual-cursor" />
          <div className="lp-visual-disclaimer">Sugestão pastoral · Valide com seu discernimento</div>
        </div>
      </div>
    );
  }
  if (type === "serving") {
    return (
      <div className="lp-visual-card">
        <VisualChrome />
        <div className="lp-visual-header">Escalas · Culto de Domingo</div>
        <div className="lp-visual-schedule">
          {[
            { label: "Louvor", filled: true },
            { label: "Portaria", filled: true },
            { label: "Kids", filled: true },
            { label: "Recepção", filled: false },
            { label: "Som", filled: true },
            { label: "Mídia", filled: false },
            { label: "Diáconos", filled: true },
            { label: "Louvor 2", filled: true },
          ].map((slot) => (
            <div key={slot.label} className={`lp-visual-slot${slot.filled ? " filled" : ""}`}>
              {slot.label}
            </div>
          ))}
        </div>
        <div className="lp-visual-footer">
          <span>6 de 8 posições confirmadas</span>
          <span>Notificado às 08:00</span>
        </div>
      </div>
    );
  }
  return (
    <div className="lp-visual-card">
      <VisualChrome />
      <div className="lp-visual-header">Finanças · Junho 2025</div>
      <div className="lp-visual-finance-row">
        <span>Dízimos</span>
        <span className="lp-visual-green">R$ 38.420</span>
      </div>
      <div className="lp-visual-finance-row">
        <span>Ofertas</span>
        <span className="lp-visual-green">R$ 4.100</span>
      </div>
      <div className="lp-visual-finance-row border-top">
        <span>Total entradas</span>
        <strong className="lp-visual-green">R$ 42.520</strong>
      </div>
      <div className="lp-visual-finance-row">
        <span>Despesas</span>
        <span className="lp-visual-red">R$ 28.900</span>
      </div>
      <div className="lp-visual-finance-row border-top">
        <span>Saldo</span>
        <strong className="lp-visual-green">R$ 13.620</strong>
      </div>
    </div>
  );
}

const TESTIMONIALS = [
  {
    name: "Pr. Carlos Mendes",
    church: "Igreja Batista Nova Esperança, SP",
    text: "Antes eu ficava horas em planilhas. Hoje lanço o culto em 5 minutos e já tenho o relatório do mês automaticamente. Mudou completamente a nossa gestão.",
    avatar: "CM",
  },
  {
    name: "Pastora Renata Oliveira",
    church: "Comunidade Shalom, MG",
    text: "A IA Pastoral me ajuda a pensar melhor nas situações difíceis. Não substitui o discernimento, mas é como ter um auxiliar que conhece a Bíblia profundamente.",
    avatar: "RO",
  },
  {
    name: "Pr. Diego Ferreira",
    church: "Rede Avivamento, RS — 12 igrejas",
    text: "Com o plano Rede, consigo ver todas as nossas igrejas em um painel. Membros, finanças, células. Nunca tivemos essa visão antes.",
    avatar: "DF",
  },
];

function Testimonials() {
  return (
    <section className="lp-testimonials" id="depoimentos">
      <div className="lp-container">
        <div className="lp-section-header">
          <h2>O que os pastores dizem</h2>
        </div>
        <div className="lp-testimonials-grid">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="lp-testimonial-card">
              <p className="lp-testimonial-text">"{t.text}"</p>
              <div className="lp-testimonial-author">
                <div className="lp-testimonial-avatar">{t.avatar}</div>
                <div>
                  <strong>{t.name}</strong>
                  <span>{t.church}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const PLANS = [
  {
    id: "free",
    name: "Gratuito",
    price: "R$ 0",
    period: "/mês",
    desc: "Para igrejas começando",
    features: ["Até 50 membros", "Recepção & visitantes", "Cadastro completo", "Dashboard básico"],
    cta: "Começar grátis",
    highlight: false,
  },
  {
    id: "comunidade",
    name: "Comunidade",
    price: "R$ 79",
    period: "/mês",
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
    price: "R$ 159",
    period: "/mês",
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
    price: "R$ 399",
    period: "/mês",
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

function Pricing() {
  return (
    <section className="lp-pricing" id="planos">
      <div className="lp-container">
        <div className="lp-section-header">
          <h2>Planos simples, sem surpresas</h2>
          <p>Comece grátis. Escale conforme a sua igreja cresce.</p>
        </div>
        <div className="lp-pricing-grid">
          {PLANS.map((plan) => (
            <div key={plan.id} className={`lp-plan-card${plan.highlight ? " highlight" : ""}`}>
              {plan.highlight && <div className="lp-plan-badge">Mais popular</div>}
              <div className="lp-plan-name">{plan.name}</div>
              <div className="lp-plan-price">
                <strong>{plan.price}</strong>
                <span>{plan.period}</span>
              </div>
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
          ))}
        </div>
        <p className="lp-pricing-note">
          Planos anuais com 20% de desconto · Enterprise sob consulta
        </p>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="lp-final-cta">
      <div className="lp-container lp-final-cta-inner">
        <h2>Sua igreja merece uma gestão à altura da missão.</h2>
        <p>Comece hoje, gratuitamente. Sem cartão de crédito.</p>
        <div className="lp-hero-ctas">
          <Link href="/signup" className="lp-btn-primary lp-btn-lg lp-btn-white">
            Criar conta grátis
          </Link>
        </div>
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
          <Link href="/login">Entrar</Link>
        </div>
        <p className="lp-footer-copy">© 2025 Plataforma Esdras. Feito com propósito.</p>
      </div>
    </footer>
  );
}
