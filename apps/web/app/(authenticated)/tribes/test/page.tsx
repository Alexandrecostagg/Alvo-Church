"use client";

import dynamic from "next/dynamic";

const TribeAssessmentView = dynamic(
  () => import("../../../../src/features/tribes/tribe-assessment-view").then((mod) => mod.TribeAssessmentView),
  { ssr: false }
);

export default function TribeAssessmentPage() {
  return <TribeAssessmentView />;
}
