'use client'

import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import {
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    format,
    isToday,
} from "date-fns"
import Button from "@/components/ui/Button/Button"
import PageHeader from "@/components/layout/PageHeader"
import MaskIcon from "@/components/ui/MaskIcon"
import InputField from "@/components/ui/InputField/InputField"
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { BSRealtyAvatar } from "@bsrealtyllc/design-system";
import CompanyHolidaysCard from "@/features/calendar/components/CompanyHolidaysCard";
import UpcomingCard from "@/features/calendar/components/UpcomingCard";
import MonthOverviewCard from "@/features/calendar/components/MonthOverviewCard";
import type { Employee, Holiday } from "@/features/calendar/types";
import { profilePhotoUrl } from "@/features/calendar/profilePhoto";
import { useCopyLink } from "@/features/calendar/useCopyLink";
import { useEmployeeDirectory } from "@/features/calendar/useEmployeeDirectory";
import { applyDevSeed, devSeedHolidays } from "@/features/calendar/devSeed";
import DayEventsDrawer from "@/features/calendar/components/DayEventsDrawer";
import HolidayListDrawer from "@/features/calendar/components/HolidayListDrawer";
import { buildDayItems, DAY_ITEM_CHIP_BACKGROUND, formatTimeRange, type DayItem } from "@/features/calendar/dayItems";
import ItemDetailsPopover from "@/features/calendar/components/ItemDetailsPopover";
import {
    meetingStorage,
    MeetingEvent
} from "@/data/meetingStorage";
import {
    eventStorage,
    CalendarEvent
} from "@/data/eventStorage";

// ── Attendee Picker (shared by both modals) ──────────────────────────────────
// Figma "Searchbar" + "Attendes name". Loads employees, always keeps the
// signed-in user selected first, and lets the user search, add and remove.
interface AttendeePickerProps {
    selected: Employee[];
    onSelectedChange: React.Dispatch<React.SetStateAction<Employee[]>>;
    /** Show the "Attendees" label above the search box (Create Event Figma) */
    showLabel?: boolean;
}

function AttendeePicker({ selected, onSelectedChange, showLabel = false }: AttendeePickerProps) {
    const { user } = useAuth();

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [employeeLoading, setEmployeeLoading] = useState(false);
    const [employeeError, setEmployeeError] = useState("");
    const [employeeSearch, setEmployeeSearch] = useState("");
    const [showEmployees, setShowEmployees] = useState(false);
    const attendeeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                setEmployeeLoading(true);
                setEmployeeError("");
                const response = await api.get<Employee[]>("/employees");
                setEmployees(Array.isArray(response) ? response : []);
            } catch (error) {
                console.error("Failed to fetch employees:", error);
                setEmployeeError("Unable to load employees.");
            } finally {
                setEmployeeLoading(false);
            }
        };

        fetchEmployees();
    }, []);

    // The creator is always an attendee, listed first.
    useEffect(() => {
        if (!user) return;

        const creator = employees.find(employee =>
            employee.id === user.id ||
            employee.email.toLowerCase() === user.email.toLowerCase()
        ) ?? {
            id: user.id,
            name: user.name,
            email: user.email,
            designation: user.designation,
            department: user.department
        };

        onSelectedChange(previous => {
            const selectedIndex = previous.findIndex(employee =>
                employee.id === creator.id ||
                employee.email.toLowerCase() === creator.email.toLowerCase()
            );
            if (selectedIndex === -1) return [creator, ...previous];
            return previous.map((employee, index) =>
                index === selectedIndex ? { ...employee, ...creator } : employee
            );
        });
    }, [employees, user, onSelectedChange]);

    // Close the results list on an outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (attendeeRef.current && !attendeeRef.current.contains(event.target as Node)) {
                setShowEmployees(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const search = employeeSearch.trim().toLowerCase();
    const availableEmployees = employees.filter(employee =>
        !selected.some(item => item.id === employee.id) && (
            employee.name?.toLowerCase().includes(search) ||
            employee.email?.toLowerCase().includes(search) ||
            employee.designation?.toLowerCase().includes(search) ||
            employee.department?.toLowerCase().includes(search)
        )
    );

    const handleSelectEmployee = (employee: Employee) => {
        onSelectedChange(prev => prev.some(item => item.id === employee.id)
            ? prev
            : [...prev, employee]);
        setEmployeeSearch("");
        setShowEmployees(true);
    };

    const handleRemoveEmployee = (id: number) => {
        onSelectedChange(prev => prev.filter(employee => employee.id !== id));
    };

    return (
        <div className="flex flex-col gap-(--space-8)">
            {showLabel && <label htmlFor="attendee-search" className="form-label">Attendees</label>}
            <div className="relative" ref={attendeeRef}>
                {/* Figma "Searchbar" */}
                <div className="flex items-center gap-(--space-8) p-(--space-12) rounded-(--radius-md) border border-(--soft-white-darker-hover) bg-(--soft-white-light) focus-within:border-(--blue-dark-normal)">
                    <MaskIcon src="/icons/search.svg" size={20} color="var(--neutral-normal)" />
                    <input
                        id="attendee-search"
                        type="text"
                        value={employeeSearch}
                        aria-label={showLabel ? undefined : "Search attendees"}
                        onFocus={() => setShowEmployees(true)}
                        onChange={event => {
                            setEmployeeSearch(event.target.value);
                            setShowEmployees(true);
                        }}
                        placeholder="Search by name or email to add attendees"
                        className="min-w-0 flex-1 bg-transparent outline-none text-(length:--body-md-size) leading-(--body-md-leading) text-(--neutral-normal) placeholder:text-(--soft-white-dark-hover)"
                    />
                </div>

                {showEmployees && (
                    <div className="absolute z-20 mt-(--space-4) max-h-(--calendar-attendee-results-max-height) w-full overflow-y-auto rounded-(--radius-md) border border-(--neutral-light-hover) bg-(--soft-white-light) shadow-(--shadow-sm)">
                        {employeeLoading ? (
                            <p className="p-(--space-12) text-(length:--body-sm-size) leading-(--body-sm-leading) text-(--neutral-light-dark-active)">Loading employees...</p>
                        ) : employeeError ? (
                            <p className="p-(--space-12) text-(length:--body-sm-size) leading-(--body-sm-leading) text-(--error-normal)">{employeeError}</p>
                        ) : availableEmployees.length > 0 ? (
                            availableEmployees.map(employee => (
                                <button
                                    key={employee.id}
                                    type="button"
                                    onClick={() => handleSelectEmployee(employee)}
                                    className="flex w-full items-center gap-(--space-8) px-(--space-12) py-(--space-8) text-left cursor-pointer hover:bg-(--blue-sky-light)"
                                >
                                    <BSRealtyAvatar size="sm" name={employee.name} src={profilePhotoUrl(employee.profile_picture)} />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-(length:--body-md-size) leading-(--body-md-leading) font-medium text-(--neutral-normal)">{employee.name}</span>
                                        <span className="block truncate text-(length:--body-sm-size) leading-(--body-sm-leading) text-(--neutral-light-dark-active)">{employee.email}</span>
                                    </span>
                                </button>
                            ))
                        ) : (
                            <p className="p-(--space-12) text-(length:--body-sm-size) leading-(--body-sm-leading) text-(--neutral-light-dark-active)">
                                {employeeSearch ? "No employees found." : "No more employees to add."}
                            </p>
                        )}
                    </div>
                )}

                {selected.length > 0 && (
                    <div className="mt-(--space-12) flex flex-col gap-(--space-12)">
                        <p className="text-(length:--body-sm-size) leading-(--body-sm-leading) font-medium uppercase text-(--gray-dark-active)">
                            Selected attendees ({selected.length})
                        </p>
                        <div className="flex flex-col gap-(--space-4)">
                            {selected.map(employee => {
                                const isCurrentUser = !!user && (
                                    employee.id === user.id ||
                                    employee.email.toLowerCase() === user.email.toLowerCase()
                                );
                                return (
                                    // Figma "Attendes name": light-blue row and × on hover
                                    <div
                                        key={employee.id}
                                        className="group flex items-center justify-between gap-(--space-8) px-(--space-12) py-(--space-8) rounded-(--radius-md) transition-colors hover:bg-(--blue-sky-light) focus-within:bg-(--blue-sky-light)"
                                    >
                                        <div className="flex min-w-0 items-center gap-[calc(var(--space-8)+var(--space-2))]">
                                            <BSRealtyAvatar size="sm" name={employee.name} src={profilePhotoUrl(employee.profile_picture)} />
                                            <span className="min-w-0">
                                                <span className="flex items-center gap-(--space-8)">
                                                    <span className="truncate text-(length:--body-md-size) leading-(--body-md-leading) font-medium text-(--neutral-normal)">
                                                        {employee.name}
                                                    </span>
                                                    {isCurrentUser && (
                                                        <span className="px-(--space-8) py-(--space-2) rounded-(--radius-full) bg-(--blue-dark-light-hover) text-(length:--label-sm-size) leading-(--label-sm-leading) font-medium text-(--blue-sky)">
                                                            You
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="block truncate text-(length:--body-sm-size) leading-(--body-sm-leading) text-(--neutral-light-dark-active)">
                                                    {employee.email}
                                                </span>
                                            </span>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-(--space-8)">
                                            {employee.designation && (
                                                <span className="text-(length:--body-md-size) leading-(--body-md-leading) font-medium text-(--gray-dark)">
                                                    {employee.designation}
                                                </span>
                                            )}
                                            {/* Hidden until the row is hovered or the button has keyboard focus;
                                                always shown on touch screens, which have no hover. */}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveEmployee(employee.id)}
                                                className="flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100 transition-opacity"
                                                aria-label={`Remove ${employee.name}`}
                                            >
                                                <MaskIcon src="/icons/cross-outline.svg" size={12} color="var(--neutral-normal)" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// When editing, turn the saved attendee emails back into picker entries.
// Emails that aren't in the employee list still show, under the email itself.
// Merges with what's already selected (the picker adds the creator itself).
function usePrefillAttendees(
    emails: string[] | null | undefined,
    setSelected: React.Dispatch<React.SetStateAction<Employee[]>>
) {
    const { employees, loading } = useEmployeeDirectory();
    const done = useRef(false);

    useEffect(() => {
        if (done.current || loading || !emails?.length) return;
        done.current = true;
        const prefilled = emails.map((email, index): Employee =>
            employees.find(e => e.email.toLowerCase() === email.toLowerCase())
            ?? { id: -(index + 1), name: email, email }
        );
        setSelected(prev => [
            ...prefilled,
            ...prev.filter(p => !prefilled.some(e => e.email.toLowerCase() === p.email.toLowerCase())),
        ]);
    }, [emails, employees, loading, setSelected]);
}

// ── Schedule Meeting Modal ─────────────────────────────────────────────────
interface ScheduleModalProps {
    defaultDate: string;
    /** Set to edit an existing meeting instead of scheduling a new one */
    initial?: MeetingEvent;
    onClose: () => void;
    onSave: (meeting: MeetingEvent) => void;
}

function ScheduleModal({
    defaultDate,
    initial,
    onClose,
    onSave
}: ScheduleModalProps) {
    const [form, setForm] = useState({
        title: initial?.title ?? '',
        description: initial?.description ?? '',
        date: initial?.start_datetime.slice(0, 10) ?? defaultDate,
        startTime: initial?.start_datetime.slice(11, 16) ?? '10:00',
        endTime: initial?.end_datetime.slice(11, 16) ?? '10:30',
        meetLink: initial?.meet_link ?? '',
    });

    const [error, setError] = useState('');
    const { copied, copyError, copy, reset: resetCopy } = useCopyLink();
    const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
    usePrefillAttendees(initial?.attendees, setSelectedEmployees);

    const set = (k: keyof typeof form) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setForm(f => ({ ...f, [k]: e.target.value }));
        };


    // Generate mock meeting link
    const generateMeetLink = () => {
        const code = Math.random().toString(36).substring(2, 5)
            + '-' + Math.random().toString(36).substring(2, 6)
            + '-' + Math.random().toString(36).substring(2, 5);

        setForm(f => ({
            ...f,
            meetLink: `https://meet.google.com/${code}`
        }));
        resetCopy();
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!form.title.trim() || !form.date || !form.startTime || !form.endTime) {
            setError('Title, date, and times are required.');
            return;
        }

        if (form.endTime <= form.startTime) {
            setError('End time must be later than start time.');
            return;
        }

        const newMeeting: MeetingEvent = {
            id: initial?.id ?? Date.now(),
            title: form.title.trim(),
            description: form.description || null,
            start_datetime: `${form.date}T${form.startTime}:00`,
            end_datetime: `${form.date}T${form.endTime}:00`,
            attendees: selectedEmployees.map(employee => employee.email),
            meet_link: form.meetLink || null,
            creator_name: initial?.creator_name ?? 'Current User',
        };

        onSave(newMeeting);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="calendar-modal w-full md:w-(--calendar-meeting-modal-width) py-(--space-24) px-[calc(var(--space-24)+var(--space-4))] bg-(--soft-white-light) flex flex-col gap-(--space-20) rounded-(--radius-md) shadow-(--shadow-modal)"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between py-(--space-8)">
                    <h2 className="flex items-center gap-(--space-8)">
                        <MaskIcon src="/icons/google-meet.svg" size={24} color="var(--neutral-normal)" />
                        <span className="text-(length:--text-lg) leading-(--title-lg-leading) font-semibold text-(--neutral-normal)">
                            {initial ? "Edit Meeting" : "Schedule Meeting"}
                        </span>
                    </h2>

                    {/* Same hover as the Create event close button: light-blue circle,
                        padded around the icon; negative margin keeps the header from shifting. */}
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="p-(--space-4) -m-(--space-4) flex items-center justify-center rounded-(--radius-full) cursor-pointer transition-colors hover:bg-(--blue-sky-light) focus-visible:bg-(--blue-sky-light)"
                    >
                        <MaskIcon src="/icons/cross-outline.svg" size={20} color="var(--neutral-normal)" />
                    </button>
                </div>

                <form onSubmit={submit} className="flex flex-col gap-(--space-20)">
                    <div className="flex flex-col gap-(--space-16)">

                        <div className="flex flex-col gap-(--space-8)">
                            <label className="form-label">
                                Title <span>*</span>
                            </label>
                            <InputField
                                value={form.title}
                                onChange={set('title')}
                                placeholder="Meeting Title"
                            />
                        </div>

                        <div className="flex flex-col gap-(--space-8)">
                            <label className="form-label">Description</label>

                            <textarea
                                className="calendar-modal__textarea"
                                value={form.description}
                                onChange={set('description')}
                                placeholder="Agenda Of Meeting"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-(--space-24)">
                            <div className="flex flex-col gap-(--space-8)">
                                <label className="form-label">
                                    Date <span>*</span>
                                </label>
                                <InputField
                                    type="date"
                                    value={form.date}
                                    onChange={set('date')}
                                />
                            </div>

                            <div className="flex flex-col gap-(--space-8)">
                                <label className="form-label">
                                    Start <span>*</span>
                                </label>
                                <InputField
                                    type="time"
                                    value={form.startTime}
                                    onChange={set('startTime')}
                                />
                            </div>

                            <div className="flex flex-col gap-(--space-8)">
                                <label className="form-label">
                                    End <span>*</span>
                                </label>
                                <InputField
                                    type="time"
                                    value={form.endTime}
                                    onChange={set('endTime')}
                                />
                            </div>
                        </div>

                        {/* Figma "url": Auto-Generate while empty, Copy once there's a link */}
                        <div className="flex flex-col gap-(--space-8)">
                            <label className="form-label">Video conference URL</label>
                            <div className="flex items-center gap-(--space-12)">
                                <InputField
                                    value={form.meetLink}
                                    onChange={set('meetLink')}
                                    onInput={resetCopy}
                                    placeholder="Meeting URL"
                                    className="min-w-0 flex-1"
                                />
                                {form.meetLink.trim() ? (
                                    <Button
                                        type="button"
                                        size="medium"
                                        className="calendar-button-medium"
onClick={() => copy(form.meetLink)}
                                    >
                                        {copied ? "Copied" : "Copy"}
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        size="medium"
                                        className="calendar-button-medium"
onClick={generateMeetLink}
                                    >
                                        Auto-Generate
                                    </Button>
                                )}
                            </div>
                            <p className="text-(length:--body-sm-size) leading-(--body-sm-leading) text-(--info-normal)">
                                Add a link, or auto-generate one, to save this interview.
                            </p>
                            {copyError && <p className="text-(length:--body-sm-size) leading-(--body-sm-leading) text-(--error-normal)" role="alert">{copyError}</p>}
                        </div>


                        {/* No "Attendees" label here, per the Schedule Meeting Figma */}
                        <AttendeePicker
                            selected={selectedEmployees}
                            onSelectedChange={setSelectedEmployees}
                        />

                        {error && (
                            <p className="form-error-text">{error}</p>
                        )}
                    </div>

                    <div className="flex justify-end gap-(--space-8)">
                        <Button
                            type="button"
                            variant="text"
                            size="small"
                            className="calendar-modal__cancel calendar-modal__cancel--wide"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            variant="primary"
                            size="small"
                            className="calendar-modal__submit"
                        >
                            {initial ? "Save" : "Schedule"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

interface SuccessMeetingPopupProps {
    meeting: MeetingEvent;
    onClose: () => void;
}

// ── Success popup (shared) ─────────────────────────────────────────────────
// Figma "meeting_schedule_popup" (node 2698:18392).
interface SuccessPopupProps {
    title: string;
    message: React.ReactNode;
    onClose: () => void;
}

function SuccessPopup({ title, message, onClose }: SuccessPopupProps) {
    if (typeof document === "undefined") return null;

    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="success-popup-title"
                className="w-full max-w-(--calendar-success-popup-width) p-(--space-32) flex flex-col items-center gap-(--space-16) bg-(--soft-white-light) rounded-(--radius-md) shadow-(--shadow-popup)"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="w-full max-w-(--calendar-popup-content-width) flex flex-col items-center gap-(--space-8) text-center">
                    <Image src="/icons/success-icon.svg" alt="" width={64} height={64} className="size-(--space-64)" />

                    <p className="text-(length:--body-sm-size) leading-(--body-sm-leading) text-(--gray-dark-hover)">
                        YOU&apos;RE ALL SET
                    </p>

                    <div className="flex flex-col items-center">
                        <h2 id="success-popup-title" className="text-(length:--text-lg) leading-(--title-lg-leading) font-semibold text-(--neutral-normal)">
                            {title}
                        </h2>
                        <p className="text-(length:--body-sm-size) leading-(--body-sm-leading) font-medium text-(--gray-dark-hover)">
                            {message}
                        </p>
                    </div>
                </div>

                <Button
                    size="small"
                    className="calendar-button-small w-full max-w-(--calendar-popup-content-width)"
                    onClick={onClose}
                >
                    Done
                </Button>
            </div>
        </div>,
        document.body
    );
}

// ── Confirm popup ─────────────────────────────────────────────────────────
// Figma "Logout_popup" (node 3017:29483), used for deleting a meeting.
interface ConfirmPopupProps {
    title: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

function ConfirmPopup({
    title,
    confirmLabel = "Delete",
    cancelLabel = "No",
    onConfirm,
    onCancel
}: ConfirmPopupProps) {
    if (typeof document === "undefined") return null;

    return createPortal(
        <div className="modal-overlay" onClick={onCancel}>
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-popup-title"
                className="p-[calc(var(--space-24)+var(--space-4))] flex flex-col items-center gap-(--space-16) bg-(--soft-white-light) rounded-(--radius-md) shadow-(--shadow-xs)"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="w-(--calendar-popup-content-width) max-w-full flex flex-col items-center gap-(--space-8) text-center">
                    <span className="size-(--calendar-confirm-icon-size) flex items-center justify-center rounded-(--radius-full) bg-(--error-light)">
                        <MaskIcon src="/icons/trash.svg" size={24} color="var(--error-normal)" />
                    </span>
                    <h2 id="confirm-popup-title" className="text-(length:--text-lg) leading-(--title-lg-leading) font-semibold text-(--neutral-normal)">
                        {title}
                    </h2>
                </div>

                <div className="flex items-center gap-(--space-12)">
                    <Button size="small" className="calendar-button-confirm calendar-button-danger" onClick={onConfirm}>
                        {confirmLabel}
                    </Button>
                    <Button size="small" variant="text" className="calendar-button-confirm calendar-button-danger-outline" onClick={onCancel}>
                        {cancelLabel}
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
}

// "today at 10:00" / "November 27, 2026 at 10:00" (Figma wording)
function formatWhen(datetime: string) {
    const date = new Date(datetime);
    const day = isToday(date) ? "today" : format(date, "MMMM d, yyyy");
    return `${day} at ${format(date, "H:mm")}`;
}

function SuccessMeetingPopup({
    meeting,
    onClose
}: SuccessMeetingPopupProps) {
    return (
        <SuccessPopup
            title="Meeting Schedule"
            message={<>Your meeting has been successfully scheduled for {formatWhen(meeting.start_datetime)}.</>}
            onClose={onClose}
        />
    );
}

interface EventModalProps {
    defaultDate: string;
    /** Set to edit an existing event instead of creating a new one */
    initial?: CalendarEvent;
    onClose: () => void;
    onSave: (event: CalendarEvent) => void;
}

function EventModal({
    defaultDate,
    initial,
    onClose,
    onSave
}: EventModalProps) {
    const [form, setForm] = useState({
        title: initial?.title ?? "",
        date: initial?.start_datetime.slice(0, 10) ?? defaultDate,
        startTime: initial?.start_datetime.slice(11, 16) ?? "10:00",
        endTime: initial?.end_datetime.slice(11, 16) ?? "11:00",
        eventType: (initial?.event_type ?? "in-person") as "in-person" | "online",
        location: initial?.location ?? "",
        meetLink: initial?.meet_link ?? ""
    });

    const [error, setError] = useState("");
    const { copied, copyError, copy, reset: resetCopy } = useCopyLink();
    const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
    usePrefillAttendees(initial?.attendees, setSelectedEmployees);

    const set = (key: Exclude<keyof typeof form, "eventType">) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setForm(prev => ({
                ...prev,
                [key]: e.target.value
            }));
        };

    const generateMeetLink = () => {
        const code = Math.random().toString(36).substring(2, 5)
            + "-" + Math.random().toString(36).substring(2, 6)
            + "-" + Math.random().toString(36).substring(2, 5);
        setForm(prev => ({ ...prev, meetLink: `https://meet.google.com/${code}` }));
        resetCopy();
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (
            !form.title.trim() ||
            !form.date ||
            !form.startTime ||
            !form.endTime ||
            (form.eventType === "in-person" && !form.location.trim())
        ) {
            setError(form.eventType === "in-person"
                ? "Event name, date, times, and location are required."
                : "Event name, date, and times are required.");
            return;
        }

        if (form.endTime <= form.startTime) {
            setError("End time must be later than start time.");
            return;
        }

        const newEvent: CalendarEvent = {
            id: initial?.id ?? Date.now(),
            title: form.title.trim(),
            description: initial?.description ?? null,
            start_datetime: `${form.date}T${form.startTime}:00`,
            end_datetime: `${form.date}T${form.endTime}:00`,
            location: form.eventType === "in-person" ? form.location.trim() : null,
            event_type: form.eventType,
            meet_link: form.eventType === "online" ? form.meetLink.trim() || null : null,
            attendees: selectedEmployees.map(employee => employee.email),
            creator_name: initial?.creator_name ?? "Current User"
        };

        onSave(newEvent);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="calendar-modal w-full max-w-(--calendar-event-modal-width) max-h-[90vh] overflow-y-auto p-(--space-20) bg-(--soft-white-light) flex flex-col gap-(--space-20) rounded-(--radius-md) shadow-(--shadow-modal)"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center">
                    <h2 className="text-(length:--text-lg) leading-(--title-lg-leading) font-semibold text-(--neutral-normal)">
                        {initial ? "Edit event" : "Create event"}
                    </h2>

                    {/* Figma "cross" (node 2315:22973): light-blue circle on hover.
                        Padding gives the circle (and click target) some room around the 16px icon;
                        the negative margin keeps the icon where it was so the header doesn't shift. */}
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="p-(--space-4) -m-(--space-4) flex items-center justify-center rounded-(--radius-full) cursor-pointer transition-colors hover:bg-(--blue-sky-light) focus-visible:bg-(--blue-sky-light)"
                    >
                        <MaskIcon src="/icons/cross-outline.svg" size={16} color="var(--neutral-normal)" />
                    </button>
                </div>

                <form onSubmit={submit} className="flex flex-col gap-(--space-20)">
                    <div className="flex flex-col gap-(--space-12)">

                        <div className="flex flex-col gap-2">
                            <label className="form-label">
                                Event Name <span>*</span>
                            </label>

                            <InputField
                                value={form.title}
                                onChange={set("title")}
                                placeholder="Enter event name"
                            />
                        </div>

                        <div
                            className="grid grid-cols-2 gap-(--space-16) overflow-hidden rounded-(--radius-md) border border-(--soft-white-darker-hover) bg-(--soft-white-light)"
                            role="group"
                            aria-label="Event type"
                        >
                            {(["in-person", "online"] as const).map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    aria-pressed={form.eventType === type}
                                    onClick={() => {
                                        setForm(prev => ({ ...prev, eventType: type }));
                                        if (type === "online" && !form.meetLink) generateMeetLink();
                                        resetCopy();
                                    }}
                                    className={`p-(--space-4) text-(length:--body-md-size) leading-(--body-md-leading) font-medium text-(--neutral-normal) cursor-pointer transition-colors ${form.eventType === type
                                        ? "bg-(--blue-sky-light-hover) rounded-(--radius-md)"
                                        : "rounded-(--radius-xs) hover:bg-(--blue-sky-light)"
                                        }`}
                                >
                                    {type === "in-person" ? "In Person" : "Online"}
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="form-label">Date <span>*</span></label>

                            <InputField
                                type="date"
                                value={form.date}
                                onChange={set("date")}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex min-w-0 flex-col gap-2">
                                <label className="form-label">Start <span>*</span></label>

                                <InputField
                                    type="time"
                                    value={form.startTime}
                                    onChange={set("startTime")}
                                />
                            </div>

                            <div className="flex min-w-0 flex-col gap-2">
                                <label className="form-label">End <span>*</span></label>

                                <InputField
                                    type="time"
                                    value={form.endTime}
                                    onChange={set("endTime")}
                                />
                            </div>
                        </div>

                        {form.eventType === "in-person" ? (
                            <div className="flex flex-col gap-(--space-8)">
                                <label className="form-label">Location <span>*</span></label>
                                <div className="relative">
                                    {/* z-10: the input's container is position:relative and would paint over the icon */}
                                    <MaskIcon
                                        src="/icons/map-pin.svg"
                                        size={20}
                                        color="var(--neutral-normal)"
                                        className="absolute left-(--space-16) top-1/2 -translate-y-1/2 z-10 pointer-events-none"
                                    />
                                    <InputField
                                        value={form.location}
                                        onChange={set("location")}
                                        placeholder="Enter event location"
                                        className="calendar-modal__input--with-icon"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-(--space-8)">
                                <label className="form-label">Video conference URL</label>
                                <div className="flex items-center gap-(--space-12)">
                                    <InputField
                                        value={form.meetLink}
                                        onChange={set("meetLink")}
                                        placeholder="https://meet.google.com/..."
                                        className="min-w-0 flex-1"
                                        onInput={resetCopy}
                                    />
                                    <Button
                                        type="button"
                                        size="medium"
                                        className="calendar-button-medium"
onClick={() => copy(form.meetLink)}
                                    >
                                        {copied ? "Copied" : "Copy"}
                                    </Button>
                                </div>
                                <p className="text-(length:--body-sm-size) leading-(--body-sm-leading) text-(--info-normal)">
                                    Add a link, or{" "}
                                    <button type="button" className="underline" onClick={generateMeetLink}>
                                        generate one
                                    </button>
                                    , to share with attendees.
                                </p>
                                {copyError && <p className="text-(length:--body-sm-size) leading-(--body-sm-leading) text-(--error-normal)" role="alert">{copyError}</p>}
                            </div>
                        )}

                        <AttendeePicker
                            selected={selectedEmployees}
                            onSelectedChange={setSelectedEmployees}
                            showLabel
                        />

                        {error && (
                            <p className="form-error-text">{error}</p>
                        )}
                    </div>

                    <div className="flex justify-end gap-(--space-8)">
                        <Button
                            type="button"
                            variant="text"
                            size="small"
                            className="calendar-modal__cancel"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            variant="primary"
                            size="small"
                            className="calendar-modal__submit"
                        >
                            {initial ? "Save" : "Create Event"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// success event
interface SuccessEventPopupProps {
    event: CalendarEvent;
    onClose: () => void;
}

function SuccessEventPopup({
    event,
    onClose
}: SuccessEventPopupProps) {
    return (
        <SuccessPopup
            title="Event Created"
            message={<>Your event <span className="font-semibold">{event.title}</span> has been successfully created for {formatWhen(event.start_datetime)}.</>}
            onClose={onClose}
        />
    );
}

const WEEKDAYS = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
]
const DROPDOWN_WEEKDAYS = [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
    "Sun",
]

// Main page
const CalendarPage = () => {
    const [currentDate, setCurrentDate] = useState<Date>(new Date())
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false)
    const [events, setEvents] = useState<MeetingEvent[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null)
    const [showModal, setShowModal] = useState(false);
    const [modalDate, setModalDate] = useState(format(new Date(), "yyyy-MM-dd"))
    const [successMeeting, setSuccessMeeting] = useState<MeetingEvent | null>(null);
    const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

    const [showEventModal, setShowEventModal] = useState(false);

    const [eventModalDate, setEventModalDate] = useState(
        format(new Date(), "yyyy-MM-dd")
    );

    const [successEvent, setSuccessEvent] = useState<CalendarEvent | null>(null);

    // Load saved meetings from localStorage
    useEffect(() => {
        applyDevSeed(); // development only: /calendar?seed or ?seed=clear
        const savedMeetings = meetingStorage.getAll();
        setEvents(savedMeetings);
    }, []);

    // Chip details popover — the clicked item and its chip element
    const [selectedItem, setSelectedItem] = useState<{ dayItem: DayItem; anchor: HTMLElement } | null>(null);
    const closeDetails = useCallback(() => setSelectedItem(null), []);

    // Edit — the meeting / event open in its modal (opened from the popover's pencil)
    const [editingMeeting, setEditingMeeting] = useState<MeetingEvent | null>(null);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

    // Delete a meeting or event — set itemToDelete to ask first (ConfirmPopup below).
    // Opened from the details popover's trash icon.
    const [itemToDelete, setItemToDelete] = useState<{ kind: "meeting" | "event"; id: number } | null>(null);

    const handleDeleteMeeting = (id: number) => {
        meetingStorage.delete(id);

        setEvents(prev =>
            prev.filter(event => event.id !== id)
        );
    };

    const handleDeleteEvent = (id: number) => {
        eventStorage.delete(id);
        setCalendarEvents(prev => prev.filter(event => event.id !== id));
    };

    // Event
    useEffect(() => {
        setCalendarEvents(eventStorage.getAll());
    }, []);

    // Day drawer ("+N more") — the "YYYY-MM-DD" it shows, or null when closed
    const [openDayKey, setOpenDayKey] = useState<string | null>(null);
    const closeDayDrawer = useCallback(() => setOpenDayKey(null), []);

    // Full holiday list drawer ("View Full Holiday List")
    const [showHolidayList, setShowHolidayList] = useState(false);
    const closeHolidayList = useCallback(() => setShowHolidayList(false), []);

    // Company holidays (GET /holidays). A failed load just shows no holidays.
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    useEffect(() => {
        api.get<Holiday[]>("/holidays")
            .then(list => setHolidays([...(Array.isArray(list) ? list : []), ...devSeedHolidays()]))
            .catch(error => {
                console.error("Failed to load holidays:", error);
                setHolidays(devSeedHolidays());
            });
    }, []);

    const handleCreateEventClick = (dateStr: string) => {
        setEventModalDate(dateStr);
        setShowEventModal(true);
    };

    // Close month dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsMonthPickerOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // Main calendar
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)

    const days = eachDayOfInterval({
        start: monthStart,
        end: monthEnd,
    })

    // Previous month dates
    const mainCalendarOffset = monthStart.getDay()

    const previousMonthTotalDays = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        0
    ).getDate()

    const previousMonthDays = Array.from(
        { length: mainCalendarOffset },
        (_, index) => previousMonthTotalDays - mainCalendarOffset + index + 1
    )

    // Next month dates
    const totalCalendarCells = mainCalendarOffset + days.length

    const nextMonthOffset = (7 - (totalCalendarCells % 7)) % 7

    const nextMonthDays = Array.from(
        { length: nextMonthOffset },
        (_, index) => index + 1
    )

    // DROPDOWN CALENDAR - WEEK STARTS ON MONDAY
    const dropdownMonthStart = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
    )
    const dropdownTotalDays = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
    ).getDate()

    // JavaScript getDay(): Sunday = 0, Monday = 1
    // Convert to Monday-first: Monday = 0, Sunday = 6
    const dropdownStartOffset =
        (dropdownMonthStart.getDay() + 6) % 7
    const dropdownDays = Array.from(
        { length: dropdownTotalDays },
        (_, index) => index + 1
    )

    // Today's date
    const today = new Date()

    // MONTH NAVIGATION
    const handlePreviousMonth = () => {
        setCurrentDate(
            new Date(
                currentDate.getFullYear(),
                currentDate.getMonth() - 1,
                1
            )
        )
    }

    const handleNextMonth = () => {
        setCurrentDate(
            new Date(
                currentDate.getFullYear(),
                currentDate.getMonth() + 1,
                1
            )
        )
    }

    // date select from dropdown
    const handleDateSelect = (day: number) => {
        const newDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            day
        )

        setSelectedDate(newDate)
        setCurrentDate(newDate)
        setIsMonthPickerOpen(false)
    }

    // SCHEDULE MEETING
    const handleScheduleClick = (dateStr?: string) => {
        const targetDate = dateStr || format(currentDate, "yyyy-MM-dd")

        setModalDate(targetDate)
        setShowModal(true)
    }

    return (
        <div>
            {/* Page Header */}
            <PageHeader
                title="Calendar"
                discription="View and manage your schedule, meetings, company events, and important dates in one place."
            />

            {/* Main container */}
            <div className="w-full flex flex-col gap-5">

                {/* Calendar container */}
                <div className="w-full rounded-xl space-y-7">
                    {/* Calendar action */}
                    <div className="calendar-toolbar w-full flex justify-end">
                        <div className="flex items-center gap-(--space-16)">
                            {/* Date picker Dropdown */}
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsMonthPickerOpen((prev) => !prev)}
                                    aria-expanded={isMonthPickerOpen}
                                    className="p-(--space-12) bg-(--soft-white-light) rounded-(--radius-md) flex justify-center items-center gap-(--space-8) cursor-pointer"
                                >
                                    <MaskIcon src="/icons/calendar.svg" size={16} color="var(--neutral-normal)" />

                                    <span className="text-(length:--body-md-size) font-medium leading-(--body-md-leading) text-(--deep-night-normal)">
                                        {format(currentDate, "MMM, yyyy")}
                                    </span>

                                    <MaskIcon
                                        src={isMonthPickerOpen ? "/icons/chevron-up.svg" : "/icons/chevron-down.svg"}
                                        size={12}
                                        color="var(--neutral-normal)"
                                    />
                                </button>

                                {/* Dropdown calander */}
                                {isMonthPickerOpen && (
                                    <div className="absolute left-1/2 -translate-x-1/2 mt-(--space-12) bg-(--soft-white-light) rounded-(--radius-md) shadow-(--shadow-sm) p-(--space-16) z-50">
                                        {/* Figma "Selection_Month": panel centred under the trigger */}
                                        <div className="flex flex-col gap-(--space-12) w-(--calendar-month-picker-width)">

                                            {/* Months Switcher */}
                                            <div className="flex items-center justify-between">
                                                {/* previous month */}
                                                <button
                                                    type="button"
                                                    onClick={handlePreviousMonth}
                                                    className="flex items-center"
                                                >
                                                    <MaskIcon src="/icons/chevron-left.svg" color="var(--gray-dark-hover)" size={16} />
                                                </button>

                                                {/* Current month */}
                                                <span className="text-(length:--title-md-size) font-semibold leading-(--title-md-leading) tracking-(--title-md-tracking) text-(--gray-darker)">
                                                    {format(currentDate, "MMMM yyyy")}
                                                </span>

                                                {/* Next month */}
                                                <button
                                                    type="button"
                                                    onClick={handleNextMonth}
                                                    className="flex items-center"
                                                >
                                                    <MaskIcon src="/icons/chevron-right.svg" color="var(--gray-dark-hover)" size={16} />
                                                </button>
                                            </div>

                                            <div className="flex flex-col gap-(--space-8)">
                                                {/*Dropdown Weekday - Mon First */}
                                                <div className="grid grid-cols-7 justify-between content-between">

                                                    {DROPDOWN_WEEKDAYS.map((day) => (
                                                        <div key={day} className="text-(length:--body-md-size) font-medium leading-(--body-md-leading) text-(--gray-dark-hover)">
                                                            {day}
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Dropdown days */}
                                                <div className="grid grid-cols-7 ">
                                                    {/* Empety space before first day */}
                                                    {Array.from(
                                                        {
                                                            length: dropdownStartOffset
                                                        },
                                                        (_, index) => (
                                                            <div key={`empty-${index}`} className="h-8 w-8">

                                                            </div>
                                                        )
                                                    )}
                                                    {/* Days */}
                                                    {dropdownDays.map((day) => {
                                                        const isSelected = selectedDate.getDate() === day &&
                                                            selectedDate.getMonth() === currentDate.getMonth() &&
                                                            selectedDate.getFullYear() === currentDate.getFullYear()

                                                        const isToday =
                                                            today.getDate() === day &&
                                                            today.getMonth() === currentDate.getMonth() &&
                                                            today.getFullYear() === currentDate.getFullYear()

                                                        return (
                                                            <button
                                                                key={day}
                                                                type="button"
                                                                onClick={() => handleDateSelect(day)}
                                                                className={`size-(--space-32) text-(length:--body-md-size) font-medium leading-(--body-md-leading) text-(--gray-dark) flex justify-center items-center rounded-(--radius-full) ${isToday
                                                                    ? "border border-(--blue-dark-normal)"
                                                                    : "hover:bg-(--blue-sky-light)"
                                                                    }`}
                                                            >
                                                                {day}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Schedule Meeting Button */}
                            <Button
                                size="medium"
                                className="calendar-button-medium"
                                leftIcon={<MaskIcon src="/icons/plus.svg" size={18} />}
                                onClick={() => handleScheduleClick()}
                            >
                                Schedule Meeting
                            </Button>
                        </div>
                    </div>

                    {/*Main Calendar Grid */}
                    <div className="w-full flex flex-col gap-(--space-16)">
                        {/* Weekday Headers */}
                        <div className="grid grid-cols-7">
                            {WEEKDAYS.map((day) => (
                                <div
                                    key={day}
                                    className="text-center text-(length:--body-lg-size) font-medium leading-(--body-lg-leading) text-(--neutral-normal)"
                                >
                                    {day}
                                </div>
                            ))}
                        </div>


                        {/* Main Calendar Days */}
                        <div className="grid grid-cols-7 gap-(--space-4)">

                            {/* Previous month dates */}
                            {previousMonthDays.map((day, index) => (
                                <div
                                    key={`prev-${index}`}
                                    className="h-(--calendar-cell-height) bg-(--neutral-light)/50 rounded-(--radius-xs) p-(--space-8)"
                                >
                                    <div className="flex justify-end">
                                        <span className="text-(length:--body-sm-size) leading-(--body-sm-leading) text-(--neutral-light-active)">
                                            {day}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {/* Current month dates */}
                            {days.map((day) => {
                                const dateKey = format(day, "yyyy-MM-dd")

                                const dayItems = buildDayItems(dateKey, events, calendarEvents, holidays);
                                const visibleDayItems = dayItems.slice(0, 2);
                                const hiddenDayItemCount = dayItems.length - visibleDayItems.length;

                                return (
                                    <div
                                        key={dateKey}
                                        // Clicking anywhere in the cell creates an event, like its "+".
                                        // Chips and "+N more" stop the click so they keep their own action.
                                        onClick={() => handleCreateEventClick(dateKey)}
                                        className={`h-(--calendar-cell-height) p-(--space-8) flex flex-col gap-(--space-8) bg-(--soft-white-light-active) cursor-pointer ${dayItems.length > 0 ? "rounded-(--radius-md)" : "rounded-(--radius-xs)"}`}
                                    >
                                        {/* Day Number and Add Button */}
                                        <div className="flex items-center justify-between">
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); handleCreateEventClick(dateKey); }}
                                                className="size-(--space-16) flex items-center justify-center rounded-(--radius-xs) hover:bg-(--soft-white-normal) transition-colors cursor-pointer"
                                                aria-label={`Create event on ${dateKey}`}
                                            >
                                                <MaskIcon
                                                    src="/icons/plus.svg"
                                                    size={14}
                                                    color="var(--neutral-normal)"
                                                />
                                            </button>

                                            <span className="text-(length:--body-sm-size) leading-(--body-sm-leading) text-(--neutral-normal)">
                                                {format(day, "dd")}
                                            </span>
                                        </div>

                                        {/* Meetings and Calendar Events — Figma "events" chip.
                                            Fills the rest of the cell so "+N more" can sit at the bottom. */}
                                        <div className="flex flex-1 min-h-0 flex-col gap-(--space-2) overflow-hidden">
                                            {visibleDayItems.map(dayItem => (
                                                <button
                                                    type="button"
                                                    key={dayItem.key}
                                                    className={`w-full text-left flex flex-col justify-center px-(--space-8) py-(--space-4) rounded-(--radius-md) cursor-pointer ${DAY_ITEM_CHIP_BACKGROUND[dayItem.kind]}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedItem({ dayItem, anchor: e.currentTarget });
                                                    }}
                                                >
                                                    {/* Holidays are all-day: Figma shows only the name */}
                                                    {dayItem.kind !== "holiday" && (
                                                        <span className="flex items-center gap-(--space-4) text-(length:--label-sm-size) leading-(--label-sm-leading) font-medium text-(--gray-dark-active)">
                                                            <MaskIcon
                                                                src="/icons/clock.svg"
                                                                size={12}
                                                                color="var(--gray-dark-active)"
                                                            />
                                                            {/* Figma format: "12:00-16:00 PM" */}
                                                            <span>{formatTimeRange(dayItem.start, dayItem.end)}</span>
                                                        </span>
                                                    )}
                                                    <span className="block truncate text-(length:--body-sm-size) leading-(--body-sm-leading) font-medium text-(--neutral-normal)">
                                                        {dayItem.title}
                                                    </span>
                                                </button>
                                            ))}
                                            {/* Figma "more": pinned to the bottom of the cell, light background on hover;
                                                opens the day drawer with everything on that day. */}
                                            {hiddenDayItemCount > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenDayKey(dateKey);
                                                    }}
                                                    aria-label={`Show all ${dayItems.length} items on ${format(day, "MMMM d")}`}
                                                    className="mt-auto w-full text-left px-(--space-8) py-(--space-2) rounded-(--radius-md) text-(length:--body-sm-size) leading-(--body-sm-leading) font-medium text-(--neutral-normal) hover:bg-(--soft-white-normal) transition-colors cursor-pointer"
                                                >
                                                    +{hiddenDayItemCount} more
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}

                            {/* Next month dates */}
                            {/* Figma: unlike previous-month days, these look like normal days and can take a new event */}
                            {nextMonthDays.map((day) => {
                                const dateKey = format(
                                    new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, day),
                                    "yyyy-MM-dd"
                                )
                                return (
                                    <div
                                        key={`next-${dateKey}`}
                                        onClick={() => handleCreateEventClick(dateKey)}
                                        className="h-(--calendar-cell-height) p-(--space-8) bg-(--soft-white-light-active) rounded-(--radius-xs) cursor-pointer"
                                    >
                                        <div className="flex items-center justify-between">
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); handleCreateEventClick(dateKey); }}
                                                className="size-(--space-16) flex items-center justify-center rounded-(--radius-xs) hover:bg-(--soft-white-normal) transition-colors cursor-pointer"
                                                aria-label={`Create event on ${dateKey}`}
                                            >
                                                <MaskIcon src="/icons/plus.svg" size={14} color="var(--neutral-normal)" />
                                            </button>
                                            <span className="text-(length:--body-sm-size) leading-(--body-sm-leading) text-(--neutral-normal)">
                                                {format(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, day), "dd")}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}

                        </div>

                    </div>

                </div>


                {/* Summary cards — Figma node 2719:16406 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-(--space-20) items-start">
                    <div className="flex flex-col gap-(--space-20)">
                        <CompanyHolidaysCard holidays={holidays} onViewAll={() => setShowHolidayList(true)} />
                        <MonthOverviewCard month={currentDate} meetings={events} events={calendarEvents} holidays={holidays} />
                    </div>
                    <UpcomingCard meetings={events} events={calendarEvents} holidays={holidays} />
                </div>
            </div>
            {/* Popup schedule meeting */}
            {editingMeeting && (
                <ScheduleModal
                    key={`edit-meeting-${editingMeeting.id}`}
                    defaultDate={editingMeeting.start_datetime.slice(0, 10)}
                    initial={editingMeeting}
                    onClose={() => setEditingMeeting(null)}
                    onSave={(meeting) => {
                        meetingStorage.update(meeting);
                        setEvents(prev => prev.map(saved => saved.id === meeting.id ? meeting : saved));
                        setEditingMeeting(null);
                    }}
                />
            )}

            {showModal && (
                <ScheduleModal
                    defaultDate={modalDate}
                    onClose={() => setShowModal(false)}
                    onSave={(meeting) => {
                        console.log("Meeting created:", meeting);

                        try {
                            meetingStorage.add(meeting);
                        } catch (error) {
                            console.error("Failed to save meeting:", error);
                        }

                        setEvents(prev => [...prev, meeting]);
                        setShowModal(false);
                        setSuccessMeeting(meeting);
                    }}
                />
            )}

            {openDayKey && (
                <DayEventsDrawer
                    dateKey={openDayKey}
                    items={buildDayItems(openDayKey, events, calendarEvents, holidays)}
                    onClose={closeDayDrawer}
                />
            )}

            {showHolidayList && (
                <HolidayListDrawer holidays={holidays} onClose={closeHolidayList} />
            )}

            {selectedItem && (
                <ItemDetailsPopover
                    dayItem={selectedItem.dayItem}
                    anchor={selectedItem.anchor}
                    onClose={closeDetails}
                    onEdit={() => {
                        const { dayItem } = selectedItem;
                        if (dayItem.kind === "meeting") setEditingMeeting(dayItem.item);
                        else if (dayItem.kind === "event") setEditingEvent(dayItem.item);
                        setSelectedItem(null);
                    }}
                    onDelete={() => {
                        const { dayItem } = selectedItem;
                        if (dayItem.kind === "holiday") return;
                        setItemToDelete({ kind: dayItem.kind, id: dayItem.item.id });
                        setSelectedItem(null);
                    }}
                />
            )}

            {itemToDelete && (
                <ConfirmPopup
                    title={itemToDelete.kind === "meeting"
                        ? "Do you want to delete this scheduled meeting?"
                        : "Do you want to delete this event?"}
                    onConfirm={() => {
                        if (itemToDelete.kind === "meeting") handleDeleteMeeting(itemToDelete.id);
                        else handleDeleteEvent(itemToDelete.id);
                        setItemToDelete(null);
                    }}
                    onCancel={() => setItemToDelete(null)}
                />
            )}

            {successMeeting && (
                <SuccessMeetingPopup
                    meeting={successMeeting}
                    onClose={() => setSuccessMeeting(null)}
                />
            )}

            {/* Event */}
            {showEventModal && (
                <EventModal
                    defaultDate={eventModalDate}
                    onClose={() => setShowEventModal(false)}
                    onSave={(event) => {
                        eventStorage.add(event);

                        setCalendarEvents(prev => [...prev, event]);

                        setShowEventModal(false);

                        setSuccessEvent(event);
                    }}
                />
            )}

            {editingEvent && (
                <EventModal
                    key={`edit-event-${editingEvent.id}`}
                    defaultDate={editingEvent.start_datetime.slice(0, 10)}
                    initial={editingEvent}
                    onClose={() => setEditingEvent(null)}
                    onSave={(event) => {
                        eventStorage.update(event);
                        setCalendarEvents(prev => prev.map(saved => saved.id === event.id ? event : saved));
                        setEditingEvent(null);
                    }}
                />
            )}

            {successEvent && (
                <SuccessEventPopup
                    event={successEvent}
                    onClose={() => setSuccessEvent(null)}
                />
            )}

        </div >
    )
}

export default CalendarPage

