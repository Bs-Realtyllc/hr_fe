// Figma "date" badge (nodes 2719:16406, 2794:23241): a small coloured block with two
// lines, e.g. "NOV / 24" or "SUN / 10".

export type DateBadgeTone =
    | 'neutral'
    | 'success'
    | 'warning'
    | 'error'
    | 'errorDark'
    | 'info'
    | 'slate'
    | 'ember'
    | 'emberWarning'
    | 'gray'
    | 'infoDark'
    | 'warningDark'
    | 'blueDark';

// Background / text pairs exactly as used in the Figma frame.
const TONE_CLASSES: Record<DateBadgeTone, string> = {
    neutral: 'bg-(--neutral-light) text-(--neutral-dark)',
    success: 'bg-(--success-light) text-(--success-dark)',
    warning: 'bg-(--warning-light) text-(--warning-normal)',
    error: 'bg-(--error-light) text-(--error-normal)',
    errorDark: 'bg-(--error-light) text-(--error-dark)',
    info: 'bg-(--info-light) text-(--info-normal)',
    slate: 'bg-(--blue-salt-light) text-(--blue-salt)',
    ember: 'bg-(--warm-ember-light) text-(--warm-ember-dark)',
    emberWarning: 'bg-(--warm-ember-light) text-(--warning-normal)',
    gray: 'bg-(--gray-light-active) text-(--gray-dark)',
    infoDark: 'bg-(--info-light) text-(--info-dark)',
    warningDark: 'bg-(--warning-light) text-(--warning-dark)',
    blueDark: 'bg-(--blue-dark-light) text-(--blue-dark-dark)',
};

interface DateBadgeProps {
    top: string;
    bottom: string;
    tone: DateBadgeTone;
}

export default function DateBadge({ top, bottom, tone }: DateBadgeProps) {
    return (
        <span
            className={`w-(--calendar-date-badge-width) shrink-0 p-(--space-8) flex flex-col items-center justify-center rounded-(--radius-md) text-(length:--label-md-size) leading-(--label-md-leading) font-semibold ${TONE_CLASSES[tone]}`}
        >
            <span>{top}</span>
            <span>{bottom}</span>
        </span>
    );
}
