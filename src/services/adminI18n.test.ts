import { describe, expect, it } from "vitest";
import { translateAdmin } from "./adminI18n";

describe("admin dashboard translations", () => {
  it("translates major admin copy and replaces dynamic values", () => {
    expect(translateAdmin("ms", "tourists.title")).toBe("Pengurusan Pelancong");
    expect(translateAdmin("ms", "overview.alertCount", { count: 4 })).toBe("4 amaran");
  });

  it("falls back to English for locales that still need detailed admin review", () => {
    expect(translateAdmin("ja", "safety.title")).toBe("Safety Monitoring");
  });
});
