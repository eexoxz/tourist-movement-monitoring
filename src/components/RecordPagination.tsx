import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Locale } from "../services/i18n";
import { directoryText } from "../services/touristDirectoryCopy";
import type { RefObject } from "react";

export function RecordPagination({ page, pages, pageSize, locale, onPageChange, onPageSizeChange, scrollTarget }: {
  page: number; pages: number; pageSize: number; locale: Locale;
  onPageChange: (page: number) => void; onPageSizeChange: (size: number) => void;
  scrollTarget?: RefObject<HTMLElement | null>;
}) {
  const text = (key: Parameters<typeof directoryText>[1]) => directoryText(locale, key);
  const resetScroll = () => {
    scrollTarget?.current?.scrollTo({ top: 0 });
    scrollTarget?.current?.scrollIntoView({ block: "start", behavior: "instant" });
  };
  return <div className="directory-pagination">
    <label>{text("rows")}<select value={pageSize} onChange={(event) => { onPageSizeChange(Number(event.target.value)); resetScroll(); }}>
      {[10, 25, 50].map((size) => <option key={size} value={size}>{new Intl.NumberFormat(locale).format(size)}</option>)}
    </select></label>
    <span aria-live="polite">{directoryText(locale, "page", { page, pages })}</span>
    <div>
      <button type="button" className="icon-action" title={text("previous")} aria-label={text("previous")} disabled={page === 1} onClick={() => { onPageChange(page - 1); resetScroll(); }}><ChevronLeft size={19} /></button>
      <button type="button" className="icon-action" title={text("next")} aria-label={text("next")} disabled={page === pages} onClick={() => { onPageChange(page + 1); resetScroll(); }}><ChevronRight size={19} /></button>
    </div>
  </div>;
}
