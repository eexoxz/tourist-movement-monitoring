type ListLimitFooterProps = {
  hiddenCount: number;
  isExpanded: boolean;
  itemLabel: string;
  pluralLabel: string;
  onToggle: () => void;
};

export function ListLimitFooter({ hiddenCount, isExpanded, itemLabel, pluralLabel, onToggle }: ListLimitFooterProps) {
  if (hiddenCount <= 0 && !isExpanded) {
    return null;
  }

  return (
    <div className="list-limit-footer">
      <span>{isExpanded ? `Showing all ${pluralLabel}.` : `${hiddenCount} more ${hiddenCount === 1 ? itemLabel : pluralLabel} available.`}</span>
      <button className="secondary-action compact-action" type="button" onClick={onToggle}>
        {isExpanded ? "Show fewer" : "Show more"}
      </button>
    </div>
  );
}
