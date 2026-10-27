const states = new Set(["Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan", "Pahang", "Penang", "Perak", "Perlis", "Sabah", "Sarawak", "Selangor", "Terengganu", "Federal Territories"]);
const categories = new Set(["cultural", "nature", "urban", "heritage", "food", "coastal"]);
const guidanceCodes = new Set(["boat", "trail", "worship", "residential", "booking", "market", "wildlife", "beach"]);

function isHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function normalizeVenueName(name) {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function validateCatalogue(places, { requirePhoto = true } = {}) {
  if (!Array.isArray(places) || !places.length) throw new Error("Catalogue must contain places.");
  const ids = new Set();
  const names = new Set();
  for (const place of places) {
    if (!/^my-[a-z0-9-]+$/.test(place.id) || ids.has(place.id)) throw new Error(`Invalid or duplicate ID: ${place.id}`);
    ids.add(place.id);
    if (!states.has(place.state) || !categories.has(place.category)) throw new Error(`Invalid state or category: ${place.id}`);
    for (const field of ["name", "city", "address", "description"]) {
      if (typeof place[field] !== "string" || place[field].trim().length < 3) throw new Error(`Missing ${field}: ${place.id}`);
    }
    if (!place.address.endsWith(", Malaysia") || place.address.length < 20) throw new Error(`Incomplete address: ${place.id}`);
    if (!Number.isFinite(place.latitude) || place.latitude < .8 || place.latitude > 7.5 || !Number.isFinite(place.longitude) || place.longitude < 99.5 || place.longitude > 119.5) throw new Error(`Invalid Malaysian coordinates: ${place.id}`);
    if (!Number.isInteger(place.averageVisitMinutes) || place.averageVisitMinutes < 5 || place.averageVisitMinutes > 480) throw new Error(`Invalid suggested visit duration: ${place.id}`);
    if (requirePhoto || place.imageUrl !== undefined) {
      if (!/^\/images\/catalogue\/my-[a-z0-9-]+\.(jpg|jpeg|png|webp)$/.test(place.imageUrl)) throw new Error(`Missing local photograph: ${place.id}`);
      if (typeof place.imageAlt !== "string" || place.imageAlt.trim().length < 3) throw new Error(`Missing imageAlt: ${place.id}`);
      const credit = place.imageCredit;
      if (!credit?.author?.trim() || !/^(CC BY(?:-SA)? [1234]\.[05](?: de)?|CC0|Public domain)$/.test(credit.license ?? "") || !isHttpsUrl(credit.sourceUrl) || !/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(credit.sourceUrl)) throw new Error(`Missing photo credit: ${place.id}`);
    } else if (place.imageCredit !== undefined) {
      throw new Error(`Photo credit without a photograph: ${place.id}`);
    }
    if (!isHttpsUrl(place.sourceUrl)) throw new Error(`Missing reference source: ${place.id}`);
    if (place.coordinateSourceUrl && !isHttpsUrl(place.coordinateSourceUrl)) throw new Error(`Invalid coordinate source: ${place.id}`);
    if (place.visitorGuidance && (!Array.isArray(place.visitorGuidance) || place.visitorGuidance.some(code => !guidanceCodes.has(code)))) throw new Error(`Invalid visitor guidance: ${place.id}`);
    if (["activitySummary", "demoActivitySummary", "popularityScore", "visitorCount"].some(field => field in place)) throw new Error(`Activity data is not part of a venue import: ${place.id}`);
    const key = `${place.state}:${normalizeVenueName(place.name)}`;
    if (names.has(key)) throw new Error(`Duplicate venue: ${place.name}`);
    names.add(key);
  }
}

export function planCatalogueImport(places, existing, options) {
  validateCatalogue(places, options);
  const ids = new Set(existing.map(place => place.id));
  const names = new Set(existing.map(place => normalizeVenueName(place.name)));
  const create = [];
  const skip = [];
  for (const place of places) {
    if (ids.has(place.id) || names.has(normalizeVenueName(place.name))) {
      skip.push(place);
    } else {
      create.push(place);
      ids.add(place.id);
      names.add(normalizeVenueName(place.name));
    }
  }
  return { create, skip };
}
