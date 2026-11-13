import type { Destination } from "../types";

const storedPhotoPattern = /^stored-photo:([a-zA-Z0-9_-]{1,160}):([a-zA-Z0-9_-]{1,48})$/;
export function storedDestinationPhoto(source: string | undefined) {
  const match = source?.match(storedPhotoPattern);
  return match ? { destinationId: match[1], version: match[2] } : null;
}

export function destinationPhotoReference(destinationId: string, version: string) {
  return `stored-photo:${destinationId}:${version}`;
}

export function destinationPhotoCredit(destination: Destination) {
  const credit = destination.imageCredit;
  const author = credit?.author.trim();
  if (!credit || !author) return null;
  const license = credit.license?.trim();
  try {
    const source = new URL(credit.sourceUrl);
    const commonsFile = source.hostname === "commons.wikimedia.org" && source.pathname.startsWith("/wiki/File:");
    const flickrPhoto = source.hostname === "www.flickr.com" && /^\/photos\/[\w@%-]+\/\d+\/?$/.test(source.pathname);
    const catalogueSource = !license && destination.imageUrl?.startsWith("/images/catalogue/");
    if (source.protocol !== "https:" || source.username || source.password) return null;
    if (!catalogueSource && !(license && (commonsFile || flickrPhoto))) return null;
    return { label: license ? `${author} · ${license}` : author, href: source.href };
  } catch {
    return null;
  }
}
