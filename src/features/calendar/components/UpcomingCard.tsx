import { addDays, format, parseISO, startOfToday } from 'date-fns';
import type { MeetingEvent } from '../meetingsApi';
import type { CalendarEvent } from '../calendarEventsApi';
import type { Holiday } from '../types';
import type { DateBadgeTone } from './DateBadge';
import DateListItem from './DateListItem';
import SummaryCard from './SummaryCard';

// Figma "Upcoming" card (node 2719:16433): everything in the next 7 days.

const DAYS_AHEAD = 7;

// Badge colour per weekday (Sun = 0), as in the Figma frame.
const WEEKDAY_TONES: DateBadgeTone[] = ['neutral', 'success', 'warning', 'error', 'info', 'slate', 'emberWarning'];

interface UpcomingItem {
    key: string;
    start: Date;
    caption: string;
    title: string;
}

/** "8:00 AM - 8:30 AM", plus " Google Meet" or the location when there is one. */
function timeCaption(startIso: string, endIso: string, where?: string | null) {
    const time = `${format(new Date(startIso), 'h:mm a')} - ${format(new Date(endIso), 'h:mm a')}`;
    return where ? `${time} ${where}` : time;
}

interface UpcomingCardProps {
    meetings: MeetingEvent[];
    events: CalendarEvent[];
    holidays: Holiday[];
}

export default function UpcomingCard({ meetings, events, holidays }: UpcomingCardProps) {
    const today = startOfToday();
    const end = addDays(today, DAYS_AHEAD); // exclusive: today + the next 6 days
    const inRange = (date: Date) => date >= today && date < end;

    const items: UpcomingItem[] = [
        ...meetings.map(meeting => ({
            key: `meeting-${meeting.id}`,
            start: new Date(meeting.start_datetime),
            caption: timeCaption(meeting.start_datetime, meeting.end_datetime, meeting.meet_link ? 'Google Meet' : null),
            title: meeting.title,
        })),
        ...events.map(event => ({
            key: `event-${event.id}`,
            start: new Date(event.start_datetime),
            caption: timeCaption(
                event.start_datetime,
                event.end_datetime,
                event.event_type === 'online' ? (event.meet_link ? 'Google Meet' : null) : event.location
            ),
            title: event.title,
        })),
        ...holidays.map(holiday => ({
            key: `holiday-${holiday.id}`,
            start: parseISO(holiday.holiday_date), // midnight, so it sorts first on its day
            caption: 'All day',
            title: holiday.name,
        })),
    ]
        .filter(item => inRange(item.start))
        .sort((a, b) => a.start.getTime() - b.start.getTime());

    return (
        <SummaryCard
            icon="/icons/calendar.svg"
            iconBackground="bg-(--info-light-hover)"
            iconColor="var(--info-normal)"
            title="Upcoming"
            aside={
                <span className="text-(length:--label-lg-size) leading-(--label-lg-leading) font-semibold text-(--neutral-normal)">
                    Next {DAYS_AHEAD} days
                </span>
            }
        >
            {items.length > 0 ? (
                <ul className="flex flex-col gap-(--space-8)">
                    {items.map(item => (
                        <DateListItem
                            key={item.key}
                            badgeTop={format(item.start, 'EEE').toUpperCase()}
                            badgeBottom={format(item.start, 'd')}
                            tone={WEEKDAY_TONES[item.start.getDay()]}
                            caption={item.caption}
                            title={item.title}
                            titleColor="text-(--gray-darker)"
                        />
                    ))}
                </ul>
            ) : (
                <p className="text-(length:--body-sm-size) leading-(--body-sm-leading) text-(--neutral-light-dark-active)">
                    Nothing scheduled in the next {DAYS_AHEAD} days.
                </p>
            )}
        </SummaryCard>
    );
}
