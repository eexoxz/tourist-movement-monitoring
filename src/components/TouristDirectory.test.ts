import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import { getTouristManagementRows } from "../services/touristManagement";
import { localeOptions } from "../services/i18n";
import { directoryText } from "../services/touristDirectoryCopy";
import { TouristDirectory } from "./TouristDirectory";
import { buildTouristCsv } from "../services/touristReports";

const rows = getTouristManagementRows(initialData);
const noop = () => {};
describe("administrator directory rendering", () => {
  it("renders a bounded semantic table instead of the oversized cards", () => {
    const html = renderToStaticMarkup(createElement(TouristDirectory, { rows, locale: "en", onViewMovement: noop, onViewSafety: noop }));
    expect(html).toContain("<table");
    expect(html.match(/scope="row"/g)).toHaveLength(25);
    expect(html).toContain('aria-sort="descending"');
    expect(html).toContain('aria-label="Next page"');
    expect(html).not.toContain("tourist-management-card");
    expect(html).not.toContain("tourist-management-detail");
    expect(buildTouristCsv(rows, "en").split("\r\n")).toHaveLength(rows.length + 1);
  });
  for (const { value: locale } of localeOptions) it(`localises directory controls in ${locale}`, () => {
    const html = renderToStaticMarkup(createElement(TouristDirectory, { rows: rows.slice(0, 2), locale, onViewMovement: noop, onViewSafety: noop }));
    for (const key of ["filters", "source", "activity", "consent", "interest", "rows", "sort", "next", "close"] as const) {
      const text = directoryText(locale, key);
      if (key !== "close") expect(html).toContain(renderToStaticMarkup(createElement(Fragment, null, text)));
      if (locale !== "en") expect(text).not.toBe(directoryText("en", key));
    }
    expect(directoryText(locale, "page", { page: 2, pages: 12 })).not.toMatch(/\{\w+\}/);
  });
});
