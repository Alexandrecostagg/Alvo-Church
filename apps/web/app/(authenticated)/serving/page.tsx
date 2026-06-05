"use client";

import dynamic from "next/dynamic";

const ServingView = dynamic(
  () => import("../../../src/features/serving/serving-view").then((mod) => mod.ServingView),
  { ssr: false }
);

export default function ServingPage() {
  return <ServingView />;
}
