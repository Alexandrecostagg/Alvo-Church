"use client";

import dynamic from "next/dynamic";

const ReceptionView = dynamic(
  () => import("../../../src/features/reception/reception-view").then((mod) => mod.ReceptionView),
  { ssr: false }
);

export default function ReceptionPage() {
  return <ReceptionView />;
}
