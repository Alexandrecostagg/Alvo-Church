"use client";

import dynamic from "next/dynamic";
import { ModuleGuard } from "../../../contexts/ModuleGuard";

const CommunicationView = dynamic(
  () => import("../../../src/features/communication/communication-view").then((mod) => mod.CommunicationView),
  { ssr: false }
);

export default function CommunicationPage() {
  return (
    <ModuleGuard moduleKey="communication">
      <CommunicationView />
    </ModuleGuard>
  );
}
