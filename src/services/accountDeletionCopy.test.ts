import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AccountDeletionPanel } from "../components/AccountDeletionPanel";
import { deletionCopyKeys, deletionText } from "./accountDeletionCopy";
import { localeOptions } from "./i18n";

describe("account deletion localization and safe initial UI", () => {
  it.each(localeOptions)("covers $value including pending recovery", ({ value: locale }) => {
    for (const key of deletionCopyKeys) {
      expect(deletionText(locale, key).trim()).not.toBe("");
      if (locale !== "en") expect(deletionText(locale, key)).not.toBe(deletionText("en", key));
    }
    const props = { locale, onDelete: async () => {} };
    const html = renderToStaticMarkup(createElement(AccountDeletionPanel, props));
    expect(html).toContain('type="password" autoComplete="current-password"');
    expect(html).toContain('type="submit" disabled=""');
    expect(html).not.toContain('checked=""');
    const pending = renderToStaticMarkup(createElement(AccountDeletionPanel, { ...props, pending: true, busy: true, phase: "records" }));
    expect(pending).toContain(deletionText(locale, "records").replaceAll("'", "&#x27;"));
    expect(pending).toContain('role="status"');
  });
});
