import { LoaderCircle } from "lucide-react";

export function ModuleLoading({ label = "Carregando módulo" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: 280,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        color: "var(--alvo-ink-soft, #5d6470)",
        fontSize: 14,
      }}
    >
      <LoaderCircle size={20} className="spin" aria-hidden="true" />
      <span>{label}...</span>
    </div>
  );
}
