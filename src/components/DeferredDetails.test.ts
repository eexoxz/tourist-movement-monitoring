import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DeferredDetails } from "./DeferredDetails";

describe("deferred disclosure rendering", () => {
  it("renders the summary but does not mount a closed panel's content", () => {
    let renders = 0;
    function Content() { renders++; return createElement("p", null, "Panel content"); }
    const html = renderToStaticMarkup(createElement(DeferredDetails, { summary: "Open panel", children: createElement(Content) }));
    expect(html).toContain("<summary>Open panel</summary>");
    expect(html).not.toContain("Panel content");
    expect(renders).toBe(0);
  });

  it("includes content for an initially open disclosure and preserves native markup", () => {
    const html = renderToStaticMarkup(createElement(DeferredDetails, { summary: "Panel", children: "Content", initiallyOpen: true, id: "panel", className: "overview" }));
    expect(html).toContain('id="panel"');
    expect(html).toContain('class="overview"');
    expect(html).toContain('open=""');
    expect(html).toContain("Content");
  });
});
