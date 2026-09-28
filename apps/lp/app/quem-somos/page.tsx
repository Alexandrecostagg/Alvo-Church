import { SitePage } from "../components/SiteChrome";
import { pageMetadata } from "../lib/site";

export const metadata = pageMetadata("Quem somos", "Conheça a proposta da Plataforma Esdras: organizar a rotina da igreja para que as equipes acompanhem melhor as pessoas.", "/quem-somos");

export default function QuemSomosPage() {
  return <SitePage><section className="lp-subpage lp-container">
    <a href="/" className="lp-back-link">← Início</a>
    <div className="lp-about-intro">
      <div className="lp-editorial-intro"><p className="lp-kicker">Quem somos</p><h1>Organização a serviço da comunidade.</h1>
        <p>O Esdras é uma plataforma de gestão para igrejas que conecta cadastro, recepção, células, escalas, finanças e acompanhamento pastoral.</p>
        <p>Nossa proposta é dar às equipes uma visão compartilhada da rotina, com responsabilidades claras e informações acessíveis a quem precisa delas.</p>
      </div>
      <aside className="lp-about-note"><img src="/esdras-book-quill-preview.png" width="120" height="80" alt="Livro aberto e pena, símbolo do Esdras" /><h2>Uma marca ligada à Palavra.</h2><p>O livro e a pena remetem à figura bíblica de Esdras, o escriba. Na nossa identidade, representam o compromisso com o conhecimento, o registro e o cuidado naquilo que fazemos.</p></aside>
    </div>
    <div className="lp-values">
      <article><span>01</span><h2>Pessoas antes dos registros</h2><p>Um cadastro tem valor quando ajuda alguém a acolher, acompanhar ou servir melhor. É esse uso que orienta nossa proposta.</p></article>
      <article><span>02</span><h2>Responsabilidade compartilhada</h2><p>Secretaria, liderança e ministérios precisam colaborar com clareza sobre suas funções e seus acessos.</p></article>
      <article><span>03</span><h2>Tecnologia com discernimento</h2><p>A IA pode apoiar a organização e a reflexão. A escuta, as decisões e a responsabilidade pastoral permanecem com as pessoas.</p></article>
    </div>
    <div className="lp-inline-cta"><div><h2>Conheça antes de decidir.</h2><p>Explore os recursos ou converse com a equipe sobre a realidade da sua instituição.</p></div><a href="/demonstracao" className="lp-btn-primary">Agendar demonstração</a></div>
  </section></SitePage>;
}
