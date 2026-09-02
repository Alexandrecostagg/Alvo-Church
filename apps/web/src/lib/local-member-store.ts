import type { Family, FamilyMember, Person } from "@alvo/types";

const LOCAL_MEMBER_STORE_KEY = "alvo.localMemberStore.v1";

interface LocalMemberStoreSnapshot {
  families: Family[];
  familyMembers: FamilyMember[];
  people: Person[];
}

const emptySnapshot: LocalMemberStoreSnapshot = {
  families: [],
  familyMembers: [],
  people: [],
};

export function loadLocalMemberStore(): LocalMemberStoreSnapshot {
  if (typeof window === "undefined") {
    return emptySnapshot;
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_MEMBER_STORE_KEY);

    if (!raw) {
      return emptySnapshot;
    }

    const parsed = JSON.parse(raw) as Partial<LocalMemberStoreSnapshot>;

    return {
      families: Array.isArray(parsed.families) ? parsed.families : [],
      familyMembers: Array.isArray(parsed.familyMembers)
        ? parsed.familyMembers
        : [],
      people: Array.isArray(parsed.people) ? parsed.people : [],
    };
  } catch {
    return emptySnapshot;
  }
}

export function saveLocalMemberProfile(params: {
  family?: Family;
  familyMember?: FamilyMember;
  person: Person;
}) {
  if (typeof window === "undefined") {
    return;
  }

  const current = loadLocalMemberStore();
  const next: LocalMemberStoreSnapshot = {
    families: upsertById(current.families, params.family),
    familyMembers: upsertById(current.familyMembers, params.familyMember),
    people: upsertById(current.people, params.person),
  };

  window.localStorage.setItem(LOCAL_MEMBER_STORE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("alvo-local-members-updated"));
}

function upsertById<T extends { id: string }>(items: T[], nextItem?: T) {
  if (!nextItem) {
    return items;
  }

  const existingIndex = items.findIndex((item) => item.id === nextItem.id);

  if (existingIndex === -1) {
    return [nextItem, ...items];
  }

  return items.map((item) => (item.id === nextItem.id ? nextItem : item));
}
