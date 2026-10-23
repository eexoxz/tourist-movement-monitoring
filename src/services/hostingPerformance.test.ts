import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getAllowedViewsForRole, getPathForView } from "./access";

const { hosting } = JSON.parse(readFileSync(resolve(process.cwd(), "firebase.json"), "utf8"));
const cacheControl = (rule: { headers: { key: string; value: string }[] }) => rule.headers.find(header => header.key === "Cache-Control")?.value;

describe("versioned asset caching", () => {
  it("keeps long-lived caching limited to generated build assets", () => {
    const rule = hosting.headers.find((rule: { source?: string }) => rule.source === "/assets/**");
    expect(cacheControl(rule)).toBe("public, max-age=31536000, immutable");
    expect(hosting.headers.filter((rule: Parameters<typeof cacheControl>[0]) => cacheControl(rule)?.includes("immutable"))).toHaveLength(1);
  });
  it("revalidates every public and protected entry point so deployments stay current", () => {
    const rule = hosting.headers.find((rule: { regex?: string }) => rule.regex);
    const pattern = new RegExp(rule.regex);
    expect(cacheControl(rule)).toBe("no-cache");
    for (const path of ["/", "/index.html", "/login", "/register", "/check-in", "/app/tracking", ...getAllowedViewsForRole("admin").map(view => getPathForView("admin", view)), ...getAllowedViewsForRole("tourist").map(view => getPathForView("tourist", view))]) expect(pattern.test(path)).toBe(true);
    for (const path of ["/assets/index-abc.js", "/assets/index-abc.css", "/images/catalogue/place.jpg", "/notification-worker.js"]) expect(pattern.test(path)).toBe(false);
    expect(cacheControl(hosting.headers.find((rule: { source?: string }) => rule.source === "/notification-worker.js"))).toBe("no-cache");
  });
});
