import { format, isSameMonth, parseISO } from 'date-fns';
import type { MeetingEvent } from '@/data/meetingStorage';
import type { CalendarEvent } from '@/data/eventStorage';
import type { Holiday } from '../types';
import SummaryCard from './SummaryCard';

// Figma "November Overview" card (node 2719:16420): counts per category for
// the month shown in the calendar.

interface MonthOverviewCardProps {
    /** Any date in the month to summarise (the calendar's current month). */
    month: Date;
    meetings: MeetingEvent[];
    events: CalendarEvent[];
    holidays: Holiday[];
}

export default function MonthOverviewCard({ month, meetings, events, holidays }: MonthOverviewCardProps) {
    const inMonth = (date: Date) => isSameMonth(date, month);

    // Rows and dot colours as in Figma. Deadlines and Interviews have no data
    // source yet, so they stay at 0 until those categories exist.
    const rows = [
        { label: 'Company', dot: 'bg-(--blue-dark-light-active)', count: events.filter(e => inMonth(new Date(e.start_datetime))).length },
        { label: 'Meetings', dot: 'bg-(--success-light-active)', count: meetings.filter(m => inMonth(new Date(m.start_datetime))).length },
        { label: 'Holiday', dot: 'bg-(--warning-light-active)', count: holidays.filter(h => inMonth(parseISO(h.holiday_date))).length },
        { label: 'Deadlines', dot: 'bg-(--error-light-active)', count: 0 },
        { label: 'Interviews', dot: 'bg-(--info-light-active)', count: 0 },
    ];
    const total = rows.reduce((sum, row) => sum + row.count, 0);

    return (
        <SummaryCard
            icon="/icons/sparkles.svg"
            iconBackground="bg-(--warning-light-hover)"
            iconColor="var(--warm-ember-normal)"
            title={`${format(month, 'MMMM')} Overview`}
            aside={
                <span className="text-(length:--label-lg-size) leading-(--label-lg-leading) font-semibold text-(--neutral-normal)">
                    {total} {total === 1 ? 'event' : 'events'}
                </span>
            }
        >
            <ul className="flex flex-col gap-[calc(var(--space-8)+var(--space-2))]">
                {rows.map(row => (
                    <li key={row.label} className="flex items-center justify-between">
                        <span className="flex items-center gap-(--space-8)">
                            <span className={`size-(--space-8) rounded-(--radius-full) ${row.dot}`} aria-hidden="true" />
                            <span className="text-(length:--body-md-size) leading-(--body-md-leading) font-medium text-(--gray-dark-active)">
                                {row.label}
                            </span>
                        </span>
                        <span className="text-(length:--body-sm-size) leading-(--body-sm-leading) font-medium text-(--neutral-normal)">
                            {row.count}
                        </span>
                    </li>
                ))}
            </ul>
        </SummaryCard>
    );
}
