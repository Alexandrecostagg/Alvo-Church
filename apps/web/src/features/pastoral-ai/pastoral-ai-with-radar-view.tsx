"use client";

import { useState } from "react";
import { Bot, Radar } from "lucide-react";
import { PastoralAiView } from "./pastoral-ai-view";
import { CareRadarView } from "../care-radar/care-radar-view";

// Assistente IA e Radar Pastoral viviam em itens de menu separados — juntos
// aqui como abas de uma página só ("Cuidado Pastoral").
export function PastoralAiWithRadarView() {
  const [tab, setTab] = useState<"ai" | "radar">("ai");

  return (
    <div>
      <div style={{ display: "flex", gap: 4, padding: "16px 20px 0" }}>
        <TabButton
          active={tab === "ai"}
          onClick={() => setTab("ai")}
          icon={Bot}
          label="Assistente IA"
        />
        <TabButton
          active={tab === "radar"}
          onClick={() => setTab("radar")}
          icon={Radar}
          label="Radar Pastoral"
        />
      </div>
      {tab === "ai" ? <PastoralAiView /> : <CareRadarView />}
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
