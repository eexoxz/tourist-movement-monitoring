import { describe, expect, it } from "vitest";
import { destinations } from "../data/destinations";
import { destinationPhotoCredit, destinationPhotoReference, storedDestinationPhoto } from "./destinationPhoto";
import { destinationAdminText } from "./destinationAdminCopy";
import { updateDestinationRecord } from "./destinationManagement";

const place = {
  ...destinations[0],
  imageCredit: { author: "Example Photographer", license: "CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Example.jpg" },
};

describe("destination photo attribution", () => {
  it("keeps valid source and license information", () => {
    expect(destinationPhotoCredit(place)).toEqual({ label: "Example Photographer · CC BY-SA 4.0", href: place.imageCredit.sourceUrl });
    expect(destinationPhotoCredit(destinations[0])).toBeNull();
  });

  it.each(["javascript:alert(1)", "https://commons.wikimedia.org.evil.example/wiki/File:Example.jpg", "https://commons.wikimedia.org/wiki/Special:FilePath/Example.jpg", "not a url"])("rejects an invalid attribution destination: %s", (sourceUrl) => {
    expect(destinationPhotoCredit({ ...place, imageCredit: { ...place.imageCredit, sourceUrl } })).toBeNull();
  });

  it("clears attribution after replacing a photograph, but preserves it for other edits", () => {
    expect(updateDestinationRecord([place], { ...place, name: "Updated place name" }).destination?.imageCredit).toEqual(place.imageCredit);
    expect(updateDestinationRecord([place], { ...place, imageUrl: "https://example.com/replacement.jpg" }).destination?.imageCredit).toBeUndefined();
    expect(updateDestinationRecord([place], { ...place, imageUrl: "" }).destination?.imageUrl).toBe("");
  });
  it("uses bounded photo references and translated upload/filter feedback in every language", () => {
    expect(storedDestinationPhoto(destinationPhotoReference("venue-1", "revision-1"))).toEqual({ destinationId: "venue-1", version: "revision-1" });
    for (const source of ["stored-photo:../users:abc", "stored-photo:a/b:abc", "https://example.com/photo.jpg", "data:image/jpeg;base64,abc"])
      expect(storedDestinationPhoto(source)).toBeNull();
    const keys = ["allStates", "results", "empty", "upload", "photoHelp", "preparing", "ready", "stored", "loading", "unavailable", "retry", "format", "size", "prepareFailed", "saveFailed", "photoSaved"] as const;
    for (const locale of ["ms", "zh", "ja", "ko", "pt", "ta", "es", "fr"] as const) for (const key of keys) {
      expect(destinationAdminText(locale, key), `${locale}/${key}`).not.toBe(destinationAdminText("en", key));
      expect(destinationAdminText(locale, key)).not.toBe("");
    }
  });
});
