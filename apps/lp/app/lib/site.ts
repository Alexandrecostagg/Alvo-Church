import type { Metadata } from "next";

export const SITE_URL = "https://plataformaesdras.com.br";
export const WEB_APP_URL = "https://alvo-church-web.alexandrecostagg.workers.dev";
export const CONTACT_EMAIL = "contato@plataformaesdras.com.br";
export const DEMO_WHATSAPP = "5562993330336";

export function pageMetadata(title: string, description: string, path: string): Metadata {
  const fullTitle = `${title} | Plataforma Esdras`;
  return {
    title: fullTitle, description, alternates: { canonical: `${SITE_URL}${path}` },
    openGraph: { title: fullTitle, description, url: `${SITE_URL}${path}`, type: "website", siteName: "Plataforma Esdras", locale: "pt_BR" },
    twitter: { card: "summary", title: fullTitle, description },
  };
}

export const navigation = [
  { href: "/#modulos", label: "Produto" },
  { href: "/#planos", label: "Planos" },
  { href: "/quem-somos", label: "Quem somos" },
  { href: "/blog", label: "Blog" },
  { href: "/demonstracao", label: "Agendar demonstração" },
];
