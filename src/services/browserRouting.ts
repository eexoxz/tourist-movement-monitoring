

export function getCurrentPathname() {
  return typeof window === "undefined" ? "/" : window.location.pathname;
}

export function replaceBrowserPath(path: string) {
  if (typeof window !== "undefined" && window.location.pathname !== path) {
    window.history.replaceState(null, "", path);
  }
}

export function pushBrowserPath(path: string) {
  if (typeof window !== "undefined" && window.location.pathname !== path) {
    window.history.pushState(null, "", path);
  }
}
