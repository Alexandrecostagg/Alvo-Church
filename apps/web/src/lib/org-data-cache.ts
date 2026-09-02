"use client";

import {
  fetchPeople,
  fetchGroups,
  type FirebaseWebRuntimeConfig,
} from "@alvo/firebase";
import type { TenantContext } from "@alvo/types";

// Cache de curta duração para as coleções mais rebuscadas do app (people e
// groups), compartilhado entre telas. Resolve dois desperdícios medidos:
//
//   1. A MESMA coleção era baixada do zero por cada tela (14 call-sites de
//      fetchPeople) a cada navegação — Dashboard → Relatórios refazia tudo.
//   2. Chamadas simultâneas duplicadas: a tela de Relatórios e o writer de
//      NetworkSnapshot disparavam fetchPeople(2000) ao mesmo tempo,
//      dobrando ~2000 leituras numa única abertura de página.
//
// Estratégia:
//   - Dedupe em voo: chamadas concorrentes para a mesma org reutilizam a
//     mesma Promise.
//   - Coalescing de limites: um resultado cacheado com limit >= o pedido é
//     fatiado (`slice`) — o Firestore ordena por document ID por padrão,
//     então os N primeiros de uma query maior são exatamente o resultado
//     da query menor.
//   - TTL curto (30s): telas de leitura/analytics toleram esses segundos de
//     staleness; telas de CRUD (Pessoas, Grupos, ficha do membro) NÃO usam
//     este cache e continuam lendo direto.
//
// Após uma escrita que precise refletir imediatamente em telas cacheadas,
// chame invalidateOrgDataCache(organizationId).

const TTL_MS = 30_000;

interface CacheEntry<T> {
  limit: number;
  promise: Promise<T[]>;
  expiresAt: number;
}

const peopleCache = new Map<
  string,
  CacheEntry<Awaited<ReturnType<typeof fetchPeople>>[number]>
>();
const groupsCache = new Map<
  string,
  CacheEntry<Awaited<ReturnType<typeof fetchGroups>>[number]>
>();

function readThrough<T>(
  cache: Map<string, CacheEntry<T>>,
  organizationId: string,
  maxItems: number,
  loader: (limit: number) => Promise<T[]>,
): Promise<T[]> {
  const entry = cache.get(organizationId);
  const now = Date.now();

  if (entry && entry.expiresAt > now && entry.limit >= maxItems) {
    return entry.promise.then((items) =>
      items.length > maxItems ? items.slice(0, maxItems) : items,
    );
  }

  // Busca com o maior limite já visto para esta org — assim uma tela que
  // pede 100 depois de outra que pediu 2000 não rebaixa o cache.
  const effectiveLimit = Math.max(maxItems, entry?.limit ?? 0);
  const promise = loader(effectiveLimit);
  const next: CacheEntry<T> = {
    limit: effectiveLimit,
    promise,
    expiresAt: now + TTL_MS,
  };
  cache.set(organizationId, next);

  // Uma falha não pode ficar cacheada — remove a entrada pra próxima
  // chamada tentar de novo.
  promise.catch(() => {
    if (cache.get(organizationId) === next) cache.delete(organizationId);
  });

  return promise.then((items) =>
    items.length > maxItems ? items.slice(0, maxItems) : items,
  );
}

/** Versão cacheada de fetchPeople — mesma assinatura e mesmo resultado. */
export function cachedFetchPeople(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  maxItems = 8,
) {
  return readThrough(peopleCache, context.organizationId, maxItems, (limit) =>
    fetchPeople(config, context, limit),
  );
}

/** Versão cacheada de fetchGroups — mesma assinatura e mesmo resultado. */
export function cachedFetchGroups(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  maxItems = 8,
) {
  return readThrough(groupsCache, context.organizationId, maxItems, (limit) =>
    fetchGroups(config, context, limit),
  );
}

/** Descarta o cache da org (ou de todas) — use após escritas relevantes. */
export function invalidateOrgDataCache(organizationId?: string) {
  if (organizationId) {
    peopleCache.delete(organizationId);
    groupsCache.delete(organizationId);
  } else {
    peopleCache.clear();
    groupsCache.clear();
  }
}
