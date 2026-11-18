"use client";
import { useCallback, useEffect, useState } from "react";
import { useAppAuth } from "../../../app/providers";
export function useGroupApi() {
  const { user, organizationId, tenantReady, roles } = useAppAuth();
  const identity = `${organizationId}:${user?.uid}:${roles.join(",")}:${tenantReady}`;
  const call = useCallback(
    async <T>(
      body: Record<string, unknown>,
      signal?: AbortSignal,
    ): Promise<T> => {
      if (!user || !tenantReady) throw Error("Entre novamente para continuar.");
      const r = await fetch("/api/groups", {
        method: "POST",
        cache: "no-store",
        signal,
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ ...body, organizationId }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error || "Não foi possível concluir.");
      return data;
    },
    [user, organizationId, identity, tenantReady],
  );
  return { call, identity, ready: !!user && tenantReady };
}
export function useGroupResource<T>(
  body: Record<string, unknown>,
  revision = 0,
) {
  const { call, identity, ready } = useGroupApi(),
    query = JSON.stringify(body),
    key = `${identity}:${query}`;
  const [result, setResult] = useState<{
    key: string;
    data?: T;
    error?: string;
  }>();
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    call<T>(JSON.parse(query), controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult({ key, data });
      })
      .catch((e) => {
        if (!controller.signal.aborted) setResult({ key, error: e.message });
      });
    return () => controller.abort();
  }, [call, key, query, ready, revision]);
  return {
    data: result?.key === key ? result.data : undefined,
    error: result?.key === key ? result.error : undefined,
  };
}
