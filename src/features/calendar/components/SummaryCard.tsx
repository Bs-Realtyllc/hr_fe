import type { ReactNode } from 'react';
import MaskIcon from '@/components/ui/MaskIcon';

// Card shell shared by the three summary cards under the calendar
// (Figma node 2719:16406): icon chip + title on the left, an optional
// action / note on the right, content below.

interface SummaryCardProps {
    /** Path to the 16px icon, e.g. "/icons/gift-01.svg" */
    icon: string;
    /** Tailwind classes for the icon chip background, e.g. "bg-(--warning-light)" */
    iconBackground: string;
    /** CSS colour for the icon, e.g. "var(--warning-normal)" */
    iconColor: string;
    title: string;
    /** Right side of the header (link, "Next 7 days", "4 events"…) */
    aside?: ReactNode;
    children: ReactNode;
}

export default function SummaryCard({ icon, iconBackground, iconColor, title, aside, children }: SummaryCardProps) {
    return (
        <section className="flex flex-col gap-(--space-16) p-(--space-16) rounded-(--radius-md) bg-(--soft-white-light)">
            <div className="flex items-center justify-between gap-(--space-8)">
                <div className="flex items-center gap-(--space-8)">
                    <span className={`size-(--space-24) p-(--space-4) flex items-center justify-center rounded-(--radius-xs) ${iconBackground}`}>
                        <MaskIcon src={icon} size={16} color={iconColor} />
                    </span>
                    <h2 className="text-(length:--label-lg-size) leading-(--label-lg-leading) font-semibold text-(--neutral-normal)">
                        {title}
                    </h2>
                </div>
                {aside}
            </div>
            {children}
        </section>
    );
}
