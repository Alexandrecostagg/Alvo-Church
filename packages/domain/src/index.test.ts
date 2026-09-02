import { describe, it, expect } from 'vitest';
import { checkScheduleConflict } from './index';
import type { ServiceAssignment } from '@alvo/types';

describe('checkScheduleConflict', () => {
  const baseAssignment: Omit<ServiceAssignment, "id" | "personId" | "serviceDate" | "status"> = {
    organizationId: "org-1",
    serviceTeamId: "team-1",
    ministryCode: "min-1",
    role: "role-1",
  };

  const createAssignment = (
    id: string,
    personId: string,
    serviceDate: string,
    status: ServiceAssignment['status'] = 'pending'
  ): ServiceAssignment => ({
    ...baseAssignment,
    id,
    personId,
    serviceDate,
    status,
  });

  const newAssignment = {
    id: "new-1",
    personId: "person-1",
    serviceDate: "2024-01-01T10:00:00Z"
  };

  it('should return null when there are no assignments', () => {
    expect(checkScheduleConflict([], newAssignment)).toBeNull();
  });

  it('should return null when personId is different', () => {
    const assignments = [
      createAssignment("existing-1", "person-2", "2024-01-01T10:00:00Z", "confirmed")
    ];
    expect(checkScheduleConflict(assignments, newAssignment)).toBeNull();
  });

  it('should return null when serviceDate is different', () => {
    const assignments = [
      createAssignment("existing-1", "person-1", "2024-01-02T10:00:00Z", "confirmed")
    ];
    expect(checkScheduleConflict(assignments, newAssignment)).toBeNull();
  });

  it('should return null when status is declined', () => {
    const assignments = [
      createAssignment("existing-1", "person-1", "2024-01-01T10:00:00Z", "declined")
    ];
    expect(checkScheduleConflict(assignments, newAssignment)).toBeNull();
  });

  it('should return null when assignment has the same id (updating same assignment)', () => {
    const assignments = [
      createAssignment("new-1", "person-1", "2024-01-01T10:00:00Z", "confirmed")
    ];
    expect(checkScheduleConflict(assignments, newAssignment)).toBeNull();
  });

  it('should return conflict when personId and serviceDate match, and status is not declined', () => {
    const conflictAssignment = createAssignment("existing-1", "person-1", "2024-01-01T10:00:00Z", "confirmed");
    const assignments = [conflictAssignment];
    expect(checkScheduleConflict(assignments, newAssignment)).toEqual(conflictAssignment);
  });

  it('should return conflict when personId and serviceDate match, and status is pending', () => {
    const conflictAssignment = createAssignment("existing-1", "person-1", "2024-01-01T10:00:00Z", "pending");
    const assignments = [conflictAssignment];
    expect(checkScheduleConflict(assignments, newAssignment)).toEqual(conflictAssignment);
  });

  it('should return the first conflict if multiple conflicts exist', () => {
    const conflictAssignment1 = createAssignment("existing-1", "person-1", "2024-01-01T10:00:00Z", "confirmed");
    const conflictAssignment2 = createAssignment("existing-2", "person-1", "2024-01-01T10:00:00Z", "pending");
    const assignments = [conflictAssignment1, conflictAssignment2];

    expect(checkScheduleConflict(assignments, newAssignment)).toEqual(conflictAssignment1);
  });

  it('should find conflict among non-conflicting assignments', () => {
    const otherAssignment1 = createAssignment("existing-1", "person-2", "2024-01-01T10:00:00Z", "confirmed");
    const otherAssignment2 = createAssignment("existing-2", "person-1", "2024-01-02T10:00:00Z", "confirmed");
    const conflictAssignment = createAssignment("existing-3", "person-1", "2024-01-01T10:00:00Z", "confirmed");

    const assignments = [otherAssignment1, otherAssignment2, conflictAssignment];

    expect(checkScheduleConflict(assignments, newAssignment)).toEqual(conflictAssignment);
  });
});
