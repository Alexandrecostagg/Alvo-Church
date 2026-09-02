"use client";

import { useState } from "react";
import { Waypoints, BookOpen } from "lucide-react";
import { GroupsView } from "./groups-view";
import { WeeklyThemeView } from "../weekly-theme/weekly-theme-view";

// Células e Tema Semanal viviam em itens de menu separados — juntos aqui
// como abas de uma página só, pra desafogar a barra lateral. Cada aba
// renderiza a view inteira original (ela já traz seu próprio page-root).
export function GroupsWithThemeView() {
  const [tab, setTab] = useState<"groups" | "theme">("groups");

  return (
    <div>
      <div style={{ display: "flex", gap: 4, padding: "16px 20px 0" }}>
        <TabButton
          active={tab === "groups"}
          onClick={() => setTab("groups")}
          icon={Waypoints}
          label="Células"
        />
        <TabButton
          active={tab === "theme"}
          onClick={() => setTab("theme")}
          icon={BookOpen}
          label="Tema Semanal"
        />
      </div>
      {tab === "groups" ? <GroupsView /> : <WeeklyThemeView />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 16px",
        borderRadius: "9px 9px 0 0",
        border: "none",
        borderBottom: active ? "2px solid #f97316" : "2px solid transparent",
        background: "none",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        color: active
          ? "var(--color-text-primary, #0f172a)"
          : "var(--color-text-secondary, #6b7280)",
      }}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}
