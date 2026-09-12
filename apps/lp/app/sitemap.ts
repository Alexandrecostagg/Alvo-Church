import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://plataformaesdras.com.br",
      lastModified: new Date("2026-09-12T00:00:00.000Z"),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
