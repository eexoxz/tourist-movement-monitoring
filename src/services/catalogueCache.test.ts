import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Destination } from "../types";
import { catalogueCacheLifetimeMs, clearDestinationCatalogueCache, readDestinationCatalogue } from "./catalogueCache";
const place = { id: "museum", name: "Museum", latitude: 5.4, longitude: 100.3 } as Destination;
let saved: Map<string, string>;
beforeEach(() => {
  saved = new Map(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-29T06:00:00Z"));
  vi.stubGlobal("localStorage", { get length() { return saved.size; }, key: (index: number) => [...saved.keys()][index] ?? null, getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => saved.set(key, value), removeItem: (key: string) => saved.delete(key) });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe("bounded public catalogue cache", () => {
  it("reuses only recent public catalogue reads and refreshes when expired or explicitly requested", async () => {
    const read = vi.fn(async () => [place]);
    await readDestinationCatalogue("project", read);
    await readDestinationCatalogue("project", read);
    expect(read).toHaveBeenCalledTimes(1);
    await readDestinationCatalogue("project", read, true);
    expect(read).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(catalogueCacheLifetimeMs);
    await readDestinationCatalogue("project", read);
    expect(read).toHaveBeenCalledTimes(3);
  });
  it("isolates projects, invalidates edits/cleanup, and rejects future-dated or malformed data", async () => {
    const read = vi.fn(async () => [place]);
    await readDestinationCatalogue("one", read); await readDestinationCatalogue("two", read);
    expect(read).toHaveBeenCalledTimes(2);
    saved.set("tourist-movement-monitoring:public-catalogue:one", "broken");
    await readDestinationCatalogue("one", read);
    vi.setSystemTime(Date.now() - 1000);
    await readDestinationCatalogue("one", read);
    expect(read).toHaveBeenCalledTimes(4);
    saved.set("unrelated-private-data", "keep"); clearDestinationCatalogueCache();
    expect([...saved.keys()]).toEqual(["unrelated-private-data"]);
    await readDestinationCatalogue("one", read); expect(read).toHaveBeenCalledTimes(5);
  });
  it("never reports a failed forced refresh as successful or lets blocked storage prevent a read", async () => {
    await readDestinationCatalogue("project", async () => [place]);
    await expect(readDestinationCatalogue("project", async () => { throw { code: "resource-exhausted" }; }, true)).rejects.toMatchObject({ code: "resource-exhausted" });
    vi.stubGlobal("localStorage", { getItem: () => { throw Error("blocked"); }, setItem: () => { throw Error("full"); } });
    expect(await readDestinationCatalogue("project", async () => [place])).toEqual([place]);
  });
});
