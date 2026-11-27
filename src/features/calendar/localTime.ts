// Meetings and events are exact instants: the API sends and takes ISO 8601
// ("2026-11-28T04:15:00.000Z"). The calendar shows them in the viewer's own
// timezone — the browser's — so 04:15Z is 10:00 in Kathmandu and 11:15 PM
// the evening before in New York. The modals can type times in any zone
// (see timeZones.ts).
//
// (Holidays are different: plain calendar dates, the same day everywhere.)

import { format } from 'date-fns';

/** The local day an instant falls on, "YYYY-MM-DD" (the grid's day key). */
export function localDateKey(iso: string): string {
    return format(new Date(iso), 'yyyy-MM-dd');
}

/** The viewer's IANA timezone, e.g. "Asia/Kathmandu". */
export function userTimeZone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
