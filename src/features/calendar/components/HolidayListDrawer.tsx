'use client';

import { format, intervalToDuration, isSameMonth, parseISO, startOfToday } from 'date-fns';
import type { Holiday } from '../types';
import type { DateBadgeTone } from './DateBadge';
import DateListItem from './DateListItem';
import CalendarSideDrawer from './CalendarSideDrawer';

// Figma "Companyholiday_sidebar" (node 2794:23241): every upcoming holiday,
// grouped by month. Opened from the Company Holidays card's
// "View Full Holiday List".

// Badge colours as in the Figma frame: the current month's holidays are grey;
// later months cycle through these, restarting each month.
const CURRENT_MONTH_TONE: DateBadgeTone = 'gray';
const MONTH_TONES: DateBadgeTone[] = ['infoDark', 'success', 'warningDark', 'errorDark', 'blueDark'];

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** "Today", "Tomorrow", "1 week left", "15 days left", "1 month 8 days left"… */
function timeLeft(date: Date, today: Date) {
    const { years = 0, months = 0, days = 0 } = intervalToDuration({ start: today, end: date });
    const totalMonths = years * 12 + months;

    if (totalMonths === 0 && days === 0) return 'Today';
    if (totalMonths === 0 && days === 1) return 'Tomorrow';
    if (totalMonths > 0) {
        return days > 0
            ? `${plural(totalMonths, 'month')} ${plural(days, 'day')} left`
            : `${plural(totalMonths, 'month')} left`;
    }
    if (days % 7 === 0) return `${plural(days / 7, 'week')} left`;
    return `${plural(days, 'day')} left`;
}

interface HolidayListDrawerProps {
    holidays: Holiday[];
    onClose: () => void;
}

export default function HolidayListDrawer({ holidays, onClose }: HolidayListDrawerProps) {
    const today = startOfToday();

    // Upcoming holidays, soonest first, grouped by "MMMM yyyy"
    const groups: { month: Date; holidays: { holiday: Holiday; date: Date }[] }[] = [];
    holidays
        .map(holiday => ({ holiday, date: parseISO(holiday.holiday_date) }))
        .filter(({ date }) => date >= today)
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .forEach(entry => {
            const last = groups[groups.length - 1];
            if (last && isSameMonth(last.month, entry.date)) last.holidays.push(entry);
            else groups.push({ month: entry.date, holidays: [entry] });
        });

    return (
        <CalendarSideDrawer
            icon="/icons/gift-01.svg"
            iconBackground="bg-(--warning-light)"
            iconColor="var(--warning-normal)"
            title="Company Holidays"
            onClose={onClose}
        >
            {groups.length > 0 ? (
                <div className="flex flex-col gap-(--space-16)">
                    {groups.map(group => {
                        const isCurrentMonth = isSameMonth(group.month, today);
                        return (
                            <section key={group.month.toISOString()} className="flex flex-col gap-(--space-12)">
                                <h3 className="text-(length:--label-lg-size) leading-(--label-lg-leading) font-semibold text-(--neutral-normal)">
                                    {format(group.month, 'MMMM yyyy')}
                                </h3>
                                <ul className="flex flex-col gap-(--space-8)">
                                    {group.holidays.map(({ holiday, date }, index) => (
                                        <DateListItem
                                            key={holiday.id}
                                            badgeTop={format(date, 'MMM').toUpperCase()}
                                            badgeBottom={format(date, 'dd')}
                                            tone={isCurrentMonth ? CURRENT_MONTH_TONE : MONTH_TONES[index % MONTH_TONES.length]}
                                            caption={timeLeft(date, today)}
                                            title={holiday.name}
                                            titleColor="text-(--gray-darker)"
                                        />
                                    ))}
                                </ul>
                            </section>
                        );
                    })}
                </div>
            ) : (
                <p className="text-(length:--body-sm-size) leading-(--body-sm-leading) text-(--neutral-light-dark-active)">
                    No upcoming holidays.
                </p>
            )}
        </CalendarSideDrawer>
    );
}
