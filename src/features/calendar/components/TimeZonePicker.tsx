'use client';

// Searchable timezone field for the meeting/event modals. Closed, it shows the
// chosen zone ("(GMT+5:45) Asia/Kathmandu"); focused, it becomes a search box
// over every zone — by city, IANA name or offset ("new york", "+5:45").

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import InputField from '@/components/ui/InputField/InputField';
import MaskIcon from '@/components/ui/MaskIcon';
import { timeZoneOptions } from '../timeZones';
import { userTimeZone } from '../localTime';

interface TimeZonePickerProps {
    value: string;
    onChange: (timeZone: string) => void;
    id?: string;
}

const MAX_SHOWN = 80; // enough to scroll through; the search narrows it

export default function TimeZonePicker({ value, onChange, id }: TimeZonePickerProps) {
    const mine = userTimeZone();
    // The value too: a stored zone may be spelled differently from this browser's list
    const options = useMemo(() => timeZoneOptions([mine, value]), [mine, value]);
    const selected = options.find(option => option.value === value);

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const rootRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const listId = useId();

    const matches = useMemo(() => {
        const q = query.trim().toLowerCase();
        const found = q ? options.filter(option => option.search.includes(q)) : options;
        // With no search, put the viewer's own zone first so it's one click away
        if (!q) {
            const own = found.find(option => option.value === mine);
            if (own) return [own, ...found.filter(option => option !== own)].slice(0, MAX_SHOWN);
        }
        return found.slice(0, MAX_SHOWN);
    }, [options, query, mine]);

    const close = () => {
        setOpen(false);
        setQuery('');
    };

    const choose = (timeZone: string) => {
        onChange(timeZone);
        close();
    };

    // Close when clicking outside
    useEffect(() => {
        if (!open) return;
        const onMouseDown = (event: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) close();
        };
        document.addEventListener('mousedown', onMouseDown);
        return () => document.removeEventListener('mousedown', onMouseDown);
    }, [open]);

    // Keep the keyboard-highlighted option in view
    useEffect(() => {
        if (!open) return;
        (listRef.current?.children[active] as HTMLElement | undefined)?.scrollIntoView?.({ block: 'nearest' });
    }, [open, active]);

    const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (!open && ['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) {
            event.preventDefault();
            setOpen(true);
            setActive(0);
            return;
        }
        if (!open) return;
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                setActive(i => Math.min(i + 1, matches.length - 1));
                break;
            case 'ArrowUp':
                event.preventDefault();
                setActive(i => Math.max(i - 1, 0));
                break;
            case 'Enter':
                event.preventDefault(); // don't submit the modal's form
                if (matches[active]) choose(matches[active].value);
                break;
            case 'Escape':
                event.preventDefault();
                event.stopPropagation(); // close the list, not the modal
                close();
                break;
            case 'Tab':
                close();
                break;
        }
    };

    return (
        <div ref={rootRef} className="relative">
            <MaskIcon
                src="/icons/globe.svg"
                size={20}
                color="var(--neutral-normal)"
                className="absolute left-(--space-16) top-1/2 -translate-y-1/2 z-10 pointer-events-none"
            />
            <InputField
                id={id}
                value={open ? query : selected?.label ?? value}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    setQuery(event.target.value);
                    setActive(0);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onClick={() => setOpen(true)}
                onKeyDown={onKeyDown}
                placeholder={open ? 'Search city or offset, e.g. New York, +5:45' : 'Timezone'}
                className="calendar-modal__input--with-icon"
                role="combobox"
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                aria-autocomplete="list"
                aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined}
                autoComplete="off"
            />

            {open && (
                <ul
                    ref={listRef}
                    id={listId}
                    role="listbox"
                    className="absolute left-0 right-0 top-full z-20 mt-(--space-4) max-h-[240px] overflow-y-auto rounded-(--radius-md) bg-(--soft-white-light) shadow-(--shadow-popover) py-(--space-4)"
                >
                    {matches.length === 0 && (
                        <li className="px-(--space-12) py-(--space-8) text-(length:--body-sm-size) text-(--gray-dark-hover)">
                            No timezone matches “{query}”
                        </li>
                    )}
                    {matches.map((option, index) => (
                        <li
                            key={option.value}
                            id={`${listId}-${index}`}
                            role="option"
                            aria-selected={option.value === value}
                            onMouseEnter={() => setActive(index)}
                            // mousedown, so the input doesn't blur first
                            onMouseDown={event => {
                                event.preventDefault();
                                choose(option.value);
                            }}
                            className={`px-(--space-12) py-(--space-8) cursor-pointer text-(length:--body-md-size) leading-(--body-md-leading) text-(--neutral-normal) ${index === active ? 'bg-(--blue-sky-light)' : ''} ${option.value === value ? 'font-semibold' : ''}`}
                        >
                            {option.label}
                            {option.value === mine && (
                                <span className="text-(--gray-dark-hover) font-normal"> · your timezone</span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
