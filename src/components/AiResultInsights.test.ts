import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import { analyzeAllTrips } from "../services/analytics";
import { summarizeAiResults } from "../services/aiInsights";
import { aiText } from "../services/aiInsightsCopy";
import { localeOptions } from "../services/i18n";
import { AiCoverage, ClusterComposition, TripClusterComparison } from "./AiResultInsights";

describe("AI result charts", () => {
  it("renders source and cluster counts in every language with trip-based labels", () => {
    const insights = summarizeAiResults(initialData, analyzeAllTrips(initialData));
    for (const { value: locale } of localeOptions) {
      const html = renderToStaticMarkup(createElement("div", null, createElement(AiCoverage, { insights, locale }), createElement(ClusterComposition, { clusters: insights.clusters, locale })));
      expect(html).toContain(renderToStaticMarkup(createElement("p", { className: "ai-method-note" }, aiText(locale, "compositionNote"))));
      expect(html).toContain('data-source="sample"');
      expect(html).toContain('data-profile="cultural"');
      expect(html).not.toMatch(/NaN|Infinity|\{\w+\}/);
    }
  });

  it("compares each feature on one shared scale and clamps invalid or capped inputs", () => {
    const html = renderToStaticMarkup(createElement(TripClusterComparison, { locale: "en", trip: { culturalProportion: 0, natureProportion: 100, urbanProportion: Number.NaN, uniqueDestinations: 50 }, centroid: { culturalProportion: 50, natureProportion: 0, urbanProportion: -3, uniqueDestinations: 5 } }));
    expect(html.match(/data-series="trip"/g)).toHaveLength(4);
    expect(html.match(/data-series="centroid"/g)).toHaveLength(4);
    expect(html.match(/width:0%/g)).toHaveLength(4);
    expect(html.match(/width:50%/g)).toHaveLength(2);
    expect(html.match(/width:100%/g)).toHaveLength(2);
    expect(html).toContain("Destination counts are capped at 10");
    expect(html).not.toMatch(/NaN|Infinity|>50<|width:-/);
  });
});
