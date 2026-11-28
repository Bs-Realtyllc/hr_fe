// Everything on one calendar day (holidays, meetings, events) as one sorted
// list — shared by the month grid's chips and the day drawer ("+N more").

import { format } from 'date-fns';
import type { MeetingEvent } from './meetingsApi';
import type { CalendarEvent } from './calendarEventsApi';
import type { Holiday } from './types';
import { localDateKey } from './localTime';

export type DayItem =
    | { key: string; kind: 'holiday'; sortKey: string; title: string; description: null; item: Holiday }
    | { key: string; kind: 'meeting'; sortKey: string; title: string; description: string | null; start: string; end: string; item: MeetingEvent }
    | { key: string; kind: 'event'; sortKey: string; title: string; description: string | null; start: string; end: string; item: CalendarEvent };

/** Grid chip colours — match the Overview card's dots (Figma node 2719:16406). */
export const DAY_ITEM_CHIP_BACKGROUND: Record<DayItem['kind'], string> = {
    meeting: 'bg-(--success-light-active)',
    event: 'bg-(--blue-dark-light-active)',
    holiday: 'bg-(--warm-ember-light-active)',
};

/** Lighter shades used by the day drawer's cards (Figma node 2852:19417). */
export const DAY_ITEM_CARD_BACKGROUND: Record<DayItem['kind'], string> = {
    meeting: 'bg-(--success-light)',
    event: 'bg-(--blue-dark-light)',
    holiday: 'bg-(--warm-ember-light)',
};

/** Figma time format: "12:00-16:00 PM" */
export function formatTimeRange(start: string, end: string) {
    return `${format(new Date(start), 'H:mm')}-${format(new Date(end), 'H:mm a')}`;
}

/** Items on the viewer's local day `dateKey` ("YYYY-MM-DD"); holidays are all-day so they sort first. */
export function buildDayItems(
    dateKey: string,
    meetings: MeetingEvent[],
    events: CalendarEvent[],
    holidays: Holiday[]
): DayItem[] {
    return [
        ...holidays
            .filter(holiday => holiday.holiday_date === dateKey)
            .map(holiday => ({
                key: `holiday-${holiday.id}`,
                kind: 'holiday' as const,
                sortKey: '', // all-day: before any timed item
                title: holiday.name,
                description: null,
                item: holiday,
            })),
        ...meetings
            .filter(meeting => localDateKey(meeting.start_datetime) === dateKey)
            .map(meeting => ({
                key: `meeting-${meeting.id}`,
                kind: 'meeting' as const,
                sortKey: meeting.start_datetime,
                title: meeting.title,
                description: meeting.description,
                start: meeting.start_datetime,
                end: meeting.end_datetime,
                item: meeting,
            })),
        ...events
            .filter(event => localDateKey(event.start_datetime) === dateKey)
            .map(event => ({
                key: `event-${event.id}`,
                kind: 'event' as const,
                sortKey: event.start_datetime,
                title: event.title,
                description: event.description,
                start: event.start_datetime,
                end: event.end_datetime,
                item: event,
            })),
    ].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}
