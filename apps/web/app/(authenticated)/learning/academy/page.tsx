"use client";

import dynamic from "next/dynamic";

const AcademyView = dynamic(
  () => import("../../../../src/features/learning/academy-view").then((mod) => mod.AcademyView),
  { ssr: false }
);

export default function Page() {
  return <AcademyView />;
}
