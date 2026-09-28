import type { MetadataRoute } from "next";
import { articles } from "./lib/articles";
import { SITE_URL } from "./lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://plataformaesdras.com.br",
      lastModified: new Date("2026-09-28T00:00:00.000Z"),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...["/demonstracao", "/quem-somos", "/blog"].map(path => ({ url: `${SITE_URL}${path}`, lastModified: new Date("2026-09-28T00:00:00.000Z"), priority: 0.8 })),
    ...articles.map(article => ({ url: `${SITE_URL}/blog/${article.slug}`, lastModified: new Date(`${article.date}T00:00:00.000Z`), priority: 0.6 })),
  ];
}
