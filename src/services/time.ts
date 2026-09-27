export function timeValue(value: string | undefined) {
  return value ? new Date(value).getTime() : 0;
}

export function compareTimeAsc(a: string | undefined, b: string | undefined) {
  return timeValue(a) - timeValue(b);
}

export function compareTimeDesc(a: string | undefined, b: string | undefined) {
  return timeValue(b) - timeValue(a);
}

export function minutesBetween(start: string | undefined, end: string | undefined) {
  return start && end ? Math.max(0, Math.round((timeValue(end) - timeValue(start)) / 60000)) : 0;
}
