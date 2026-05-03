"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarDays,
  ClipboardList,
  Handshake,
  HeartHandshake,
  Landmark,
  LayoutDashboard,
  Map as MapIcon,
  MessageSquareText,
  ShieldCheck,
  UserCircle,
  UserPlus,
  UsersRound,
  Waypoints,
  Tent
} from "lucide-react";
import { BrandLogo } from "../brand-logo";

const moduleNavItems = [
  { label: "Resumo", icon: LayoutDashboard, href: "/", match: (pathname: string) => pathname === "/" },
  { label: "Minha Area", icon: UserCircle, href: "/me", match: (pathname: string) => pathname.startsWith("/me") },
  { label: "Portaria", icon: ClipboardList, href: "/reception", match: (pathname: string) => pathname.startsWith("/reception") },
  { label: "Pessoas", icon: UsersRound, href: "/members", match: (pathname: string) => pathname === "/members" || /^\/members\/[^/]+$/.test(pathname) },
  { label: "Jornadas", icon: MapIcon, href: "/journeys", match: (pathname: string) => pathname.startsWith("/journeys") },
  { label: "Tribos", icon: Tent, href: "/tribes", match: (pathname: string) => pathname.startsWith("/tribes") },
  { label: "Celulas", icon: Waypoints, href: "/groups", match: (pathname: string) => pathname.startsWith("/groups") },
  { label: "Escalas", icon: Handshake, href: "/serving", match: (pathname: string) => pathname.startsWith("/serving") },
  { label: "Novo membro", icon: UserPlus, href: "/members/new", match: (pathname: string) => pathname.startsWith("/members/new") },
  { label: "SaaS", icon: Building2, href: "/saas/organizations/new", match: (pathname: string) => pathname.startsWith("/saas") }
];

export function ModuleNav() {
  const pathname = usePathname();

  return (
    <aside className="app-sidebar">
      <BrandLogo compact size={42} />
      <nav className="app-nav" aria-label="Navegacao principal">
        {moduleNavItems.map((item) => {
          const isActive = item.match(pathname);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={isActive ? "app-nav-item is-active" : "app-nav-item"}
            >
              <item.icon size={18} strokeWidth={2.2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-status">
        <ShieldCheck size={18} />
        <span>Getro Growth · Co-branded</span>
      </div>
    </aside>
  );
}
