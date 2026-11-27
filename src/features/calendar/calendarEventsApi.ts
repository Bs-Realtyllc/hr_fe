// Company events on the calendar page: hr_be /calendar-events.
// (/events is a different module — culture events.)
// Anyone signed in can read them; only admins can create, edit or delete.

import { api } from '@/lib/api';

/** One row of GET /calendar-events. Mirrors hr_be calendarEvent.dto. */
export interface CalendarEvent {
    id: number;
    title: string;
    description: string | null;
    /** Exact instant, ISO 8601 in UTC ("…Z"). Show it with localTime.ts. */
    start_datetime: string;
    end_datetime: string;
    event_type: 'in-person' | 'online';
    location: string | null;
    meet_link: string | null;
    /** Attendee emails */
    attendees: string[];
    created_by: number | null;
    creator_name: string | null;
}

/** Body of POST and PUT — the edit modal always sends every field. Times are ISO instants. */
export type CalendarEventInput = Pick<
    CalendarEvent,
    'title' | 'description' | 'start_datetime' | 'end_datetime' | 'event_type' | 'location' | 'meet_link' | 'attendees'
>;

const BASE = '/calendar-events';

function normalize(event: CalendarEvent): CalendarEvent {
    return { ...event, attendees: event.attendees ?? [] };
}

export const calendarEventsApi = {
    /** Events that overlap [from, to) — pass the viewer's local day/month boundaries. */
    async list(from: Date, to: Date, init?: { signal?: AbortSignal }): Promise<CalendarEvent[]> {
        const rows = await api.get<CalendarEvent[]>(`${BASE}?from=${from.toISOString()}&to=${to.toISOString()}`, init);
        return Array.isArray(rows) ? rows.map(normalize) : [];
    },

    async create(input: CalendarEventInput): Promise<CalendarEvent> {
        return normalize(await api.post<CalendarEvent>(BASE, input));
    },

    async update(id: number, input: CalendarEventInput): Promise<CalendarEvent> {
        return normalize(await api.put<CalendarEvent>(`${BASE}/${id}`, input));
    },

    async remove(id: number): Promise<void> {
        await api.delete(`${BASE}/${id}`);
    },
};
