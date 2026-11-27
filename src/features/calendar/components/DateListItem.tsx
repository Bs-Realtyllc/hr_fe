import DateBadge, { type DateBadgeTone } from './DateBadge';

// One row in the holiday / upcoming lists: date badge, small caption, title.

interface DateListItemProps {
    badgeTop: string;
    badgeBottom: string;
    tone: DateBadgeTone;
    /** Small line above the title — "Today", "8:00 AM - 8:30 AM Google Meet"… */
    caption: string;
    title: string;
    /** Title colour token — the two Figma lists use slightly different greys */
    titleColor?: string;
}

export default function DateListItem({
    badgeTop,
    badgeBottom,
    tone,
    caption,
    title,
    titleColor = 'text-(--gray-dark-active)',
}: DateListItemProps) {
    return (
        <li className="flex items-center gap-(--space-8)">
            <DateBadge top={badgeTop} bottom={badgeBottom} tone={tone} />
            <div className="flex min-w-0 flex-col">
                <span className="truncate text-(length:--label-sm-size) leading-(--label-sm-leading) font-medium text-(--gray-dark-hover)">
                    {caption}
                </span>
                <span className={`truncate text-(length:--body-md-size) leading-(--body-md-leading) font-medium ${titleColor}`}>
                    {title}
                </span>
            </div>
        </li>
    );
}
