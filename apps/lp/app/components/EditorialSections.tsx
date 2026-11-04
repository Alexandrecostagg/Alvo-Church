import { articleDate, articles, readingMinutes } from "../lib/articles";
import { recommendedArticles } from "../lib/recommended-articles";

export function ArticleList({ headingLevel = "h3" }: { headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  return <div className="lp-article-list">{articles.map((article, index) => <article className="lp-article-card" key={article.slug}>
    <span className="lp-article-number" aria-hidden="true">0{index + 1}</span>
    <div><p className="lp-article-category">{article.category} <span>· {readingMinutes(article)} min de leitura</span></p>
      <Heading><a href={`/blog/${article.slug}`}>{article.title}</a></Heading>
      <p>{article.description}</p>
      <a className="lp-text-link" href={`/blog/${article.slug}`} aria-label={`Ler artigo: ${article.title}`}>Ler artigo <span aria-hidden="true">↗</span></a>
    </div>
  </article>)}</div>;
}

export function DemoInvitation() {
  return <section className="lp-demo-invitation" aria-labelledby="demo-invitation-title"><div className="lp-container lp-inline-cta">
    <div><p className="lp-kicker">Demonstração com a equipe</p><h2 id="demo-invitation-title">Traga as perguntas da sua igreja.</h2><p>Conheça os recursos e combine uma apresentação pelo WhatsApp.</p></div>
    <a href="/demonstracao" className="lp-btn-primary" data-analytics-event="secondary_cta_click" data-analytics-placement="contact" data-analytics-target="whatsapp">Agendar demonstração</a>
  </div></section>;
}

export function RecommendedArticles() {
  return <section className="lp-recommended" id="leituras-recomendadas" aria-labelledby="recommended-title">
    <div className="lp-editorial-heading"><div><p className="lp-kicker">Leituras de outras fontes</p><h2 id="recommended-title">Fé, cuidado e vida em comunidade.</h2></div></div>
    <p className="lp-recommended-intro">Artigos selecionados pelo Esdras, com resumos da nossa equipe. A leitura completa está no site da fonte, com acesso pelos links abaixo.</p>
    <div className="lp-article-list lp-recommended-list">{recommendedArticles.map((article) => <article className="lp-article-card" key={article.url}>
      <div><p className="lp-article-category">{article.category}</p>
        <h3><a href={article.url} target="_blank" rel="noopener noreferrer" aria-label={`${article.title} (abre em nova aba)`}>{article.title}</a></h3>
        <p className="lp-source-credit">{article.source}<br /><time dateTime={article.date}>{articleDate(article.date)}</time></p>
        <p>{article.summary}</p>
        <a className="lp-text-link" href={article.url} target="_blank" rel="noopener noreferrer" aria-label={`Ler ${article.title} na Portas Abertas (abre em nova aba)`}>Ler na Portas Abertas <span aria-hidden="true">↗</span></a>
      </div>
    </article>)}</div>
  </section>;
}

export function AboutTeaser() {
  return <section className="lp-about-teaser" aria-labelledby="about-title"><div className="lp-container lp-about-teaser-inner">
    <div><p className="lp-kicker">Quem somos</p><h2 id="about-title">A rotina organizada. O cuidado continua humano.</h2></div>
    <div><p>O Esdras conecta o trabalho da secretaria, da liderança e dos ministérios. Nossa proposta é ajudar cada equipe a encontrar as informações de que precisa para acompanhar melhor as pessoas.</p><a href="/quem-somos" className="lp-text-link">Conheça a nossa proposta →</a></div>
  </div></section>;
}

export function BlogTeaser() {
  return <section className="lp-blog-teaser" aria-labelledby="blog-title"><div className="lp-container">
    <div className="lp-editorial-heading"><div><p className="lp-kicker">Blog Esdras</p><h2 id="blog-title">Ideias para o trabalho de cada semana.</h2></div><a href="/blog" className="lp-text-link">Ver todos os artigos →</a></div>
    <ArticleList />
    <a href="/blog#leituras-recomendadas" className="lp-text-link lp-recommended-teaser">Conheça também as leituras selecionadas da Portas Abertas →</a>
  </div></section>;
}
