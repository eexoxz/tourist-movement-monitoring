import type { VisitorInformation, VisitorValue } from "../data/visitorInformation";

export const maxVisitRows = 20;
export const maxVisitSources = 6;

export function isVisitSource(value: string) {
  try {
    const url = new URL(value);
    return value.length <= 500 && url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function isVisitDate(value: string) {
  const date = new Date(value + "T00:00:00Z");
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validVisitDetails(info: VisitorInformation) {
  return (info.hours?.length ?? 0) <= maxVisitRows
    && (info.prices?.length ?? 0) <= maxVisitRows
    && (info.hours ?? []).every((row) => row.time.trim())
    && (info.prices ?? []).every((row) => (typeof row.audience === "string" || row.audience.text.trim())
      && Number.isFinite(row.amount) && row.amount >= 0 && row.amount <= 100000)
    && info.sources.filter((url) => url.trim()).length <= maxVisitSources
    && info.sources.every((url) => !url.trim() || isVisitSource(url.trim()))
    && (!info.checkedAt || isVisitDate(info.checkedAt))
    && (!info.closure || (isVisitDate(info.closure.from) && isVisitDate(info.closure.through) && info.closure.from <= info.closure.through));
}

export function cleanVisitDetails(info: VisitorInformation): VisitorInformation {
  const trim = <Key extends string>(value: VisitorValue<Key> | undefined) => typeof value === "string" || value === undefined
    ? value : value.text.trim() ? { text: value.text.trim() } : undefined;
  const notes = <Key extends string>(values: VisitorValue<Key>[] = []) => values.map(trim).filter((value) => value !== undefined);
  const hoursNotes = notes(info.hoursNotes);
  const priceNotes = notes(info.priceNotes);
  return {
    ...(info.hours?.length ? { hours: info.hours.map((row) => ({
      ...(trim(row.label) ? { label: trim(row.label) } : {}),
      ...(row.days?.length ? { days: row.days } : {}),
      time: row.time.trim(),
    })) } : {}),
    ...(info.closedDays?.length ? { closedDays: info.closedDays } : {}),
    ...(hoursNotes.length ? { hoursNotes } : {}),
    ...(info.prices?.length ? { prices: info.prices.map((row) => ({
      audience: trim(row.audience)!,
      amount: row.amount,
      ...(trim(row.residency) ? { residency: trim(row.residency) } : {}),
      ...(row.ages?.trim() ? { ages: row.ages.trim() } : {}),
      ...(row.height?.trim() ? { height: row.height.trim() } : {}),
    })) } : {}),
    ...(trim(info.priceScope) ? { priceScope: trim(info.priceScope) } : {}),
    ...(priceNotes.length ? { priceNotes } : {}),
    ...(info.checkedAt ? { checkedAt: info.checkedAt } : {}),
    ...(info.closure ? { closure: info.closure } : {}),
    sources: [...new Set(info.sources.map((url) => url.trim()).filter(Boolean))],
  };
}

export function visitDetailsFingerprint(info: unknown) {
  return JSON.stringify(info, (_key, value: unknown) => value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
    : value);
}
