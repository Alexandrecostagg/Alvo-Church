"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Tv,
  Bot,
  Landmark,
  UserCircle,
  UsersRound,
  UserPlus,
  Store,
  MessageSquareText,
  HeartHandshake,
  Tent,
  Waypoints,
  Map as MapIcon,
  GraduationCap,
  CalendarRange,
  Handshake,
  Music,
  ShieldCheck,
  Building2,
  Settings,
} from "lucide-react";

type ModuleInfo = { label: string; icon: React.ElementType };

const MODULE_MAP: Array<{ match: (p: string) => boolean } & ModuleInfo> = [
  { match: (p) => p === "/", label: "Dashboard", icon: LayoutDashboard },
  { match: (p) => p.startsWith("/reception") && !p.includes("pastor"), label: "Recepção", icon: ClipboardList },
  { match: (p) => p.startsWith("/reception"), label: "Painel Pastor", icon: Tv },
  { match: (p) => p.startsWith("/pastoral-ai"), label: "IA Pastoral", icon: Bot },
  { match: (p) => p.startsWith("/finance"), label: "Finanças", icon: Landmark },
  { match: (p) => p.startsWith("/me"), label: "Minha Área", icon: UserCircle },
  { match: (p) => p.startsWith("/members/new"), label: "Novo Membro", icon: UserPlus },
  { match: (p) => p.startsWith("/members"), label: "Pessoas", icon: UsersRound },
  { match: (p) => p.startsWith("/marketplace"), label: "Marketplace", icon: Store },
  { match: (p) => p.startsWith("/communication"), label: "Comunicação", icon: MessageSquareText },
  { match: (p) => p.startsWith("/giving"), label: "Doações", icon: HeartHandshake },
  { match: (p) => p.startsWith("/tribes"), label: "Tribos", icon: Tent },
  { match: (p) => p.startsWith("/groups"), label: "Células", icon: Waypoints },
  { match: (p) => p.startsWith("/journeys"), label: "Jornadas", icon: MapIcon },
  { match: (p) => p.startsWith("/learning"), label: "Escola EAD", icon: GraduationCap },
  { match: (p) => p.startsWith("/events"), label: "Eventos", icon: CalendarRange },
  { match: (p) => p.startsWith("/serving/worship"), label: "Louvor & Cifras", icon: Music },
  { match: (p) => p.startsWith("/serving"), label: "Escalas", icon: Handshake },
  { match: (p) => p.startsWith("/kids"), label: "Segurança Kids", icon: ShieldCheck },
  { match: (p) => p.startsWith("/saas"), label: "Organizações", icon: Building2 },
  { match: (p) => p.startsWith("/settings"), label: "Configurações", icon: Settings },
];

export function TopBar() {
  const pathname = usePathname();

  const current = MODULE_MAP.find((m) => m.match(pathname)) ?? {
    label: "Alvo",
    icon: LayoutDashboard,
  };

  const Icon = current.icon;

  return (
    <div className="app-topbar">
      <div className="app-topbar-title">
        <Icon size={18} strokeWidth={2} />
        <span>{current.label}</span>
      </div>
    </div>
  );
}
