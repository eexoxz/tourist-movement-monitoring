import type { Destination } from "../types";

const catalogueCacheVersion = 3;
const prefix = "tourist-movement-monitoring:public-catalogue:";
export const catalogueCacheLifetimeMs = 10 * 60 * 1000;

// Only public place information is cached here. Authentication, roles, trips and
// safety/check-in records always keep their existing server-backed read paths.
export async function readDestinationCatalogue(project: string, read: () => Promise<Destination[]>, force = false) {
  const key = prefix + project;
  if (!force) {
    try {
      const cached = JSON.parse(localStorage.getItem(key) ?? "null");
      const age = Date.now() - cached?.savedAt;
      if (cached?.version === catalogueCacheVersion && Number.isFinite(age) && age >= 0 && age < catalogueCacheLifetimeMs && Array.isArray(cached.records) && cached.records.every((row: Destination) => row && typeof row.id === "string" && typeof row.name === "string" && Number.isFinite(row.latitude) && Number.isFinite(row.longitude))) return cached.records as Destination[];
    } catch {}
  }
  const records = await read();
  try { localStorage.setItem(key, JSON.stringify({ version: catalogueCacheVersion, savedAt: Date.now(), records })); } catch {}
  return records;
}

export function clearDestinationCatalogueCache() {
  try {
    const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index));
    for (const key of keys) if (key?.startsWith(prefix)) localStorage.removeItem(key);
  } catch {}
}
