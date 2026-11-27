'use client';

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import MaskIcon from '@/components/ui/MaskIcon';

// Right-side panel shared by the calendar's drawers — the day list ("+N more",
// Figma node 2852:19417) and the full holiday list (node 2794:23241). No dark
// backdrop: the calendar stays visible; clicking outside or Escape closes it.

interface CalendarSideDrawerProps {
    /** Path to the 20px header icon */
    icon: string;
    /** Tailwind classes for the icon chip background, e.g. "bg-(--info-light)" */
    iconBackground: string;
    /** CSS colour for the icon */
    iconColor: string;
    title: string;
    onClose: () => void;
    children: ReactNode;
}

export default function CalendarSideDrawer({ icon, iconBackground, iconColor, title, onClose, children }: CalendarSideDrawerProps) {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div className="calendar-day-drawer-overlay" onClick={onClose}>
            <aside
                role="dialog"
                aria-modal="true"
                aria-labelledby="calendar-drawer-title"
                className="calendar-day-drawer flex flex-col gap-(--space-20) px-(--space-20) py-(--space-24) bg-(--soft-white-light) overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-(--space-4)">
                        <span className={`size-(--calendar-day-drawer-control-size) p-(--space-4) flex items-center justify-center rounded-(--radius-md) ${iconBackground}`}>
                            <MaskIcon src={icon} size={20} color={iconColor} />
                        </span>
                        <h2
                            id="calendar-drawer-title"
                            className="text-(length:--title-md-size) leading-(--title-md-leading) tracking-(--title-md-tracking) font-semibold text-(--neutral-normal)"
                        >
                            {title}
                        </h2>
                    </div>
                    {/* Same hover as the modal close buttons: light-blue circle */}
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="size-(--calendar-day-drawer-control-size) p-(--space-4) flex items-center justify-center rounded-(--radius-full) cursor-pointer transition-colors hover:bg-(--blue-sky-light) focus-visible:bg-(--blue-sky-light)"
                    >
                        <MaskIcon src="/icons/cross-outline.svg" size={20} color="var(--neutral-normal)" />
                    </button>
                </div>

                {children}
            </aside>
        </div>,
        document.body
    );
}
