"use client";

import dynamic from "next/dynamic";

// Loja de Capacitação: produto vendido pela plataforma, disponível a QUALQUER
// igreja independente do plano — por isso NÃO fica atrás do ModuleGuard/PlanGuard.
// O acesso ao conteúdo é gated por entitlement (compra), não por plano.
const CapacitacaoStoreView = dynamic(
  () => import("../../../src/features/capacitacao/capacitacao-store-view").then((mod) => mod.CapacitacaoStoreView),
  { ssr: false }
);

export default function Page() {
  return <CapacitacaoStoreView />;
}
