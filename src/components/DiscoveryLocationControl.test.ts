import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import { DiscoveryLocationControl } from "./DiscoveryLocationControl";

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
    expect(markup).toContain("Select a state");
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
});
