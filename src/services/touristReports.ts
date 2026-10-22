import type { User } from "../types";
import type { Locale } from "./i18n";
import type { TouristManagementRow } from "./touristManagement";
import { hasTouristIdentity, normalizeIdentity } from "./touristIdentity";
import { reviewText } from "./reviewUpdateCopy";
import { translateAdmin } from "./adminI18n";
import { translate } from "./i18n";

export type IdentityFilter = "all" | "provided" | "missing";
export function countryKey(user: User) { return user.nationality?.trim().toLocaleLowerCase("en") ?? ""; }

export function getCountryCounts(users: User[]) {
  const counts = new Map<string, { key: string; name: string; count: number }>();
  users.filter((user) => user.role === "tourist").forEach((user) => {
    const key = countryKey(user);
    const row = counts.get(key) ?? { key, name: user.nationality?.trim() ?? "", count: 0 };
    row.count++;
    counts.set(key, row);
  });
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function matchesTouristIdentity(user: User, search: string, country: string, identity: IdentityFilter) {
  const query = search.trim().toLocaleLowerCase("en");
  const identityQuery = normalizeIdentity(search);
  const matchesSearch = !query || [user.name, user.email, user.id, user.nationality ?? ""].some((value) => value.toLocaleLowerCase("en").includes(query)) ||
    Boolean(identityQuery && normalizeIdentity(user.passportNumber).includes(identityQuery));
  return matchesSearch && (country === "all" || countryKey(user) === country) &&
    (identity === "all" || hasTouristIdentity(user) === (identity === "provided"));
}

function identityForExport(user: User, full: boolean) {
  const value = normalizeIdentity(user.passportNumber);
  return full || !value ? value : `${"*".repeat(Math.max(4, value.length - 4))}${value.slice(-4)}`;
}

function reportTable(rows: TouristManagementRow[], locale: Locale, full: boolean) {
  const label = (key: Parameters<typeof reviewText>[1]) => reviewText(locale, key);
  const header = [label("touristId"), translate(locale, "auth.name"), translateAdmin(locale, "tourists.email"), label("country"), label("identity"), label("registered")];
  // Reuse existing translated field labels for both export formats.
  return [header, ...rows.map(({ tourist: user }) => [user.id, user.name, user.email, user.nationality?.trim() || label("missing"), identityForExport(user, full) || label("missing"), user.createdAt.slice(0, 10)])];
}

function csvCell(value: string) {
  const safe = /^[\s\u0000-\u001f]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
export function buildTouristCsv(rows: TouristManagementRow[], locale: Locale, fullIdentity = false) {
  return "\ufeff" + reportTable(rows, locale, fullIdentity).map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}
export function buildTouristReportHtml(rows: TouristManagementRow[], locale: Locale, fullIdentity = false) {
  const [header, ...body] = reportTable(rows, locale, fullIdentity);
  const title = reviewText(locale, "countries");
  const countries = getCountryCounts(rows.map((row) => row.tourist));
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    @page{size:A4 landscape;margin:14mm}*{box-sizing:border-box}body{font:11px Arial,sans-serif;color:#17242b}h1{font-size:22px}p{line-height:1.5}table{border-collapse:collapse;width:100%;table-layout:fixed}thead{display:table-header-group}tr{break-inside:avoid}th,td{border:1px solid #cbd5da;padding:7px;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#edf4f4}small{display:block;margin-bottom:14px}
    </style></head><body><h1>${escapeHtml(title)}</h1><small>${rows.length} · ${escapeHtml(new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date()))}</small>
    <p>${countries.map((country) => `${escapeHtml(country.name || reviewText(locale, "missing"))}: ${country.count}`).join(" · ")}</p>
    <table><thead><tr>${header.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("")}</tr></thead><tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
}

export function downloadTouristCsv(rows: TouristManagementRow[], locale: Locale, fullIdentity: boolean) {
  const url = URL.createObjectURL(new Blob([buildTouristCsv(rows, locale, fullIdentity)], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `tourists-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function printTouristReport(rows: TouristManagementRow[], locale: Locale, fullIdentity: boolean) {
  const frame = document.createElement("iframe");
  frame.title = reviewText(locale, "exportPdf");
  frame.style.cssText = "position:fixed;width:0;height:0;border:0;visibility:hidden";
  frame.onload = () => { frame.contentWindow?.focus(); frame.contentWindow?.print(); };
  frame.srcdoc = buildTouristReportHtml(rows, locale, fullIdentity);
  document.body.append(frame);
  // Keep the document alive while the native print preview reads it.
  window.setTimeout(() => frame.remove(), 60000);
}
