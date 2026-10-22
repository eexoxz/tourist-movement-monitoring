import { describe, expect, it } from "vitest";
import { localeOptions } from "./i18n";
import { demoDatasetText } from "./demoDatasetCopy";
import { initialData } from "../data/demoData";
import { getTouristManagementRows } from "./touristManagement";
import { buildTouristCsv, buildTouristReportHtml } from "./touristReports";

describe("sample dataset translations", () => {
  for (const { value: locale } of localeOptions) {
    it(`translates batch controls and sample provenance in ${locale}`, () => {
      for (const key of ["batchButton", "progress", "sampleRecord", "realRecord", "batchMessage", "dataNote"] as const) {
        const text = demoDatasetText(locale, key, { count: 50, max: 300 });
        expect(text.length).toBeGreaterThan(0);
        expect(text).not.toMatch(/\{\w+\}/);
        if (locale !== "en") expect(text).not.toBe(demoDatasetText("en", key, { count: 50, max: 300 }));
      }
    });
  }

  it("identifies fictional records in CSV and printed reports", () => {
    const rows = getTouristManagementRows(initialData).slice(0, 2);
    const csv = buildTouristCsv(rows, "en");
    expect(csv).toContain('"Source"');
    expect(csv).toContain('"Sample profile"');
    const html = buildTouristReportHtml(rows, "ms");
    expect(html).toContain(demoDatasetText("ms", "dataNote"));
    expect(html).toContain(demoDatasetText("ms", "sampleRecord"));
  });
});
