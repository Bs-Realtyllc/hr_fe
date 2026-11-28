import { differenceInCalendarDays, format, parseISO, startOfToday } from 'date-fns';
import MaskIcon from '@/components/ui/MaskIcon';
import type { Holiday } from '../types';
import type { DateBadgeTone } from './DateBadge';
import DateListItem from './DateListItem';
import SummaryCard from './SummaryCard';

// Figma "Company Holidays" card (node 2719:16408): the next three holidays.

const VISIBLE_COUNT = 3;

// Badge colours cycle in this order, as in the Figma frame.
const TONES: DateBadgeTone[] = ['success', 'ember', 'errorDark'];

function countdown(daysAway: number) {
    if (daysAway === 0) return 'Today';
    if (daysAway === 1) return 'Tomorrow';
    return `${daysAway} Days Left`;
}

interface CompanyHolidaysCardProps {
    holidays: Holiday[];
    /** Opens the full holiday list (HolidayListDrawer). */
    onViewAll: () => void;
}

export default function CompanyHolidaysCard({ holidays, onViewAll }: CompanyHolidaysCardProps) {
    const today = startOfToday();

    const upcoming = holidays
        .map(holiday => ({ holiday, date: parseISO(holiday.holiday_date) }))
        .filter(({ date }) => date >= today)
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(0, VISIBLE_COUNT);

    return (
        <SummaryCard
            icon="/icons/gift-01.svg"
            iconBackground="bg-(--warning-light)"
            iconColor="var(--warning-normal)"
            title="Company Holidays"
            aside={
                <button
                    type="button"
                    onClick={onViewAll}
                    className="flex items-center gap-(--space-4) text-(length:--label-lg-size) leading-(--label-lg-leading) font-semibold text-(--blue-salt) hover:text-(--blue-salt-hover) transition-colors cursor-pointer"
                >
                    View Full Holiday List
                    <MaskIcon src="/icons/arrow-right.svg" size={18} />
                </button>
            }
        >
            {upcoming.length > 0 ? (
                <ul className="flex flex-col gap-(--space-8)">
                    {upcoming.map(({ holiday, date }, index) => (
                        <DateListItem
                            key={holiday.id}
                            badgeTop={format(date, 'MMM').toUpperCase()}
                            badgeBottom={format(date, 'd')}
                            tone={TONES[index % TONES.length]}
                            caption={countdown(differenceInCalendarDays(date, today))}
                            title={holiday.name}
                        />
                    ))}
                </ul>
            ) : (
                <p className="text-(length:--body-sm-size) leading-(--body-sm-leading) text-(--neutral-light-dark-active)">
                    No upcoming holidays.
                </p>
            )}
        </SummaryCard>
    );
}
