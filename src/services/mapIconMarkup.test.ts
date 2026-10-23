import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Building2, Landmark, MapPin, Trees, Utensils, Waves } from "lucide-react";
import { describe, expect, it } from "vitest";
import { categoryIconMarkup, checkInIconMarkup, emergencyIconMarkup, type CategoryIconSize } from "../generated/mapIconMarkup";

describe("build-time map icon markup", () => {
  const icons = { cultural: Landmark, nature: Trees, urban: Building2, heritage: Landmark, food: Utensils, coastal: Waves };
  for (const category of Object.keys(icons) as (keyof typeof icons)[]) {
    it(`preserves the Lucide ${category} icon at every supported size`, () => {
      for (const size of [13, 15, 17, 18, 20] as CategoryIconSize[]) {
        expect(categoryIconMarkup[category][size], `${category} at ${size}px`).toBe(renderToStaticMarkup(createElement(icons[category], { size, strokeWidth: 2.7, "aria-hidden": "true" })));
      }
    });
  }
  it("preserves check-in and emergency pins without a browser-side server renderer", () => {
    expect(emergencyIconMarkup).toBe(renderToStaticMarkup(createElement(Building2, { size: 18, "aria-hidden": "true" })));
    expect(checkInIconMarkup).toBe(renderToStaticMarkup(createElement(MapPin, { size: 19, "aria-hidden": "true" })));
  });
});
