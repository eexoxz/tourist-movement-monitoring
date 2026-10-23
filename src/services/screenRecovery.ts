const recoveryKey = "tourist-movement-monitoring:module-recovery";
const recoveryWindowMs = 120000;

export function isModuleLoadError(error: unknown) {
  const message = error && typeof error === "object" && "message" in error ? String(error.message) : String(error ?? "");
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading chunk .+ failed|Unable to preload CSS/i.test(message);
}

export function recoverModuleLoad(error: unknown, environment: Pick<Window, "navigator" | "sessionStorage" | "location"> | undefined = typeof window === "undefined" ? undefined : window, now = Date.now()) {
  if (!environment || !isModuleLoadError(error) || environment.navigator.onLine === false) return false;
  try {
    const previous = Number(environment.sessionStorage.getItem(recoveryKey));
    if (previous > 0 && now >= previous && now - previous < recoveryWindowMs) return false;
    environment.sessionStorage.setItem(recoveryKey, String(now));
  } catch {
    // Without a persistent guard, prefer a retry screen over a reload loop.
    return false;
  }
  environment.location.reload();
  return true;
}

export function installModuleRecovery() {
  window.addEventListener("vite:preloadError", (event) => {
    if (recoverModuleLoad((event as Event & { payload?: unknown }).payload)) event.preventDefault();
  });
}

export async function withStartupTimeout<T>(promise: Promise<T>, milliseconds = 15000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Startup request timed out")), milliseconds); })]);
  } finally { clearTimeout(timer); }
}
