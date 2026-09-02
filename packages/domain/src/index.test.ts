import { describe, it, expect } from 'vitest';
import { createDashboardSnapshot } from './index';
import type { Organization, AuthUser } from '@alvo/types';

describe('createDashboardSnapshot', () => {
  it('creates a snapshot with zero totals', () => {
    const mockOrg: Organization = {
      id: 'org-1',
      name: 'Test Org',
      slug: 'test-org',
      brandColor: '#000000',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Organization;

    const mockUser: AuthUser = {
      id: 'user-1',
      uid: 'firebase-uid',
      email: 'test@example.com',
      roles: ['church_admin'],
      status: 'active',
    } as AuthUser;

    const result = createDashboardSnapshot({
      organization: mockOrg,
      currentUser: mockUser,
    });

    expect(result).toEqual({
      organization: mockOrg,
      currentUser: mockUser,
      totals: {
        people: 0,
        families: 0,
        visitors: 0,
        groups: 0,
      }
    });
  });
});
