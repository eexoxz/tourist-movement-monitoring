import { describe, expect, it } from "vitest";
import { getPasswordStrength, passwordRequirementMessage } from "./passwordStrength";

describe("passwordStrength", () => {
  it("requires length, mixed case, number and symbol", () => {
    const result = getPasswordStrength("secret123");

    expect(result.level).toBe("fair");
    expect(result.isValid).toBe(false);
    expect(passwordRequirementMessage("secret123")).toContain("uppercase");
    expect(passwordRequirementMessage("secret123")).toContain("symbol");
  });

  it("accepts a strong registration password", () => {
    const result = getPasswordStrength("Secret123!");

    expect(result.level).toBe("strong");
    expect(result.isValid).toBe(true);
    expect(passwordRequirementMessage("Secret123!")).toBe("");
  });
});
