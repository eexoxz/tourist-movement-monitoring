import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { localeOptions } from "../services/i18n";
import { directoryText } from "../services/touristDirectoryCopy";
import { RecordPagination } from "./RecordPagination";
import { CategoryBars, ConfusionMatrix, KMeansFeatureBars } from "./AdminAnalyticsWidgets";

describe("consistent record and report controls", () => {
  for (const { value: locale } of localeOptions) {
    it(`uses translated pagination with accessible navigation in ${locale}`, () => {
      const html = renderToStaticMarkup(createElement(RecordPagination, { page: 1, pages: 25, pageSize: 25, locale, onPageChange: () => {}, onPageSizeChange: () => {} }));
      expect(html).toContain(directoryText(locale, "rows"));
      expect(html).toContain(directoryText(locale, "page", { page: 1, pages: 25 }));
      expect(html).toContain(`aria-label="${directoryText(locale, "previous")}" disabled`);
      expect(html).toContain(`aria-label="${directoryText(locale, "next")}"`);
      expect(html.match(/<option /g)).toHaveLength(3);
    });
  }

  it("disables forward navigation on the final page", () => {
    const html = renderToStaticMarkup(createElement(RecordPagination, { page: 3, pages: 3, pageSize: 10, locale: "en", onPageChange: () => {}, onPageSizeChange: () => {} }));
    expect(html).toContain('aria-label="Next page" disabled');
    expect(html).not.toContain('aria-label="Previous page" disabled');
  });

  it("represents zero data with zero-width bars instead of a minimum fictional bar", () => {
    const categories = renderToStaticMarkup(createElement(CategoryBars, { values: { cultural: 0, nature: 3 }, locale: "en" }));
    expect(categories).toContain('data-category="cultural"');
    expect(categories).toContain('width:0%');
    expect(categories).toContain('width:100%');
    const features = renderToStaticMarkup(createElement(KMeansFeatureBars, { features: { culturalProportion: 0, natureProportion: 0, urbanProportion: 100, uniqueDestinations: 0 }, locale: "en" }));
    expect(features.match(/width:0%/g)).toHaveLength(3);
  });

  it("uses real row and column headers for the complete confusion matrix", () => {
    const html = renderToStaticMarkup(createElement(ConfusionMatrix, { values: { cultural: { cultural: 7, nature: 2 } }, locale: "en" }));
    expect(html).toContain('<table class="directory-table matrix-table"');
    expect(html.match(/scope="row"/g)).toHaveLength(4);
    expect(html.match(/<td /g)).toHaveLength(4);
    expect(html.match(/<td(?: |\>)/g)).toHaveLength(16);
    expect(html).toContain('class="matrix-correct">7');
    expect(html).toContain('>2</td>');
  });
});
