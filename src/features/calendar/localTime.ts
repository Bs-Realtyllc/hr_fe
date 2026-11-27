// Meetings and events are exact instants: the API sends and takes ISO 8601
// ("2026-11-28T04:15:00.000Z"). The calendar shows and asks for them in the
// viewer's own timezone — the browser's — so 04:15Z is 10:00 in Kathmandu
// and 11:15 PM the evening before in New York.
//
// (Holidays are different: plain calendar dates, the same day everywhere.)

import { format } from 'date-fns';

/** The local day an instant falls on, "YYYY-MM-DD" (the grid's day key). */
export function localDateKey(iso: string): string {
    return format(new Date(iso), 'yyyy-MM-dd');
}

/** The local time of an instant, "HH:mm" (24h, as <input type="time"> wants it). */
export function localTime(iso: string): string {
    return format(new Date(iso), 'HH:mm');
}

/** A local date + time typed into the modal ("2026-11-28", "10:00") as an ISO instant. */
export function toInstant(date: string, time: string): string {
    // No zone in the string, so the browser reads it as local time
    return new Date(`${date}T${time}:00`).toISOString();
}

/** The viewer's IANA timezone, e.g. "Asia/Kathmandu". */
export function userTimeZone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** "Asia/Kathmandu (GMT+5:45)" — shown next to time fields so it's clear which zone they're in. */
export function timeZoneLabel(at: Date = new Date()): string {
    const zone = userTimeZone();
    const offset = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'shortOffset' })
        .formatToParts(at)
        .find(part => part.type === 'timeZoneName')?.value;
    return offset ? `${zone} (${offset})` : zone;
}
