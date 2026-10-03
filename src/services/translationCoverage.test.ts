import { describe, expect, it } from "vitest";
import { hasDirectTranslation, localeOptions, translate, translationKeys } from "./i18n";
import { adminTranslationKeys, hasDirectAdminTranslation, translateAdmin } from "./adminI18n";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { hasUiTranslation, notificationSource, uiText } from "./uiText";
import { coverageText, supplementalSources } from "./coverageTranslations";
import { passwordRequirementMessage } from "./passwordStrength";
import { clusterText, decisionStepText, recommendationReason } from "./planningText";
import { sosText } from "./sosCopy";
import { formatFestivalScope, formatFestivalStateSummaryLabel, getFestivalPlanningSummary } from "./festivals";
import { malaysiaFestivalEvents } from "../data/festivals";

const sourceFiles = [path.resolve("src/App.tsx"), ...["src/components", "src/workspaces"].flatMap((directory) => fs.readdirSync(directory).filter((name) => name.endsWith(".tsx")).map((name) => path.resolve(directory, name))), path.resolve("src/services/planningText.ts")];
const uiSources = new Set<string>();
const missingLocaleProps: string[] = [];
const translatedComponents = new Set(["DestinationVisual", "DestinationManager", "ToastViewport", "TourismAdvisoryPanel", "CategoryBars", "ConfusionMatrix", "KMeansFeatureBars", "MovementPulseHero", "MovementAlertList", "MovementDemandList", "TravelPlanPanel", "ListLimitFooter", "FestivalCalendarPanel", "RecommendationList"]);
for (const file of sourceFiles) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const collect = (node: ts.Node): void => {
    if (ts.isStringLiteral(node)) uiSources.add(node.text);
    else if (ts.isConditionalExpression(node)) { collect(node.whenTrue); collect(node.whenFalse); }
  };
  const visit = (node: ts.Node): void => {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      if (translatedComponents.has(node.tagName.getText(source)) && !node.attributes.properties.some((attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === "locale")) missingLocaleProps.push(`${path.basename(file)}: ${node.tagName.getText(source)}`);
    }
    if (ts.isCallExpression(node)) {
      const name = node.expression.getText(source);
      if (name === "uiText" && node.arguments[1]) collect(node.arguments[1]);
      if (name === "window.confirm" && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
        missingLocaleProps.push(`${path.basename(file)}: untranslated confirmation`);
      }
      if (name === "text" && /DestinationManager|TourismAdvisoryPanel/.test(file) && node.arguments[0]) collect(node.arguments[0]);
      if (["setSyncStatus", "setTrackingMessage", "setError", "setMessage"].includes(name) && node.arguments[0]) collect(node.arguments[0]);
      if (name === "showTrackingNotice") { if (node.arguments[1]) collect(node.arguments[1]); if (node.arguments[2]) collect(node.arguments[2]); }
    }
    if (ts.isPropertyAssignment(node) && ["title", "message"].includes(node.name.getText(source))) collect(node.initializer);
    ts.forEachChild(node, visit);
  };
  visit(source);
}

describe("complete translation catalogues", () => {
  it("passes the selected language into translated components", () => {
    expect(missingLocaleProps).toEqual([]);
  });
  for (const { value: locale } of localeOptions) {
    it(`covers every app key in ${locale}`, () => {
      expect(translationKeys.filter((key) => !hasDirectTranslation(locale, key))).toEqual([]);
      for (const key of translationKeys) {
        expect(translate(locale, key).trim()).not.toBe("");
        expect([...new Set(translate(locale, key).match(/\{\w+\}/g) ?? [])].sort(), key).toEqual([...new Set(translate("en", key).match(/\{\w+\}/g) ?? [])].sort());
      }
    });
    it(`covers every admin key in ${locale}`, () => {
      expect(adminTranslationKeys.filter((key) => !hasDirectAdminTranslation(locale, key))).toEqual([]);
      for (const key of adminTranslationKeys) {
        expect(translateAdmin(locale, key).trim()).not.toBe("");
        expect([...new Set(translateAdmin(locale, key).match(/\{\w+\}/g) ?? [])].sort(), key).toEqual([...new Set(translateAdmin("en", key).match(/\{\w+\}/g) ?? [])].sort());
      }
    });
    it(`covers app-authored supplemental UI copy in ${locale}`, () => {
      expect([...uiSources].filter((source) => source && !hasUiTranslation(locale, source))).toEqual([]);
    });
    it(`translates generated calendar labels and planning notes in ${locale}`, () => {
      for (const event of malaysiaFestivalEvents) {
        expect(hasUiTranslation(locale, formatFestivalStateSummaryLabel(event))).toBe(true);
        const scope = formatFestivalScope(event);
        if (scope === "Nationwide" || scope.startsWith("All states except ")) expect(hasUiTranslation(locale, scope)).toBe(true);
        expect(hasUiTranslation(locale, getFestivalPlanningSummary(event, []))).toBe(true);
      }
      expect(uiText(locale, "These places may become busier around this event. Compare demand in Penang before planning a route.")).not.toContain("{cities}");
      if (locale !== "en") expect(uiText(locale, "These places may become busier around this event. Compare demand in Penang before planning a route.")).not.toContain("These places may");
    });
    it(`covers every supplemental phrase in ${locale} without lost placeholders`, () => {
      for (const source of supplementalSources) {
        const translated = coverageText(locale, source);
        expect(translated, source).toBeTruthy();
        expect((translated?.match(/\{\w+\}/g) ?? []).sort(), source).toEqual((source.match(/\{\w+\}/g) ?? []).sort());
      }
    });
  }
  it("preserves user values while translating template copy", () => {
    expect(uiText("zh", "Predicted {profile}", { profile: "文化" })).toBe("预测：文化");
    expect(uiText("ja", "Actual {profile}", { profile: "{name} <Cafe>" })).toBe("実際：{name} <Cafe>");
    expect(uiText("fr", "A tourist's own report")).toBe("A tourist's own report");
  });
  it("keeps queued notifications translatable after switching from a non-English language", () => {
    const french = translate("fr", "notifications.enableMessage");
    expect(uiText("ja", notificationSource("fr", french))).toBe(translate("ja", "notifications.enableMessage"));
    expect(uiText("zh", notificationSource("fr", sosText("fr", "activeExists")))).toBe(sosText("zh", "activeExists"));
    expect(notificationSource("fr", "A tourist's own report")).toBe("A tourist's own report");
  });
  it("translates generated notifications and password requirements, not user values", () => {
    expect(uiText("zh", "Kek Lok Si Temple was added to your visit log.")).toBe("已将 Kek Lok Si Temple 添加到您的游览记录。");
    expect(uiText("ja", "Kek Lok Si Temple: check-in code accepted.")).toBe("Kek Lok Si Temple：チェックインコードを受け付けました。");
    for (const { value: locale } of localeOptions.filter((option) => option.value !== "en")) {
      expect(uiText(locale, passwordRequirementMessage("abc"))).not.toContain("Password must include");
      expect(uiText(locale, passwordRequirementMessage("abc"))).not.toContain("uppercase");
    }
  });
  it("translates generated analytics and recommendation values without changing names or numbers", () => {
    for (const { value: locale } of localeOptions.filter((option) => option.value !== "en")) {
      expect(clusterText(locale, "cultural/nature focused-route cluster")).not.toContain("focused-route");
      expect(decisionStepText(locale, "Rule 2: top interest share >= 55% -> yes (72%)")).not.toContain("Rule 2");
      expect(decisionStepText(locale, "Rule 2: top interest share >= 55% -> yes (72%)")).toContain("72");
      expect(decisionStepText(locale, "Feature extraction: cultural=2, nature=1, urban=0, total=3")).not.toContain("Feature extraction");
      expect(recommendationReason(locale, "Matches the cultural travel profile and has not been visited in the current history.")).not.toContain("cultural travel profile");
    }
    expect(recommendationReason("fr", "Custom text entered by a user")).toBe("Custom text entered by a user");
  });
});
