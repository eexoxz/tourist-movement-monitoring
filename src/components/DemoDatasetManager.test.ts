import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { initialData } from "../data/demoData";
import { replaceDemoDataset } from "../services/demoDataset";
import { demoControlsText } from "../services/demoDatasetControlsCopy";
import { localeOptions } from "../services/i18n";
import { DemoDatasetManager } from "./DemoDatasetManager";

describe("sample dataset controls", () => {
  it("renders every language with explicit provenance, a 20-tourist default and a bounded preview", () => {
    for (const { value: locale } of localeOptions) {
      const html = renderToStaticMarkup(createElement(DemoDatasetManager, { data: initialData, locale, action: null, onApply: vi.fn(), onRemove: vi.fn(), onClose: vi.fn() }));
      expect(html).toContain(renderToStaticMarkup(createElement("strong", null, demoControlsText(locale, "manage"))));
      expect(html).toContain(renderToStaticMarkup(createElement("h3", null, demoControlsText(locale, "preview"))));
      expect(html).toContain('<option value="20" selected="">');
      expect(html).toContain('<option value="100">');
      expect(html.match(/type="checkbox"/g)).toHaveLength(14);
      expect(html).not.toMatch(/\{(?:max|points|count)\}/);
    }
  });

  it("disables selection and mutation while processing and disables removal when samples are absent", () => {
    const render = (data: typeof initialData, action: "loading" | null) => renderToStaticMarkup(createElement(DemoDatasetManager, { data, locale: "en", action, onApply: vi.fn(), onRemove: vi.fn(), onClose: vi.fn() }));
    expect(render(initialData, "loading")).toContain('<fieldset class="demo-dataset-filters" aria-label="Sample dataset" disabled="">');
    expect(render(replaceDemoDataset(initialData, new Set()), null)).toMatch(/<button[^>]*disabled=""[^>]*>[\s\S]*?Remove demo dataset/);
  });
});
