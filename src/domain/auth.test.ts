import { describe, expect, it } from "vitest";
import { resolveAuthMode } from "@/domain/auth";

describe("mode d'authentification", () => {
  it("accepte preview en production", () => {
    expect(resolveAuthMode("preview", "production")).toBe("preview");
    expect(resolveAuthMode("preview", "development")).toBe("preview");
  });

  it("refuse dev en production", () => {
    expect(() => resolveAuthMode("dev", "production")).toThrow(/AUTH_MODE=dev/);
  });

  it("réserve dev au local et entra à la production sans mode explicite", () => {
    expect(resolveAuthMode("dev", "development")).toBe("dev");
    expect(resolveAuthMode(undefined, "development")).toBe("dev");
    expect(resolveAuthMode("entra", "production")).toBe("entra");
    expect(resolveAuthMode(undefined, "production")).toBe("entra");
  });
});
