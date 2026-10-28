const pending = new WeakMap<object, Map<string, Promise<unknown>>>();

export function isCloudQuotaError(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && String(error.code).split("/").at(-1) === "resource-exhausted");
}

// Share simultaneous requests only. A later refresh always reads the server;
// account boundaries and permission checks remain specific to the signed-in UID.
export function shareServerRead<T>(database: object, uid: string, path: string, read: () => Promise<T>): Promise<T> {
  const reads = pending.get(database) ?? new Map<string, Promise<unknown>>();
  pending.set(database, reads);
  const key = `${uid}:${path}`;
  const existing = reads.get(key);
  if (existing) return existing as Promise<T>;
  const request = Promise.resolve().then(read).finally(() => { if (reads.get(key) === request) reads.delete(key); });
  reads.set(key, request);
  return request;
}
