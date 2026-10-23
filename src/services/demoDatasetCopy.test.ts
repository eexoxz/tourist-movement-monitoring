import { describe, expect, it } from "vitest";
import { demoDatasetText } from "./demoDatasetCopy";
import { initialData } from "../data/demoData";
import { getTouristManagementRows } from "./touristManagement";
import { buildTouristCsv, buildTouristReportHtml } from "./touristReports";

describe("sample dataset report provenance", () => {
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
