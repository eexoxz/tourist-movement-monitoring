import { describe, expect, it } from "vitest";
import { translateAdmin } from "./adminI18n";

describe("admin dashboard translations", () => {
  it("translates major admin copy and replaces dynamic values", () => {
    expect(translateAdmin("ms", "tourists.title")).toBe("Pengurusan Pelancong");
    expect(translateAdmin("ms", "overview.alertCount", { count: 4 })).toBe("4 amaran");
  });

  it("covers the main administrator heading across every app language", () => {
    expect(translateAdmin("zh", "tourists.title")).toBe("游客管理");
    expect(translateAdmin("ja", "tourists.title")).toBe("旅行者管理");
    expect(translateAdmin("ko", "tourists.title")).toBe("관광객 관리");
    expect(translateAdmin("pt", "tourists.title")).toBe("Gestao de Turistas");
    expect(translateAdmin("ta", "tourists.title")).toBe("சுற்றுலாப் பயணி மேலாண்மை");
    expect(translateAdmin("es", "tourists.title")).toBe("Gestion de Turistas");
    expect(translateAdmin("fr", "tourists.title")).toBe("Gestion des Touristes");
  });

  it("keeps English fallback for detailed copy that still needs wording review", () => {
    expect(translateAdmin("pt", "records.readOnly")).toBe("Administrators can review movement records, but individual coordinates are read-only.");
  });
});
