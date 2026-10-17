import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { initialData } from "../data/demoData";
import { cacheLocalData, clearSession, loadSession, saveSession } from "./storage";
import App from "../App";

vi.mock("./auth", async (load) => ({ ...await load<typeof import("./auth")>(), hasConfiguredAuth: () => true }));

const key = "tourist-movement-monitoring:session";
const local = new Map<string, string>();
const session = new Map<string, string>();
const storage = (values: Map<string, string>) => ({ getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } });

beforeEach(() => {
  local.clear(); session.clear();
  vi.stubGlobal("localStorage", storage(local));
  vi.stubGlobal("sessionStorage", storage(session));
});
afterEach(() => vi.unstubAllGlobals());

describe("remember-me session boundaries", () => {
  it("keeps an unticked local login only in session storage, clearing an older remembered login", () => {
    saveSession("old-user", true);
    saveSession("current-user", false);
    expect(local.has(key)).toBe(false);
    expect(session.get(key)).toBe("current-user");
    expect(loadSession()).toBe("current-user");
    session.clear();
    expect(loadSession()).toBeNull();
  });
  it("restores a remembered local login after the temporary session ends", () => {
    saveSession("user", true);
    session.clear();
    expect(loadSession()).toBe("user");
    expect(session.has(key)).toBe(false);
    clearSession();
    expect(loadSession()).toBeNull();
  });
  it("does not silently persist an unticked login when session storage is blocked", () => {
    vi.stubGlobal("sessionStorage", { getItem: () => null, removeItem: () => {}, setItem: () => { throw new Error("blocked"); } });
    saveSession("user", false);
    expect(local.has(key)).toBe(false);
    expect(loadSession()).toBeNull();
  });
  for (const path of ["/app/home", "/app/trips", "/app/trips/itinerary", "/admin/dashboard", "/check-in?checkin=penang-hill&pass=MYP-TEST"]) {
    it(`never renders a cached account before Firebase verifies access to ${path}`, () => {
      const user = initialData.users.find((user) => user.role === "tourist")!;
      cacheLocalData({ ...initialData, users: [user], trips: [], points: [], analyses: [], recommendations: [] });
      saveSession(user.id, true);
      vi.stubGlobal("window", { location: new URL(`https://tourist-movement-monitoring.web.app${path}`) });
      const markup = renderToStaticMarkup(createElement(App));
      expect(markup).toContain('aria-busy="true"');
      expect(markup).not.toContain("Welcome back");
      expect(markup).not.toContain("Administrator Dashboard");
      expect(markup).not.toContain("Confirm check-in");
    });
  }
});
