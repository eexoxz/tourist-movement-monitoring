import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { planCatalogueImport } from "./importPlan.mjs";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
const projectIndex = args.indexOf("--project");
const project = projectIndex >= 0 ? args[projectIndex + 1] : "";
if (!/^[a-z][a-z0-9-]{4,62}$/.test(project)) throw new Error("Specify the Firebase project explicitly using --project.");
const apply = args.includes("--apply");
const manifest = JSON.parse(await readFile(new URL("./locations-2026-10.json", import.meta.url), "utf8"));

// Use the existing CLI login; credentials stay in memory and are never exported.
const auth = require("firebase-tools/lib/auth.js");
const account = auth.getProjectDefaultAccount(root);
if (!account) throw new Error("An existing Firebase CLI login is required.");
const token = await auth.getAccessToken(account.tokens.refresh_token, account.tokens.scopes || []);
const endpoint = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
const headers = { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" };
const decode = value => "stringValue" in value ? value.stringValue : undefined;
const encode = value => typeof value === "string" ? { stringValue: value }
  : typeof value === "number" ? (Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value })
  : Array.isArray(value) ? { arrayValue: { values: value.map(encode) } }
  : { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)])) } };
const existing = [];
let pageToken = "";
do {
  const url = new URL(`${endpoint}/destinations`);
  url.searchParams.set("pageSize", "1000");
  url.searchParams.append("mask.fieldPaths", "name");
  if (pageToken) url.searchParams.set("pageToken", pageToken);
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Catalogue read failed: HTTP ${response.status}`);
  const result = await response.json();
  existing.push(...(result.documents ?? []).map(document => ({ id: document.name.split("/").at(-1), name: decode(document.fields.name) })));
  pageToken = result.nextPageToken ?? "";
} while (pageToken);
const plan = planCatalogueImport(manifest.places, existing);
for (const place of plan.create) {
  const asset = await readFile(resolve(root, "public", place.imageUrl.slice(1)));
  const jpeg = asset[0] === 0xff && asset[1] === 0xd8;
  const png = asset.subarray(1, 4).toString() === "PNG";
  const webp = asset.subarray(8, 12).toString() === "WEBP";
  if (asset.length < 1024 || asset.length > 600000 || !(jpeg || png || webp)) throw new Error(`Missing or unsuitable photo asset: ${place.id}`);
}
console.log(`Project: ${project}; existing: ${existing.length}; additions: ${plan.create.length}; preserved: ${plan.skip.length}.`);
if (!apply) {
  console.log("Dry run only. No writes performed.");
} else {
  // Hosting must contain the photographs before new cloud entries become visible.
  for (const place of plan.create) {
    const response = await fetch(`https://${project}.web.app${place.imageUrl}`, { method: "HEAD", signal: AbortSignal.timeout(15000) });
    if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) throw new Error(`Deploy the photo assets before importing: ${place.id}`);
  }
  for (let index = 0; index < plan.create.length; index += 40) {
    const places = plan.create.slice(index, index + 40);
    const response = await fetch(`${endpoint}:commit`, {
      method: "POST", headers,
      body: JSON.stringify({ writes: places.map(place => ({ update: { name: `${endpoint.replace("https://firestore.googleapis.com/v1/", "")}/destinations/${place.id}`, fields: Object.fromEntries(Object.entries(place).map(([key, value]) => [key, encode(value)])) }, currentDocument: { exists: false } })) }),
    });
    if (!response.ok) throw new Error(`Insert-only import stopped: HTTP ${response.status}. Existing records were not overwritten. Re-run the dry run before retrying.`);
    console.log(`Created ${Math.min(index + places.length, plan.create.length)} / ${plan.create.length} approved places.`);
  }
}
