export const rememberedLoginKey = "tourist-movement-monitoring:remember-login";
const demoEmails = new Set(["tourist@example.com", "nature@example.com", "culture@example.com", "urban@example.com", "admin@tourism.local"]);

export function clearRememberedLogin() {
  try { localStorage.removeItem(rememberedLoginKey); } catch { /* Storage can be unavailable in private browsing. */ }
}

export function loadRememberedLogin(): { email: string } | null {
  try {
    const raw = localStorage.getItem(rememberedLoginKey);
    if (!raw) return null;
    const saved: unknown = JSON.parse(raw);
    if (!saved || typeof saved !== "object" || !("email" in saved) || typeof saved.email !== "string" || demoEmails.has(saved.email.trim().toLowerCase())) {
      clearRememberedLogin();
      return null;
    }
    const login = { email: saved.email.trim().toLowerCase() };
    // Migrate older records immediately, dropping passwords and any extra fields.
    if (raw !== JSON.stringify(login)) {
      localStorage.removeItem(rememberedLoginKey);
      localStorage.setItem(rememberedLoginKey, JSON.stringify(login));
    }
    return login;
  } catch {
    clearRememberedLogin();
    return null;
  }
}

export function saveRememberedLogin(email: string) {
  try {
    localStorage.setItem(rememberedLoginKey, JSON.stringify({ email: email.trim().toLowerCase() }));
  } catch { /* A storage failure must not turn successful authentication into an error. */ }
}
