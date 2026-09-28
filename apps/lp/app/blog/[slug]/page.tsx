import { notFound } from "next/navigation";
import { SitePage } from "../../components/SiteChrome";
import { articles, readingMinutes, articleDate } from "../../lib/articles";
import { pageMetadata } from "../../lib/site";

export const dynamicParams = false;
export function generateStaticParams() { return articles.map(article => ({ slug: article.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = articles.find(item => item.slug === slug);
  if (!article) notFound();
  return pageMetadata(article.title, article.description, `/blog/${article.slug}`);
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = articles.find(item => item.slug === slug);
  if (!article) notFound();
  return <SitePage><article className="lp-subpage lp-container lp-reading">
    <a href="/blog" className="lp-back-link">← Todos os artigos</a>
    <header className="lp-editorial-intro"><p className="lp-kicker">{article.category}</p><h1>{article.title}</h1><p>{article.description}</p>
      <div className="lp-article-meta"><span>Guia Esdras</span><time dateTime={article.date}>{articleDate(article.date)}</time><span>{readingMinutes(article)} min de leitura</span></div>
    </header>
    <div className="lp-prose">{article.sections.map(section => <section key={section.title}><h2>{section.title}</h2>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}{section.checklist && <ul>{section.checklist.map(item => <li key={item}>{item}</li>)}</ul>}</section>)}</div>
    <aside className="lp-article-cta"><h2>Quer conversar sobre essa rotina?</h2><p>Leve as dúvidas da equipe para uma demonstração do Esdras.</p><a href="/demonstracao" className="lp-btn-primary">Agendar demonstração</a></aside>
    <nav className="lp-related" aria-label="Continue a leitura"><h2>Continue a leitura</h2>{articles.filter(item => item.slug !== slug).map(item => <a key={item.slug} href={`/blog/${item.slug}`}>{item.title} <span aria-hidden="true">→</span></a>)}</nav>
  </article></SitePage>;
}
