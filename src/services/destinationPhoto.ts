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
  if (!credit?.author.trim() || !credit.license.trim()) return null;
  try {
    const source = new URL(credit.sourceUrl);
    if (source.protocol !== "https:" || source.hostname !== "commons.wikimedia.org" || !source.pathname.startsWith("/wiki/File:")) return null;
    return { label: `${credit.author} · ${credit.license}`, href: source.href };
  } catch {
    return null;
  }
}
