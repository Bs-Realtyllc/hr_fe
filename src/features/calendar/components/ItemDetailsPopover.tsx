'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { format, parseISO } from 'date-fns';
import { BSRealtyAvatar } from '@bsrealtyllc/design-system';
import MaskIcon from '@/components/ui/MaskIcon';
import type { DayItem } from '../dayItems';
import { profilePhotoUrl } from '../profilePhoto';
import { useCopyLink } from '../useCopyLink';
import { useEmployeeDirectory } from '../useEmployeeDirectory';

// Figma "container" (node 2762:29195): details of one meeting / event /
// holiday, opened by clicking its chip on the month grid. Floats next to the
// chip and follows it while the page scrolls; closes on a click outside,
// Escape, or when the chip scrolls out of view.

// Header icon chip per kind — the same colour family as the chip itself.
const ICON_CHIP: Record<DayItem['kind'], { background: string; color: string }> = {
    meeting: { background: 'bg-(--success-light)', color: 'var(--success-normal)' },
    event: { background: 'bg-(--blue-dark-light)', color: 'var(--blue-dark-normal)' },
    holiday: { background: 'bg-(--warm-ember-light)', color: 'var(--warm-ember-dark)' },
};

/** Space between the chip and the popover, and from the viewport edges */
const GAP = 8;

/** "Friday, Nov 15, 2026, 12:00 PM - 4:00 PM" (or "…, All day" for holidays) */
function whenLabel(dayItem: DayItem) {
    if (dayItem.kind === 'holiday') {
        return `${format(parseISO(dayItem.item.holiday_date), 'EEEE, MMM d, yyyy')}, All day`;
    }
    const start = new Date(dayItem.start);
    const end = new Date(dayItem.end);
    return `${format(start, 'EEEE, MMM d, yyyy')}, ${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="flex flex-col gap-(--space-8)">
            <h3 className="text-(length:--label-lg-size) leading-(--label-lg-leading) font-semibold text-(--gray-darker)">
                {title}
            </h3>
            {children}
        </section>
    );
}

/** Small action icon in the header (edit / delete / close) */
function HeaderAction({ icon, label, color, onClick }: { icon: string; label: string; color: string; onClick?: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            title={label}
            className="p-(--space-4) -m-(--space-4) flex items-center justify-center rounded-(--radius-full) cursor-pointer transition-colors hover:bg-(--blue-sky-light) focus-visible:bg-(--blue-sky-light)"
        >
            <MaskIcon src={icon} size={16} color={color} />
        </button>
    );
}

interface ItemDetailsPopoverProps {
    dayItem: DayItem;
    /** The clicked chip — the popover is placed next to it and follows it on scroll */
    anchor: HTMLElement;
    onClose: () => void;
    /** Open the item in its modal for editing. Not shown for holidays. */
    onEdit?: () => void;
    /** Ask to delete the item (opens the confirm popup). Not shown for holidays. */
    onDelete?: () => void;
}

export default function ItemDetailsPopover({ dayItem, anchor, onClose, onEdit, onDelete }: ItemDetailsPopoverProps) {
    const panelRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
    const { employees } = useEmployeeDirectory();
    const { copied, copyError, copy } = useCopyLink();

    // Right of the chip if it fits, otherwise left; top-aligned, kept on screen.
    // Re-run on scroll/resize so the popover stays next to its chip.
    useLayoutEffect(() => {
        const place = () => {
            const panel = panelRef.current;
            if (!panel) return;
            const chip = anchor.getBoundingClientRect();
            if (chip.bottom < 0 || chip.top > window.innerHeight) {
                onClose(); // chip scrolled out of view
                return;
            }
            const { width, height } = panel.getBoundingClientRect();
            const fitsRight = chip.right + GAP + width <= window.innerWidth - GAP;
            const left = fitsRight ? chip.right + GAP : Math.max(GAP, chip.left - GAP - width);
            const top = Math.min(Math.max(GAP, chip.top), window.innerHeight - GAP - height);
            setPosition({ top: Math.max(GAP, top), left });
        };

        // Capture phase catches scrolling in any container (the app scrolls
        // inside its main area, not the window). Scrolling inside the popover
        // itself is ignored.
        const onScroll = (event: Event) => {
            if (panelRef.current?.contains(event.target as Node)) return;
            place();
        };

        place();
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', place);
        return () => {
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', place);
        };
    }, [anchor, onClose]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    if (typeof document === 'undefined') return null;

    const chip = ICON_CHIP[dayItem.kind];
    const description = dayItem.kind === 'holiday' ? dayItem.item.message : dayItem.description;
    const meetLink = dayItem.kind === 'holiday' ? null : dayItem.item.meet_link ?? null;
    const location = dayItem.kind === 'event' && dayItem.item.event_type === 'in-person' ? dayItem.item.location : null;
    const attendeeEmails = dayItem.kind === 'holiday' ? [] : dayItem.item.attendees ?? [];

    return createPortal(
        // Transparent full-screen layer: catches the click outside to close
        <div className="fixed inset-0 z-(--calendar-popover-z)" onClick={onClose}>
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="item-details-title"
                onClick={(e) => e.stopPropagation()}
                style={position ?? { visibility: 'hidden' }}
                className="calendar-details fixed w-(--calendar-details-width) max-w-[calc(100vw-var(--space-16))] max-h-[calc(100dvh-var(--space-16))] overflow-y-auto p-(--space-16) flex flex-col gap-(--space-16) bg-(--soft-white-light) rounded-(--radius-md) shadow-(--shadow-popover)"
            >
                {/* Header: icon, title + when, actions */}
                <div className="flex items-start justify-between gap-(--space-8)">
                    <div className="flex min-w-0 gap-(--space-8)">
                        <span className={`size-(--calendar-day-drawer-control-size) shrink-0 flex items-center justify-center rounded-(--radius-xs) ${chip.background}`}>
                            <MaskIcon src="/icons/calendar.svg" size={20} color={chip.color} />
                        </span>
                        <div className="flex min-w-0 flex-col">
                            <h2 id="item-details-title" className="text-(length:--label-lg-size) leading-(--label-lg-leading) font-semibold text-(--neutral-normal)">
                                {dayItem.title}
                            </h2>
                            <span className="text-(length:--label-sm-size) leading-(--label-sm-leading) font-medium text-(--gray-dark-hover)">
                                {whenLabel(dayItem)}
                            </span>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-(--space-16)">
                        {dayItem.kind !== 'holiday' && (
                            <>
                                <HeaderAction icon="/icons/edit.svg" label="Edit" color="var(--neutral-normal)" onClick={onEdit} />
                                <HeaderAction icon="/icons/trash.svg" label="Delete" color="var(--error-normal)" onClick={onDelete} />
                            </>
                        )}
                        <HeaderAction icon="/icons/cross-outline.svg" label="Close" color="var(--neutral-normal)" onClick={onClose} />
                    </div>
                </div>

                {(description || meetLink || location || attendeeEmails.length > 0) && (
                    <div className="flex flex-col gap-(--space-12)">
                        {description && (
                            <section className="flex flex-col">
                                <h3 className="text-(length:--label-lg-size) leading-(--label-lg-leading) font-semibold text-(--gray-darker)">Description</h3>
                                <p className="text-(length:--label-sm-size) leading-(--label-sm-leading) font-medium text-(--gray-dark-hover)">{description}</p>
                            </section>
                        )}

                        {meetLink && (
                            <Section title="Video-conference URL">
                                <a
                                    href={meetLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="button button--primary button--xs calendar-button-pill self-start"
                                >
                                    Join with Google Meet
                                </a>
                                <div className="flex items-center justify-between gap-(--space-8)">
                                    <span className="truncate text-(length:--label-sm-size) leading-(--label-sm-leading) font-medium text-(--gray-dark-hover)">
                                        {meetLink.replace(/^https?:\/\//, '')}
                                    </span>
                                    <span className="flex shrink-0 items-center gap-(--space-4)">
                                        {copied && (
                                            <span className="text-(length:--label-sm-size) leading-(--label-sm-leading) font-medium text-(--success-normal)">Copied</span>
                                        )}
                                        <HeaderAction icon="/icons/copy.svg" label="Copy link" color="var(--gray-dark-hover)" onClick={() => copy(meetLink)} />
                                    </span>
                                </div>
                                {copyError && (
                                    <p className="text-(length:--label-sm-size) leading-(--label-sm-leading) text-(--error-normal)" role="alert">{copyError}</p>
                                )}
                            </Section>
                        )}

                        {location && (
                            <Section title="Location">
                                <span className="flex items-center gap-(--space-8) text-(length:--label-sm-size) leading-(--label-sm-leading) font-medium text-(--gray-dark-hover)">
                                    <MaskIcon src="/icons/map-pin.svg" size={16} color="var(--gray-dark-hover)" />
                                    {location}
                                </span>
                            </Section>
                        )}

                        {attendeeEmails.length > 0 && (
                            <Section title={`Attendees (${attendeeEmails.length})`}>
                                <ul className="flex flex-col gap-(--space-4)">
                                    {attendeeEmails.map(email => {
                                        const employee = employees.find(e => e.email.toLowerCase() === email.toLowerCase());
                                        const name = employee?.name ?? email;
                                        return (
                                            <li key={email} className="flex items-center gap-[calc(var(--space-8)+var(--space-2))] px-(--space-12) py-(--space-8)">
                                                <BSRealtyAvatar size="sm" name={name} src={profilePhotoUrl(employee?.profile_picture)} />
                                                <span className="flex min-w-0 flex-col">
                                                    <span className="truncate text-(length:--body-md-size) leading-(--body-md-leading) font-medium text-(--neutral-normal)">{name}</span>
                                                    {employee && (
                                                        <span className="truncate text-(length:--body-sm-size) leading-(--body-sm-leading) text-(--neutral-light-dark-active)">{email}</span>
                                                    )}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </Section>
                        )}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
