// Development-only sample data for the calendar page, to see every state
// (chips, "+N more", holiday chips, the three summary cards) without
// creating things by hand.
//
//   /calendar?seed        add the sample data (it stays, and refreshes on
//                         every load, until cleared)
//   /calendar?seed=clear  remove it again
//
// Does nothing in production builds. Sample meetings, events and holidays are
// shown on top of what the API returns while the seed is on — the database
// (and Google Calendar) is never touched, so sample items can't be edited or
// deleted. Dates are relative to today so the data never goes stale.

import { addDays, format, startOfToday } from 'date-fns';
import type { MeetingEvent } from './meetingsApi';
import type { CalendarEvent } from './calendarEventsApi';
import type { Holiday } from './types';

// Real ids are either Date.now() values (~1.7e12, from the create modals) or
// small database ids, so 9,000,000+ won't collide with either.
const SEED_ID_BASE = 9_000_000;

// Remembers that the seed is on, so sample holidays keep showing without ?seed.
const SEED_FLAG_KEY = 'calendar_dev_seed';

type SeedMode = 'add' | 'clear';

function isDevBrowser() {
    return process.env.NODE_ENV === 'development' && typeof window !== 'undefined';
}

function seedMode(): SeedMode | null {
    if (!isDevBrowser()) return null;
    const value = new URLSearchParams(window.location.search).get('seed');
    if (value === null) return null;
    return value === 'clear' ? 'clear' : 'add';
}

function seedIsOn() {
    return isDevBrowser() && localStorage.getItem(SEED_FLAG_KEY) === '1';
}

/** "YYYY-MM-DD" for today + `offset` days */
function day(offset: number) {
    return format(addDays(startOfToday(), offset), 'yyyy-MM-dd');
}

/** Today + `offset` days at local `time`, as an ISO instant (like the API's). */
function at(offset: number, time: string) {
    return new Date(`${day(offset)}T${time}:00`).toISOString();
}

// Attendee emails for the details popover. These won't match real employees,
// so the popover shows the email itself with an initials avatar.
const SEED_ATTENDEES: Record<number, string[]> = {
    [SEED_ID_BASE + 1]: ['olivia.rhye@example.com', 'phoenix.baker@example.com', 'lana.steiner@example.com', 'demi.wilkinson@example.com'],
    [SEED_ID_BASE + 2]: ['candice.wu@example.com', 'natali.craig@example.com'],
    [SEED_ID_BASE + 102]: ['olivia.rhye@example.com', 'drew.cano@example.com', 'orlando.diggs@example.com'],
};

// Shown as the third line of a card in the day drawer ("+N more").
const SEED_DESCRIPTIONS: Record<number, string> = {
    [SEED_ID_BASE + 1]: 'Quick round of updates and blockers.',
    [SEED_ID_BASE + 2]: 'Project discussion and progress review.',
    [SEED_ID_BASE + 12]: 'Review latest design updates with the team and the project manager.',
    [SEED_ID_BASE + 101]: 'Lunch with the whole team at the usual place.',
};

function seedMeetings(): MeetingEvent[] {
    const meeting = (n: number, title: string, offset: number, start: string, end: string, meet = false): MeetingEvent => ({
        id: SEED_ID_BASE + n,
        title,
        description: null,
        start_datetime: at(offset, start),
        end_datetime: at(offset, end),
        attendees: [],
        google_event_id: null,
        meet_link: meet ? 'https://meet.google.com/abc-defg-hij' : null,
        time_zone: null,
        status: 'scheduled',
        created_by: null,
        creator_name: 'Sample data',
    });
    return [
        // Earlier this week
        meeting(10, 'Sprint Planning', -2, '09:00', '10:00', true),
        meeting(11, 'Design Review', -1, '15:00', '16:00'),
        // Today: three meetings + an event, so the cell shows "+2 more"
        meeting(1, 'Daily Alignment', 0, '10:00', '10:30', true),
        meeting(2, 'Client meeting', 0, '12:00', '16:00'),
        meeting(12, 'HR Check-in', 0, '16:30', '17:00'),
        meeting(3, 'Sync-Up Meeting', 1, '08:00', '08:30', true),
        meeting(13, 'Intern Meeting', 2, '08:00', '09:00'),
        meeting(4, 'Interview Session', 3, '12:00', '16:00'),
        meeting(14, 'Employee meeting', 3, '09:00', '09:30', true),
        meeting(15, 'Budget Review', 5, '14:00', '15:30'),
        meeting(5, 'Weekly Alignment', 6, '08:00', '08:30', true),
        meeting(16, 'Product Demo', 8, '11:00', '12:00', true),
        meeting(17, 'One-on-One', 10, '15:00', '15:30'),
        meeting(18, 'Retrospective', 13, '16:00', '17:00', true),
    ].map(m => ({ ...m, description: SEED_DESCRIPTIONS[m.id] ?? null, attendees: SEED_ATTENDEES[m.id] ?? [] }));
}

function seedEvents(): CalendarEvent[] {
    const event = (
        n: number,
        title: string,
        offset: number,
        start: string,
        end: string,
        where: { location: string } | { meet: true }
    ): CalendarEvent => ({
        id: SEED_ID_BASE + 100 + n,
        title,
        description: null,
        start_datetime: at(offset, start),
        end_datetime: at(offset, end),
        location: 'location' in where ? where.location : null,
        event_type: 'location' in where ? 'in-person' : 'online',
        meet_link: 'meet' in where ? 'https://meet.google.com/klm-nopq-rst' : null,
        attendees: [],
        time_zone: null,
        created_by: null,
        creator_name: 'Sample data',
    });
    return [
        event(1, 'Team lunch', 0, '13:00', '14:00', { location: 'Pokhara' }),
        event(4, 'Yoga Session', 1, '07:00', '08:00', { location: 'Office rooftop' }),
        event(2, 'Town hall', 2, '11:00', '12:00', { meet: true }),
        event(5, 'Tech Talk', 3, '17:00', '18:00', { meet: true }),
        event(6, 'Blood Donation Drive', 7, '10:00', '15:00', { location: 'Kathmandu' }),
        event(3, 'Annual Day', 9, '10:00', '17:00', { location: 'Kathmandu' }),
        event(7, 'Hackathon Kickoff', 12, '09:00', '18:00', { location: 'Lalitpur' }),
    ].map(e => ({ ...e, description: SEED_DESCRIPTIONS[e.id] ?? null, attendees: SEED_ATTENDEES[e.id] ?? [] }));
}

function seedHolidays(): Holiday[] {
    const holiday = (n: number, name: string, offset: number): Holiday => ({
        id: SEED_ID_BASE + 200 + n,
        name,
        message: null,
        holiday_date: day(offset),
        year: addDays(startOfToday(), offset).getFullYear(),
    });
    return [
        holiday(1, 'International Day of Persons with Disabilities', 1),
        holiday(2, 'Udhauli Parva', 4),
        holiday(4, 'Constitution Day', 8),
        holiday(3, 'Christmas', 11),
        holiday(5, 'Tamu Lhosar', 18),
    ];
}

/** Turns the seed on (?seed) or off (?seed=clear), per the URL. */
export function applyDevSeed() {
    const mode = seedMode();
    if (mode === 'add') localStorage.setItem(SEED_FLAG_KEY, '1');
    if (mode === 'clear') localStorage.removeItem(SEED_FLAG_KEY);
}

/** Sample meetings to show on top of the API's, or [] when the seed is off. */
export function devSeedMeetings(): MeetingEvent[] {
    return seedIsOn() ? seedMeetings() : [];
}

/** Sample events to show on top of the API's, or [] when the seed is off. */
export function devSeedEvents(): CalendarEvent[] {
    return seedIsOn() ? seedEvents() : [];
}

/** Sample holidays to show on top of the API's, or [] when the seed is off. */
export function devSeedHolidays(): Holiday[] {
    return seedIsOn() ? seedHolidays() : [];
}
