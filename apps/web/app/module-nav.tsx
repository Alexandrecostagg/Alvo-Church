"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ClipboardList,
  LayoutDashboard,
  Map,
  UserPlus,
  UsersRound
} from "lucide-react";

const moduleNavItems = [
  {
    label: "Painel",
    description: "Visao geral",
    href: "/",
    icon: LayoutDashboard,
    match: (pathname: string) => pathname === "/"
  },
  {
    label: "Portaria",
    description: "Visitantes",
    href: "/reception",
    icon: ClipboardList,
    match: (pathname: string) => pathname.startsWith("/reception")
  },
  {
    label: "Membros",
    description: "Base pastoral",
    href: "/members",
    icon: UsersRound,
    match: (pathname: string) => pathname === "/members" || /^\/members\/[^/]+$/.test(pathname)
  },
  {
    label: "Jornadas",
    description: "Funil vivo",
    href: "/journeys",
    icon: Map,
    match: (pathname: string) => pathname.startsWith("/journeys")
  },
  {
    label: "Novo membro",
    description: "Cadastro",
    href: "/members/new",
    icon: UserPlus,
    match: (pathname: string) => pathname.startsWith("/members/new")
  },
  {
    label: "SaaS",
    description: "Instituicoes",
    href: "/saas/organizations/new",
    icon: Building2,
    match: (pathname: string) => pathname.startsWith("/saas")
  }
];

export function ModuleNav() {
  const pathname = usePathname();

  return (
    <nav className="module-nav" aria-label="Navegacao entre modulos do Getro">
      <div>
        <span>Getro Church</span>
        <strong>Central de modulos</strong>
      </div>
      <div className="module-nav-links">
        {moduleNavItems.map((item) => {
          const isActive = item.match(pathname);

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={isActive ? "module-nav-link is-active" : "module-nav-link"}
              href={item.href}
              key={item.href}
            >
              <item.icon size={17} />
              <span>
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
