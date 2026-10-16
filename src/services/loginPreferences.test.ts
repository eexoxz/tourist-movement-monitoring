import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearRememberedLogin, loadRememberedLogin, rememberedLoginKey, saveRememberedLogin } from "./loginPreferences";

let saved: Map<string, string>;
beforeEach(() => {
  saved = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => saved.set(key, value),
    removeItem: (key: string) => saved.delete(key),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("remembered login privacy", () => {
  it("migrates legacy credentials to email only, without returning a password", () => {
    saved.set(rememberedLoginKey, JSON.stringify({ email: " Tourist@Test.Example ", password: "Old-Test-Secret", unrelated: "drop me" }));
    expect(loadRememberedLogin()).toEqual({ email: "tourist@test.example" });
    expect(JSON.parse(saved.get(rememberedLoginKey)!)).toEqual({ email: "tourist@test.example" });
    expect(saved.get(rememberedLoginKey)).not.toContain("Old-Test-Secret");
  });
  it("remembers only an email and can forget it", () => {
    saveRememberedLogin("Tourist@Test.Example");
    expect(loadRememberedLogin()).toEqual({ email: "tourist@test.example" });
    clearRememberedLogin();
    expect(loadRememberedLogin()).toBeNull();
  });
  it.each(["null", "[]", '"text"', '{"email":42}', "broken-json", '{"email":"tourist@example.com","password":"demo"}'])("clears invalid or demo credentials: %s", (raw) => {
    saved.set(rememberedLoginKey, raw);
    expect(loadRememberedLogin()).toBeNull();
    expect(saved.has(rememberedLoginKey)).toBe(false);
  });
  it("does not break sign-in when browser storage is blocked", () => {
    vi.stubGlobal("localStorage", { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } });
    expect(loadRememberedLogin()).toBeNull();
    expect(() => saveRememberedLogin("test@example.test")).not.toThrow();
    expect(() => clearRememberedLogin()).not.toThrow();
  });
});
