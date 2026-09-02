"use client";

import { useState } from "react";
import { Handshake, Music } from "lucide-react";
import { ServingView } from "./serving-view";
import { WorshipView } from "./worship-view";

// Escalas e Louvor & Cifras viviam em itens de menu separados — juntos
// aqui como abas de uma página só.
export function ServingWithWorshipView() {
  const [tab, setTab] = useState<"serving" | "worship">("serving");

  return (
    <div>
      <div style={{ display: "flex", gap: 4, padding: "16px 20px 0" }}>
        <TabButton
          active={tab === "serving"}
          onClick={() => setTab("serving")}
          icon={Handshake}
          label="Escalas"
        />
        <TabButton
          active={tab === "worship"}
          onClick={() => setTab("worship")}
          icon={Music}
          label="Louvor & Cifras"
        />
      </div>
      {tab === "serving" ? <ServingView /> : <WorshipView />}
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
