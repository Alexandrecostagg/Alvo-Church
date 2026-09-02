import { describe, it, expect } from "vitest";
import { isModuleEnabled, getEnabledModuleCount, ModulesConfig } from "./featureGate";

describe("featureGate", () => {
  const createMockModules = (
    overrides?: Partial<ModulesConfig>
  ): ModulesConfig => {
    // Start with a base set of all modules disabled
    const base: ModulesConfig = {
      core: { enabled: false, source: "plan" },
      visitors: { enabled: false, source: "plan" },
      groups: { enabled: false, source: "plan" },
      events: { enabled: false, source: "plan" },
      children: { enabled: false, source: "plan" },
      youth: { enabled: false, source: "plan" },
      volunteers: { enabled: false, source: "plan" },
      tribes: { enabled: false, source: "plan" },
      giving: { enabled: false, source: "plan" },
      publicForms: { enabled: false, source: "plan" },
      finance: { enabled: false, source: "plan" },
      ai: { enabled: false, source: "plan" },
    };
    return { ...base, ...overrides } as ModulesConfig;
  };

  describe("isModuleEnabled", () => {
    it("returns true when the module is explicitly enabled", () => {
      const modules = createMockModules({
        core: { enabled: true, source: "plan" },
      });
      expect(isModuleEnabled(modules, "core")).toBe(true);
    });

    it("returns false when the module is explicitly disabled", () => {
      const modules = createMockModules({
        core: { enabled: false, source: "plan" },
      });
      expect(isModuleEnabled(modules, "core")).toBe(false);
    });

    it("returns false when the module config is undefined (edge case for missing key)", () => {
      // Simulate an incomplete config where 'core' might somehow be missing
      const modules = {} as ModulesConfig;
      expect(isModuleEnabled(modules, "core")).toBe(false);
    });

    it("returns false when the module config exists but enabled is somehow missing", () => {
      const modules = { core: {} } as ModulesConfig;
      expect(isModuleEnabled(modules, "core")).toBe(false);
    });
  });

  describe("getEnabledModuleCount", () => {
    it("returns 0 when no modules are enabled", () => {
      const modules = createMockModules();
      expect(getEnabledModuleCount(modules)).toBe(0);
    });

    it("returns the correct count when a subset of modules are enabled", () => {
      const modules = createMockModules({
        core: { enabled: true, source: "plan" },
        events: { enabled: true, source: "addon" },
        finance: { enabled: true, source: "manual" },
      });
      expect(getEnabledModuleCount(modules)).toBe(3);
    });

    it("returns the correct count when all available modules are enabled", () => {
      const allEnabled = Object.keys(createMockModules()).reduce((acc, key) => {
        acc[key as keyof ModulesConfig] = { enabled: true, source: "plan" };
        return acc;
      }, {} as ModulesConfig);

      expect(getEnabledModuleCount(allEnabled)).toBe(12);
    });

    it("ignores properties that are undefined", () => {
      const modules = createMockModules({
        core: { enabled: true, source: "plan" },
        events: undefined,
      });
      expect(getEnabledModuleCount(modules)).toBe(1);
    });
  });
});
