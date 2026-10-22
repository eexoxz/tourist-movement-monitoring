import type { Destination } from "../types";

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
