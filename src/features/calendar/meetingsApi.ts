// Meetings on the calendar page: hr_be /google/meetings. Each one is also a
// Google Calendar event, and Google creates its Meet link.
// Anyone signed in can schedule; only the creator or an admin can edit or cancel.

import { api } from '@/lib/api';

/** One row of GET /google/meetings. Mirrors hr_be meeting.dto. */
export interface MeetingEvent {
    id: number;
    title: string;
    description: string | null;
    /** Exact instant, ISO 8601 in UTC ("…Z"). Show it with localTime.ts. */
    start_datetime: string;
    end_datetime: string;
    /** Attendee emails */
    attendees: string[];
    google_event_id: string | null;
    meet_link: string | null;
    /** IANA zone the meeting was scheduled in (null for older ones) — the edit modal reopens in it */
    time_zone: string | null;
    status: 'scheduled' | 'cancelled';
    created_by: number | null;
    creator_name: string | null;
}

/**
 * Body of POST and PUT — the edit modal always sends every field. Times are
 * ISO instants; time_zone is the zone they were typed in (stored, and the
 * zone Google shows the event in — attendees still see their own time).
 */
export type MeetingInput = Pick<MeetingEvent, 'title' | 'description' | 'start_datetime' | 'end_datetime' | 'attendees'> & {
    time_zone: string;
};

const BASE = '/google/meetings';

function normalize(meeting: MeetingEvent): MeetingEvent {
    return { ...meeting, attendees: meeting.attendees ?? [] };
}

export const meetingsApi = {
    /** Scheduled meetings that overlap [from, to) — pass the viewer's local day/month boundaries. */
    async list(from: Date, to: Date, init?: { signal?: AbortSignal }): Promise<MeetingEvent[]> {
        const rows = await api.get<MeetingEvent[]>(`${BASE}?from=${from.toISOString()}&to=${to.toISOString()}`, init);
        return Array.isArray(rows) ? rows.map(normalize) : [];
    },

    async create(input: MeetingInput): Promise<MeetingEvent> {
        return normalize(await api.post<MeetingEvent>(BASE, input));
    },

    async update(id: number, input: MeetingInput): Promise<MeetingEvent> {
        return normalize(await api.put<MeetingEvent>(`${BASE}/${id}`, input));
    },

    /** Cancels the meeting and deletes its Google Calendar event. */
    async remove(id: number): Promise<void> {
        await api.delete(`${BASE}/${id}`);
    },
};
