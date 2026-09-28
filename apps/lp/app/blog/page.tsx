import { SitePage } from "../components/SiteChrome";
import { ArticleList, DemoInvitation } from "../components/EditorialSections";
import { pageMetadata } from "../lib/site";

export const metadata = pageMetadata("Blog", "Guias do Esdras sobre cadastro de membros, acolhimento e organização da equipe da igreja.", "/blog");

export default function BlogPage() {
  return <SitePage><section className="lp-subpage lp-container">
    <a href="/" className="lp-back-link">← Início</a>
    <header className="lp-editorial-intro lp-blog-intro"><p className="lp-kicker">Blog Esdras</p><h1>Uma leitura para levar à próxima reunião.</h1><p>Guias sobre organização, acolhimento e colaboração para conversar com a equipe e colocar em prática.</p></header>
    <ArticleList headingLevel="h2" />
  </section><DemoInvitation /></SitePage>;
}
