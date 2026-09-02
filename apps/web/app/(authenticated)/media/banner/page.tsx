"use client";

import dynamic from "next/dynamic";

const BannerGenerator = dynamic(
  () => import("../../../../src/features/media/banner-generator").then((m) => m.BannerGenerator),
  { ssr: false }
);

export default function BannerPage() {
  return <BannerGenerator />;
}
export const runtime = 'edge';
