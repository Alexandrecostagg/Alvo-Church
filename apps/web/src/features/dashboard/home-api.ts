"use client";
import { useCallback, useEffect, useState } from "react";
import { useAppAuth } from "../../../app/providers";

export function useHomeApi() {
  const { user, organizationId, roles, tenantReady } = useAppAuth();
  const identity = `${organizationId}:${user?.uid}:${roles.join(",")}:${tenantReady}`;
  const call = useCallback(
    async <T>(
      body: Record<string, unknown>,
      signal?: AbortSignal,
    ): Promise<T> => {
      if (!user || !tenantReady) throw Error("Entre novamente para continuar.");
      const response = await fetch("/api/home", {
        method: "POST",
        cache: "no-store",
        signal,
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ ...body, organizationId }),
      });
      const data = await response.json();
      if (!response.ok)
        throw Error(
          data.error || "Não foi possível concluir. Tente novamente.",
        );
      return data as T;
    },
    [user, organizationId, tenantReady, identity],
  );
  return { call, identity, ready: !!user && tenantReady };
}
export function useHomeResource<T>(
  body: Record<string, unknown>,
  revision = 0,
) {
  const { call, identity, ready } = useHomeApi();
  const query = JSON.stringify(body),
    key = `${identity}:${query}:${revision}`;
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
  }, [call, query, key, ready]);
  return {
    data: result?.key === key ? result.data : undefined,
    error: result?.key === key ? result.error : undefined,
  };
}
