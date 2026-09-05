import { describe, it, expect } from "vitest";
import { calculateProgress } from "./index";

describe("calculateProgress", () => {
  it("should return 0 when total is 0", () => {
    expect(calculateProgress(5, 0)).toBe(0);
  });

  it("should return 0 when total is less than 0", () => {
    expect(calculateProgress(5, -5)).toBe(0);
  });

  it("should return 100 when completed is equal to total", () => {
    expect(calculateProgress(10, 10)).toBe(100);
  });

  it("should return 100 when completed is greater than total", () => {
    expect(calculateProgress(15, 10)).toBe(100);
  });

  it("should return correct percentage for normal calculation", () => {
    expect(calculateProgress(5, 10)).toBe(50);
  });

  it("should round the percentage to nearest integer", () => {
    expect(calculateProgress(1, 3)).toBe(33);
    expect(calculateProgress(2, 3)).toBe(67);
  });
});
