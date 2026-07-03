"use client";

import React from "react";

/* ── Sparkline ───────────────────────────────────────────────────────────── */
interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  filled?: boolean;
}

export function Sparkline({ data, color = "var(--alvo-accent)", width = 120, height = 36, filled = true }: SparklineProps) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const W = 200; // internal coordinate space
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });
  const polyline = pts.join(" ");
  const area = `0,${height} ${polyline} ${W},${height}`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" style={{ overflow: "visible", display: "block" }}>
      {filled && (
        <polygon points={area} fill={color} fillOpacity={0.12} />
      )}
      <polyline points={polyline} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ── Bar chart ───────────────────────────────────────────────────────────── */
interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  showValues?: boolean;
}

export function BarChart({ data, height = 120, showValues = true }: BarChartProps) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.value), 1);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height, width: "100%" }}>
      {data.map((item, i) => {
        const pct = (item.value / max) * 100;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%" }}>
            <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              {showValues && (
                <span style={{ fontSize: 10, color: "var(--alvo-ink-soft)", textAlign: "center", marginBottom: 2 }}>
                  {item.value.toLocaleString("pt-BR")}
                </span>
              )}
              <div
                style={{
                  width: "100%",
                  height: `${Math.max(pct, 4)}%`,
                  background: item.color ?? "var(--alvo-accent)",
                  borderRadius: "4px 4px 0 0",
                  opacity: 0.85,
                  transition: "height 0.3s ease",
                }}
              />
            </div>
            <span style={{ fontSize: 10, color: "var(--alvo-ink-soft)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Donut / ring ────────────────────────────────────────────────────────── */
interface DonutProps {
  value: number;   // 0–100
  color?: string;
  size?: number;
  label?: string;
}

export function Donut({ value, color = "var(--alvo-accent)", size = 80, label }: DonutProps) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--alvo-line)" strokeWidth={8} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      {label && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "var(--alvo-ink)" }}>
          {label}
        </div>
      )}
    </div>
  );
}

/* ── Metric card com sparkline ───────────────────────────────────────────── */
interface MetricCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaPositive?: boolean;
  trend?: number[];
  color?: string;
  icon?: React.ReactNode;
}

export function MetricCard({ label, value, delta, deltaPositive, trend, color = "var(--alvo-accent)", icon }: MetricCardProps) {
  return (
    <div style={{ background: "var(--alvo-surface)", border: "1px solid var(--alvo-line)", borderRadius: 14, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span style={{ fontSize: 12, color: "var(--alvo-ink-soft)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {label}
          </span>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--alvo-ink)", lineHeight: 1.1, marginTop: 4 }}>
            {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
          </div>
          {delta && (
            <div style={{ fontSize: 12, marginTop: 4, color: deltaPositive ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
              {deltaPositive ? "↑" : "↓"} {delta}
            </div>
          )}
        </div>
        {icon && (
          <div style={{ color, opacity: 0.7 }}>{icon}</div>
        )}
      </div>
      {trend && trend.length > 1 && (
        <Sparkline data={trend} color={color} width={140} height={32} />
      )}
    </div>
  );
}
