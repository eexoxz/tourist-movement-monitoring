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
  it("disables area selection until a state is chosen", () => {
    const markup = renderPicker();
    expect(markup).toContain("Select a state");
    expect(markup).toContain('select disabled=""');
    expect(markup).not.toContain('value="jelutong"');
    expect(markup).not.toContain('value="alor-setar"');
  });

  it("restores the state of an existing saved area and only shows that state's areas", () => {
    const markup = renderPicker("jelutong");
    expect(markup).toContain('<option value="Penang" selected="">');
    expect(markup).toContain('<option value="jelutong" selected="">Jelutong</option>');
    expect(markup).toContain('value="batu-kawan"');
    expect(markup).not.toContain('value="alor-setar"');
    expect(markup).not.toContain("Jelutong, Penang");
  });

  it("handles missing saved areas without selecting a different location", () => {
    expect(renderPicker("removed-area")).toContain('select disabled=""');
    expect(renderPicker("alor-setar")).not.toContain('value="jelutong"');
  });

  it("does not add state and area fields to current-location mode", () => {
    expect(renderPicker("jelutong", "current")).not.toContain("Select a state");
  });
});
