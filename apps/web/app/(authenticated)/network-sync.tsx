"use client";

import { useNetworkSnapshotWriter } from "../../src/hooks/useNetworkSnapshotWriter";

export function NetworkSync() {
  useNetworkSnapshotWriter();
  return null;
}
