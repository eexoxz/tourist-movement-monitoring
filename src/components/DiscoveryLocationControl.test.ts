import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import { DiscoveryLocationControl } from "./DiscoveryLocationControl";
import { DiscoveryAreaPicker } from "./DiscoveryAreaPicker";
import { PlaceDiscovery } from "./PlaceDiscovery";
import { getDiscoveryDestinations } from "../services/discovery";
import { localeOptions, translate } from "../services/i18n";

function renderPicker(areaId?: string, mode: "current" | "area" = "area") {
  return renderToStaticMarkup(createElement(DiscoveryLocationControl, {
    user: { ...initialData.users[0], discoveryLocationMode: mode, discoveryAreaId: areaId },
    locale: "en",
    onChange: () => {},
  }));
}

describe("state-first discovery picker", () => {
  it("asks only for a state with no district selection", () => {
    const markup = renderPicker();
    expect(markup).toContain('<option value="" selected="">All Malaysia</option>');
    expect((markup.match(/<select/g) ?? [])).toHaveLength(2);
    expect(markup).not.toContain('value="jelutong"');
    expect(markup).not.toContain('value="alor-setar"');
  });

  it("migrates the presentation of an existing district to its state", () => {
    const markup = renderPicker("jelutong");
    expect(markup).toContain('<option value="Penang" selected="">');
    expect(markup).not.toContain('value="jelutong"');
    expect(markup).not.toContain('value="batu-kawan"');
    expect(markup).not.toContain('value="alor-setar"');
    expect(markup).not.toContain("Jelutong, Penang");
  });

  it("handles missing saved areas without selecting a different location", () => {
    expect(renderPicker("removed-area")).toContain('<option value="" selected="">');
    expect(renderPicker("state:Johor")).toContain('<option value="Johor" selected="">');
    expect(renderPicker("alor-setar")).not.toContain('value="jelutong"');
  });

  it("does not add state and area fields to current-location mode", () => {
    expect(renderPicker("jelutong", "current")).not.toContain("Select a state");
  });

  it("shows a compact nationwide preview without claiming GPS distances or nearby places", () => {
    const user = { ...initialData.users[0], discoveryLocationMode: "area" as const, discoveryAreaId: "" };
    const html = renderToStaticMarkup(createElement(PlaceDiscovery, {
      destinations: getDiscoveryDestinations(initialData.destinations, user), demand: [], recommendations: [], festivals: [], user,
      latestAnalysis: undefined, visitedIds: new Set<string>(), locale: "en", isBrowsingArea: true,
      onSelectDestination: () => {}, onOpenEvents: () => {},
    }));
    expect(html.match(/class="place-discovery-card/g)).toHaveLength(4);
    expect(html).toContain(translate("en", "tourist.places.showMore"));
    expect(html).not.toContain(">Near me<");
    expect(html).not.toContain("km away");
    for (const { value: locale } of localeOptions) {
      const picker = renderToStaticMarkup(createElement(DiscoveryAreaPicker, { user, locale, onChange: () => {} }));
      expect(picker).toContain(renderToStaticMarkup(translate(locale, "tourist.places.allMalaysia")));
    }
  });
});
