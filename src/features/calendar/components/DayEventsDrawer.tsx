'use client';

import { format, parseISO } from 'date-fns';
import { DAY_ITEM_CARD_BACKGROUND, formatTimeRange, type DayItem } from '../dayItems';
import CalendarSideDrawer from './CalendarSideDrawer';

// Figma "+2more" (node 2852:19417): everything on one day, opened from a
// cell's "+N more".

interface DayEventsDrawerProps {
    /** "YYYY-MM-DD" */
    dateKey: string;
    items: DayItem[];
    onClose: () => void;
}

export default function DayEventsDrawer({ dateKey, items, onClose }: DayEventsDrawerProps) {
    return (
        <CalendarSideDrawer
            icon="/icons/calendar.svg"
            iconBackground="bg-(--info-light)"
            iconColor="var(--info-normal)"
            title={`Events on ${format(parseISO(dateKey), 'EEE, MMM d')}`}
            onClose={onClose}
        >
            <ul className="flex flex-col gap-(--space-12)">
                {items.map(dayItem => (
                    <li key={dayItem.key} className={`flex flex-col p-(--space-12) rounded-(--radius-md) ${DAY_ITEM_CARD_BACKGROUND[dayItem.kind]}`}>
                        {/* Holidays are all-day: Figma shows only the name */}
                        {dayItem.kind !== 'holiday' && (
                            <span className="text-(length:--label-sm-size) leading-(--label-sm-leading) font-medium text-(--gray-dark-active)">
                                {formatTimeRange(dayItem.start, dayItem.end)}
                            </span>
                        )}
                        <span className="text-(length:--body-md-size) leading-(--body-md-leading) font-medium text-(--neutral-normal)">
                            {dayItem.title}
                        </span>
                        {dayItem.description && (
                            <span className="text-(length:--label-md-size) leading-(--label-md-leading) font-medium text-(--gray-dark-hover)">
                                {dayItem.description}
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        </CalendarSideDrawer>
    );
}
