export interface ProductEvent {
  name: string;
  organizationId?: string;
  personId?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export function trackEvent(event: ProductEvent) {
  return event;
}

