"use client";

import dynamic from "next/dynamic";

const MyStoresView = dynamic(
  () =>
    import("../../../../src/features/marketplace-community/my-stores-view").then(
      (mod) => mod.MyStoresView,
    ),
  { ssr: false },
);

export default function Page() {
  return <MyStoresView />;
}
