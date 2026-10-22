import { describe, expect, it } from "vitest";
import { destinations } from "../data/destinations";
import { destinationPhotoCredit } from "./destinationPhoto";
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
  });
});
