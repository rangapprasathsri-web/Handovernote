/**
 * Date and Timezone Utilities
 */

/**
 * Returns the offset string (e.g. '+05:30', '-07:00', 'Z') for a given IANA timezone and instant.
 */
export function getTimezoneOffsetString(timeZone: string, date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longOffset',
    });
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    if (!tzPart) return '+00:00';

    // tzPart.value could be "GMT+05:30" or "GMT" or "GMT-07:00"
    const match = tzPart.value.match(/GMT([+-]\d{2}(?::\d{2})?)/);
    if (!match) {
      if (tzPart.value === 'GMT' || tzPart.value === 'UTC') return '+00:00';
      return '+00:00';
    }
    let offset = match[1];
    if (offset.length === 3) {
      // e.g. +05 -> +05:00
      offset = `${offset}:00`;
    }
    return offset;
  } catch {
    return '+00:00';
  }
}

/**
 * Formats a date or ISO string in a specific timezone with clear labels.
 */
export function formatInTimezone(
  dateOrIso: Date | string,
  timeZone: string,
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
    if (Number.isNaN(d.getTime())) return String(dateOrIso);

    return new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      ...options,
    }).format(d);
  } catch {
    return String(dateOrIso);
  }
}

/**
 * Parses an ISO 8601 string into year, month, day, hours, minutes, seconds and offset parts.
 */
export function parseIsoWithOffset(isoString: string): {
  dateTimePart: string;
  offsetPart: string;
} | null {
  const match = isoString.match(/^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(Z|[+-]\d{2}:?\d{2})$/i);
  if (!match) return null;
  return {
    dateTimePart: match[1].replace(' ', 'T'),
    offsetPart: match[2],
  };
}

/**
 * Converts a naive HTML datetime-local string (e.g. "2026-09-03T17:00") and a timezone name into
 * a timezone-aware ISO 8601 string with explicit offset (e.g. "2026-09-03T17:00:00+05:30").
 */
export function buildIsoWithTimezone(datetimeLocal: string, timeZone: string): string {
  if (!datetimeLocal) return '';
  // Ensure seconds are present
  let normalized = datetimeLocal;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
    normalized = `${normalized}:00`;
  }

  // Calculate offset for this date in the target timezone
  // Create an approximate date to find the offset during that time of year (handles DST)
  const approxDate = new Date(`${normalized}Z`);
  const offset = getTimezoneOffsetString(timeZone, Number.isNaN(approxDate.getTime()) ? new Date() : approxDate);

  return `${normalized}${offset}`;
}
