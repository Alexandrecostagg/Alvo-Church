"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Building2,
  Bot,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileBarChart2,
  GraduationCap,
  Handshake,
  HeartHandshake,
  Landmark,
  LayoutDashboard,
  Map as MapIcon,
  MessageSquareText,
  Music,
  Settings,
  ShieldCheck,
  Store,
  Tent,
  CalendarRange,
  Tv,
  UserCircle,
  UserPlus,
  UsersRound,
  Waypoints,
} from "lucide-react";
import { BrandLogo } from "../brand-logo";
import { useOrgFeatures } from "../../contexts/OrgFeaturesContext";
import type { ModuleKey } from "@alvo/domain";
import { Building2 as NetworkIcon, Layers } from "lucide-react";

type NavItem = {
  label: string;
  icon: React.ElementType;
  href: string;
  moduleKey?: ModuleKey;
  match: (pathname: string, searchParams: URLSearchParams) => boolean;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const ORG_TIER_LABELS: Record<string, string> = {
  solo:         "Igreja",
  campus:       "Multi-campus",
  network:      "Rede de Igrejas",
  denomination: "Denominação",
};

function buildNavigationGroups(groupsLabel: string, orgTier: string): NavGroup[] {
  return [
    {
      title: "Geral",
      items: [
        { label: "Dashboard", icon: LayoutDashboard, href: "/", match: (pathname) => pathname === "/" },
        { label: "Recepção", icon: ClipboardList, href: "/reception", moduleKey: "visitors", match: (pathname, searchParams) => pathname.startsWith("/reception") && searchParams.get("pastor") !== "1" },
        { label: "Painel Pastor", icon: Tv, href: "/reception?pastor=1", moduleKey: "visitors", match: (pathname, searchParams) => pathname.startsWith("/reception") && searchParams.get("pastor") === "1" },
        { label: "IA Pastoral", icon: Bot, href: "/pastoral-ai", moduleKey: "ai", match: (pathname) => pathname.startsWith("/pastoral-ai") },
        { label: "Finanças", icon: Landmark, href: "/finance", moduleKey: "finance", match: (pathname) => pathname.startsWith("/finance") },
      ]
    },
    {
      title: "Membros",
      items: [
        { label: "Minha Area", icon: UserCircle, href: "/me", match: (pathname) => pathname.startsWith("/me") },
        { label: "Pessoas", icon: UsersRound, href: "/members", match: (pathname) => pathname === "/members" || /^\/members\/[^/]+$/.test(pathname) },
        { label: "Novo Membro", icon: UserPlus, href: "/members/new", match: (pathname) => pathname.startsWith("/members/new") },
        { label: "Marketplace", icon: Store, href: "/marketplace-community", moduleKey: "marketplace", match: (pathname) => pathname.startsWith("/marketplace-community") || pathname.startsWith("/marketplace") },
        { label: "Comunicação", icon: MessageSquareText, href: "/communication", moduleKey: "communication", match: (pathname) => pathname.startsWith("/communication") },
        { label: "Doações", icon: HeartHandshake, href: "/giving", moduleKey: "giving", match: (pathname) => pathname.startsWith("/giving") },
      ]
    },
    {
      title: "Estrategia",
      items: [
        { label: "Tribos", icon: Tent, href: "/tribes", moduleKey: "tribes", match: (pathname) => pathname.startsWith("/tribes") },
        { label: groupsLabel, icon: Waypoints, href: "/groups", moduleKey: "groups", match: (pathname) => pathname.startsWith("/groups") },
        { label: "Jornadas", icon: MapIcon, href: "/journeys", moduleKey: "journeys", match: (pathname) => pathname.startsWith("/journeys") },
        { label: "Escola EAD", icon: GraduationCap, href: "/learning/academy", moduleKey: "journeys", match: (pathname) => pathname.startsWith("/learning") },
        { label: "Eventos", icon: CalendarRange, href: "/events", moduleKey: "events", match: (pathname) => pathname.startsWith("/events") },
        { label: "Escalas", icon: Handshake, href: "/serving", moduleKey: "volunteers", match: (pathname) => pathname === "/serving" },
        { label: "Louvor & Cifras", icon: Music, href: "/serving/worship", moduleKey: "volunteers", match: (pathname) => pathname.startsWith("/serving/worship") },
        { label: "Segurança Kids", icon: ShieldCheck, href: "/kids/scan", moduleKey: "children", match: (pathname) => pathname.startsWith("/kids/scan") },
      ]
    },
    {
      title: "Admin",
      items: [
        ...(orgTier === "network" || orgTier === "denomination" ? [
          { label: "Rede de Igrejas", icon: NetworkIcon, href: "/network", match: (pathname: string) => pathname.startsWith("/network") },
        ] : []),
        { label: "Relatórios", icon: FileBarChart2, href: "/reports", match: (pathname: string) => pathname.startsWith("/reports") },
        { label: "Notificações", icon: Bell, href: "/notifications", match: (pathname: string) => pathname.startsWith("/notifications") },
        { label: "Organizações", icon: Building2, href: "/saas/organizations/new", match: (pathname: string) => pathname.startsWith("/saas") },
        { label: "Configurações", icon: Settings, href: "/settings", match: (pathname: string) => pathname.startsWith("/settings") },
      ]
    }
  ];
}

export function ModuleNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeLinkRef = useRef<HTMLAnchorElement | null>(null);
  const { ready, isEnabled, isBeta, groupsLabel, orgTier } = useOrgFeatures();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    activeLinkRef.current?.scrollIntoView({ block: "center", inline: "nearest" });
  }, [pathname]);

  const navigationGroups = buildNavigationGroups(groupsLabel, orgTier);

  const visibleGroups = navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.moduleKey) return true;
        return isEnabled(item.moduleKey);
      })
    }))
    .filter((group) => group.items.length > 0);

  const CollapseIcon = collapsed ? ChevronRight : ChevronLeft;

  return (
    <aside className="app-sidebar" data-collapsed={collapsed ? "true" : "false"}>
      <div className="sidebar-header">
        <BrandLogo compact size={42} iconOnly={collapsed} />
        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
          aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
        >
          <CollapseIcon size={16} strokeWidth={2.2} />
        </button>
      </div>
      <nav className="app-nav" aria-label="Navegacao principal">
        {visibleGroups.map((group) => (
          <div key={group.title} className="nav-group">
            <span className="nav-group-title">{group.title}</span>
            <div className="nav-group-items">
              {group.items.map((item) => {
                const isActive = item.match(pathname, searchParams);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    ref={isActive ? activeLinkRef : undefined}
                    className={isActive ? "app-nav-item is-active" : "app-nav-item"}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon size={18} strokeWidth={2.2} />
                    <span>{item.label}</span>
                    {item.moduleKey && isBeta(item.moduleKey) && (
                      <span className="nav-badge-beta">beta</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-status">
          <ShieldCheck size={14} />
          <span>Getro Growth · {ORG_TIER_LABELS[orgTier]}</span>
        </div>
        {!collapsed && (orgTier === "network" || orgTier === "denomination") && (
          <div className="sidebar-tier-badge">
            <Layers size={11} />
            <span>{ORG_TIER_LABELS[orgTier]}</span>
          </div>
        )}
      </div>
    </aside>
  );
}
