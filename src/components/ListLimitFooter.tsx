import type { Locale } from "../services/i18n";
import { uiText } from "../services/uiText";

type ListLimitFooterProps = {
  hiddenCount: number;
  isExpanded: boolean;
  itemLabel: string;
  pluralLabel: string;
  onToggle: () => void;
  locale: Locale;
};

export function ListLimitFooter({ hiddenCount, isExpanded, itemLabel, pluralLabel, onToggle, locale }: ListLimitFooterProps) {
  if (hiddenCount <= 0 && !isExpanded) {
    return null;
  }

  return (
    <div className="list-limit-footer">
      <span>{isExpanded ? uiText(locale, "Showing all {items}.", { items: uiText(locale, pluralLabel) }) : uiText(locale, "{count} more {items} available.", { count: hiddenCount, items: uiText(locale, hiddenCount === 1 ? itemLabel : pluralLabel) })}</span>
      <button className="secondary-action compact-action" type="button" onClick={onToggle}>
        {uiText(locale, isExpanded ? "Show fewer" : "Show more")}
      </button>
    </div>
  );
}
