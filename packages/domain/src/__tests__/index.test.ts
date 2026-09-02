import { describe, it, expect } from 'vitest';
import { getGroupTypeLabel } from '../index';

describe('getGroupTypeLabel', () => {
  it('returns correctly for cell', () => {
    expect(getGroupTypeLabel('cell')).toBe('Celula');
  });

  it('returns correctly for small_group', () => {
    expect(getGroupTypeLabel('small_group')).toBe('Pequeno grupo');
  });

  it('returns correctly for class', () => {
    expect(getGroupTypeLabel('class')).toBe('Classe');
  });

  it('returns correctly for youth_group', () => {
    expect(getGroupTypeLabel('youth_group')).toBe('Grupo de jovens');
  });

  it('returns correctly for ministry_team', () => {
    expect(getGroupTypeLabel('ministry_team')).toBe('Time ministerial');
  });

  it('returns undefined for unknown type', () => {
    // @ts-expect-error - testing invalid input
    expect(getGroupTypeLabel('unknown')).toBeUndefined();
  });
});
