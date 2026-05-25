import { format, isValid, parseISO } from "date-fns";

const displayDateFormat = "MMM d, yyyy";
const displayDateTimeFormat = "MMM d, yyyy HH:mm";
const inputDateFormat = "yyyy-MM-dd";

/** Formats ISO dates for user-facing app surfaces. */
export function formatDisplayDate(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = parseISO(value);

  if (!isValid(date)) {
    return value;
  }

  return format(date, displayDateFormat);
}

/** Formats a readable inclusive date range for shared records and reports. */
export function formatDisplayDateRange(
  start: string | null | undefined,
  end: string | null | undefined
) {
  const displayStart = formatDisplayDate(start);
  const displayEnd = formatDisplayDate(end);

  if (displayStart && displayEnd) {
    return `${displayStart} to ${displayEnd}`;
  }

  return displayStart || displayEnd;
}

/** Formats stored millisecond timestamps for compact app tables. */
export function formatDisplayDateTime(value: number | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (!isValid(date)) {
    return "";
  }

  return format(date, displayDateTimeFormat);
}

/** Formats browser date input values without hand-built date strings. */
export function formatDateInput(date: Date) {
  return format(date, inputDateFormat);
}

/** Parses stored date input values for COSS calendar controls. */
export function parseDateInput(value: string) {
  if (!value) {
    return;
  }

  const date = parseISO(value);

  if (!isValid(date)) {
    return;
  }

  return date;
}
