export { cn } from "cn"

/** "2026-10-26" → "26 Oct" (or "Mon, 26 Oct" with weekday). Falls back to the raw value if unparseable. */
export function formatShortDate(value: string, withWeekday = false) {
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    ...(withWeekday ? { weekday: "short" } : {}),
  });
}
