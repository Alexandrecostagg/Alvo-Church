"use client";

import { useState } from "react";
import { Settings, Building2, UsersRound, Layers } from "lucide-react";
import { SettingsView } from "./settings-view";
import { UsersView } from "./users-view";
import { PlanoView } from "./plano-view";
import { OrganizationNewView } from "../saas/organization-new-view";

// Configurações, Organizações, Usuários e Plano viviam em 4 itens de menu
// separados — juntos aqui como abas de uma página só ("Configurações").
export function SettingsWithAdminTabsView() {
  const [tab, setTab] = useState<"settings" | "org" | "users" | "plano">("settings");

  return (
    <div>
      <div style={{ display: "flex", gap: 4, padding: "16px 20px 0", flexWrap: "wrap" }}>
        <TabButton active={tab === "settings"} onClick={() => setTab("settings")} icon={Settings} label="Geral" />
        <TabButton active={tab === "org"} onClick={() => setTab("org")} icon={Building2} label="Organizações" />
        <TabButton active={tab === "users"} onClick={() => setTab("users")} icon={UsersRound} label="Usuários" />
        <TabButton active={tab === "plano"} onClick={() => setTab("plano")} icon={Layers} label="Plano" />
      </div>
      {tab === "settings" && <SettingsView />}
      {tab === "org" && <OrganizationNewView />}
      {tab === "users" && <UsersView />}
      {tab === "plano" && <PlanoView />}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ElementType; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "8px 16px", borderRadius: "9px 9px 0 0",
        border: "none", borderBottom: active ? "2px solid #f97316" : "2px solid transparent",
        background: "none", cursor: "pointer",
        fontSize: 13, fontWeight: active ? 700 : 500,
        color: active ? "var(--color-text-primary, #0f172a)" : "var(--color-text-secondary, #6b7280)",
      }}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}
