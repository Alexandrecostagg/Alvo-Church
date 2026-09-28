import { SitePage } from "../components/SiteChrome";
import { DemoForm } from "../components/DemoForm";
import { pageMetadata } from "../lib/site";

export const metadata = pageMetadata("Agendar uma demonstração", "Conheça o Esdras com sua equipe. Solicite uma demonstração e combine o melhor horário pelo WhatsApp.", "/demonstracao");

export default function DemonstracaoPage() {
  return <SitePage><section className="lp-subpage lp-container">
    <a href="/" className="lp-back-link">← Início</a>
    <div className="lp-demo-layout">
      <div className="lp-editorial-intro">
        <p className="lp-kicker">Uma conversa sobre a sua rotina</p>
        <h1>Veja o Esdras com a sua equipe.</h1>
        <p>Traga as dúvidas da secretaria, da liderança ou do ministério. A demonstração ajuda vocês a avaliar como a plataforma se encaixa no trabalho da instituição.</p>
        <ol className="lp-demo-steps">
          <li><strong>Escolha o assunto</strong><span>Indique o que faz mais sentido conhecer primeiro.</span></li>
          <li><strong>Combine o horário</strong><span>Envie a solicitação pelo WhatsApp e aguarde a confirmação da equipe.</span></li>
          <li><strong>Conheça os caminhos</strong><span>Veja os recursos, tire dúvidas sobre os planos e avalie o próximo passo.</span></li>
        </ol>
        <a className="lp-text-link" href="/#modulos">Enquanto isso, explore a plataforma →</a>
      </div>
      <DemoForm />
    </div>
  </section></SitePage>;
}
