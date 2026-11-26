'use client'

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import {
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    format,
} from "date-fns"
import { Copy, MapPin, Search } from "lucide-react"
import Button from "@/components/ui/Button/Button"
import PageHeader from "@/components/layout/PageHeader"
import MaskIcon from "@/components/ui/MaskIcon"
import InputField from "@/components/ui/InputField/InputField"
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
    meetingStorage,
    MeetingEvent
} from "@/data/meetingStorage";
import {
    eventStorage,
    CalendarEvent
} from "@/data/eventStorage";

interface Employee {
    id: number;
    name: string;
    email: string;
    designation?: string;
    department?: string;
    profile_picture?: string | null;
}

// ── Schedule Meeting Modal ─────────────────────────────────────────────────
interface ScheduleModalProps {
    defaultDate: string;
    onClose: () => void;
    onCreated: (meeting: MeetingEvent) => void;
}

function ScheduleModal({
    defaultDate,
    onClose,
    onCreated
}: ScheduleModalProps) {
    const { user } = useAuth();

    const [form, setForm] = useState({
        title: '',
        description: '',
        date: defaultDate,
        startTime: '10:00',
        endTime: '10:30',
        meetLink: '',
    });

    const [error, setError] = useState('');

    const set = (k: keyof typeof form) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setForm(f => ({ ...f, [k]: e.target.value }));
        };

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [employeeLoading, setEmployeeLoading] = useState(false);
    const [employeeError, setEmployeeError] = useState("");

    const [employeeSearch, setEmployeeSearch] = useState("");
    const [showEmployees, setShowEmployees] = useState(false);
    const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);

    const attendeeRef = useRef<HTMLDivElement>(null);

    // Fetch employees
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

        setSelectedEmployees(previous => {
            const selectedIndex = previous.findIndex(employee =>
                employee.id === creator.id ||
                employee.email.toLowerCase() === creator.email.toLowerCase()
            );
            if (selectedIndex === -1) return [creator, ...previous];
            return previous.map((employee, index) =>
                index === selectedIndex ? { ...employee, ...creator } : employee
            );
        });
    }, [employees, user]);

    // Search employees
    const filteredEmployees = employees.filter(employee => {
        const search = employeeSearch.trim().toLowerCase();

        return (
            employee.name?.toLowerCase().includes(search) ||
            employee.email?.toLowerCase().includes(search) ||
            employee.designation?.toLowerCase().includes(search) ||
            employee.department?.toLowerCase().includes(search)
        );
    });

    // Select employee
    const handleSelectEmployee = (employee: Employee) => {
        setSelectedEmployees(prev => {
            if (prev.some(item => item.id === employee.id)) {
                return prev;
            }

            return [...prev, employee];
        });

        setEmployeeSearch("");
        setShowEmployees(true);
    };

    // Remove employee
    const handleRemoveEmployee = (id: number) => {
        setSelectedEmployees(prev =>
            prev.filter(employee => employee.id !== id)
        );
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                attendeeRef.current &&
                !attendeeRef.current.contains(event.target as Node)
            ) {
                setShowEmployees(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);


    // Generate mock meeting link
    const generateMeetLink = () => {
        const code = Math.random().toString(36).substring(2, 5)
            + '-' + Math.random().toString(36).substring(2, 6)
            + '-' + Math.random().toString(36).substring(2, 5);

        setForm(f => ({
            ...f,
            meetLink: `https://meet.google.com/${code}`
        }));
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
            id: Date.now(),
            title: form.title.trim(),
            description: form.description || null,
            start_datetime: `${form.date}T${form.startTime}:00`,
            end_datetime: `${form.date}T${form.endTime}:00`,
            attendees: selectedEmployees.map(employee => employee.email),
            meet_link: form.meetLink || null,
            creator_name: 'Current User',
        };

        onCreated(newMeeting);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="w-full md:w-[590px] lg:w-[590px] py-6 px-7 bg-(--soft-white-light) flex flex-col gap-5 rounded-lg"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between py-2">
                    <h2 className="flex items-center gap-2">
                        <MaskIcon src="/icons/google-meet.svg" size={24} />
                        <span className="text-[20px] font-semibold leading-7 text-[#17212B]">
                            Schedule Meeting
                        </span>
                    </h2>

                    <MaskIcon
                        src="/icons/cross.svg"
                        size={20}
                        onClick={onClose}
                    />
                </div>

                <form onSubmit={submit} className="space-y-5">
                    <div className="flex flex-col gap-4">

                        <div className="flex flex-col gap-2">
                            <label className="form-label">
                                Title <span>*</span>
                            </label>
                            <InputField
                                value={form.title}
                                onChange={set('title')}
                                placeholder="Meeting Title"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="form-label">Description</label>

                            <div className="border border-(--soft-white-dark-hover) rounded-md hover:border-(--blue-dark-normal) focus-within:border-(--blue-dark-normal)">
                                <textarea
                                    className="block w-full h-full border-0 bg-transparent px-4 py-2 focus:outline-none resize-none"
                                    rows={3}
                                    value={form.description}
                                    onChange={set('description')}
                                    placeholder="Agenda Of Meeting"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 justify-between">
                            <div className="flex flex-col gap-2">
                                <label className="form-label">
                                    Date <span>*</span>
                                </label>
                                <InputField
                                    type="date"
                                    value={form.date}
                                    onChange={set('date')}
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="form-label">
                                    Start <span>*</span>
                                </label>
                                <InputField
                                    type="time"
                                    value={form.startTime}
                                    onChange={set('startTime')}
                                />
                            </div>

                            <div className="flex flex-col gap-2">
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

                        <div className="space-y-2">
                            <div className="flex justify-between gap-2 items-end ">
                                <div className="flex flex-col gap-2 w-[364px]">
                                    <label className="form-label">
                                        Video conference URL
                                    </label>
                                    <InputField
                                        value={form.meetLink}
                                        onChange={set('meetLink')}
                                        placeholder="Meeting URL"
                                    />

                                </div>

                                <Button
                                    type="button"
                                    className="h-[44px]!"
                                    onClick={generateMeetLink}
                                >
                                    Auto-Generate
                                </Button>
                            </div>
                            <p className="text-[12px] text-(--info-normal)">Add a link, or auto-generate one, to save this interview.</p>
                        </div>


                        <div className="flex flex-col gap-2">
                            <label className="form-label">Attendees</label>

                            <div className="relative" ref={attendeeRef}>
                                <div className="relative">
                                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                                    <input
                                        type="text"
                                        value={employeeSearch}
                                        onFocus={() => setShowEmployees(true)}
                                        onChange={(e) => {
                                            setEmployeeSearch(e.target.value);
                                            setShowEmployees(true);
                                        }}
                                        placeholder="Search by name or email to add attendees"
                                        className="h-[40px] w-full rounded-md border border-(--soft-white-dark-hover) bg-white pl-9 pr-3 text-xs outline-none focus:border-(--blue-dark-normal)"
                                    />
                                </div>

                                {showEmployees && (
                                    <div className="absolute z-20 mt-1 max-h-[160px] w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                                        {employeeLoading ? (
                                            <p className="p-3 text-xs text-gray-500">Loading employees...</p>
                                        ) : employeeError ? (
                                            <p className="p-3 text-xs text-red-500">{employeeError}</p>
                                        ) : filteredEmployees.filter(employee =>
                                            !selectedEmployees.some(selected => selected.id === employee.id)
                                        ).length > 0 ? (
                                            filteredEmployees
                                                .filter(employee => !selectedEmployees.some(selected => selected.id === employee.id))
                                                .map(employee => (
                                                    <button
                                                        key={employee.id}
                                                        type="button"
                                                        onClick={() => handleSelectEmployee(employee)}
                                                        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
                                                    >
                                                        <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-[#EAF3F9] text-[10px] font-semibold text-[#235E94]">
                                                            {employee.profile_picture ? (
                                                                <img
                                                                    src={employee.profile_picture.startsWith("http")
                                                                        ? employee.profile_picture
                                                                        : `${(process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/api\/?$/, "")}/uploads/profile/photo/${employee.profile_picture}`}
                                                                    alt=""
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            ) : (
                                                                employee.name.split(" ").map(word => word[0]).join("").slice(0, 2)
                                                            )}
                                                        </span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate text-xs font-medium text-[#17212B]">{employee.name}</span>
                                                            <span className="block truncate text-[10px] text-gray-500">{employee.email}</span>
                                                        </span>
                                                    </button>
                                                ))
                                        ) : (
                                            <p className="p-3 text-xs text-gray-500">
                                                {employeeSearch ? "No employees found." : "No more employees to add."}
                                            </p>
                                        )}
                                    </div>
                                )}
                                {selectedEmployees.length > 0 && (
                                    <div className="mt-2">
                                        <p className="mb-1 text-[9px] font-medium uppercase text-[#64748B]">
                                            Selected attendees ({selectedEmployees.length})
                                        </p>
                                        <div className="space-y-1">
                                            {selectedEmployees.map(employee => (
                                                <div key={employee.id} className="flex items-center gap-2 py-1">
                                                    <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-[#EAF3F9] text-[10px] font-semibold text-[#235E94]">
                                                        {employee.profile_picture ? (
                                                            <img
                                                                src={employee.profile_picture.startsWith("http")
                                                                    ? employee.profile_picture
                                                                    : `${(process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/api\/?$/, "")}/uploads/profile/photo/${employee.profile_picture}`}
                                                                alt=""
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : employee.name.split(" ").map(word => word[0]).join("").slice(0, 2)}
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-[11px] font-medium text-[#17212B]">
                                                            {employee.name}
                                                            {user && (
                                                                employee.id === user.id ||
                                                                employee.email.toLowerCase() === user.email.toLowerCase()
                                                            ) && (
                                                                <span className="ml-1 rounded bg-[#DDF0FA] px-1 text-[9px]">You</span>
                                                            )}
                                                        </span>
                                                        <span className="block truncate text-[9px] text-gray-500">{employee.email}</span>
                                                    </span>
                                                    {employee.designation && (
                                                        <span className="text-[10px] text-gray-500">{employee.designation}</span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveEmployee(employee.id)}
                                                        className="px-1 text-gray-500 hover:text-red-500"
                                                        aria-label={`Remove ${employee.name}`}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>


                        {error && (
                            <p className="form-error-text">{error}</p>
                        )}
                    </div>

                    <div className="flex gap-3 justify-end">
                        <Button
                            type="button"
                            variant="text"
                            size="small"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            variant="primary"
                            size="small"
                        >
                            Schedule
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

function SuccessMeetingPopup({
    meeting,
    onClose
}: SuccessMeetingPopupProps) {
    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="w-full border max-w-[452px] bg-(--soft-white-light) rounded-lg p-8 flex flex-col gap-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col gap-2 items-center">
                    <img src="/icons/success-icon.svg" alt="" className="h-10 w-10" />

                    <p className="text-[12px] text-(--gray-dark-hover)">
                        YOU'RE ALL SET
                    </p>

                    <div className="flex flex-col gap-2 items-center text-center">
                        <h2 className="text-[20px] font-semibold text-[#17212B]">
                            Meeting Schedule
                        </h2>

                        <p className="text-[12px] text-(--gray-dark-hover)">
                            Your meeting has been successfully scheduled for
                            {" "}
                            {format(
                                new Date(meeting.start_datetime),
                                "MMMM dd, yyyy"
                            )}
                            {" at "}
                            {format(
                                new Date(meeting.start_datetime),
                                "hh:mm a"
                            )}.
                        </p>


                    </div>
                </div>

                <div className="flex w-full">
                    <Button className="w-full"
                        size="small" onClick={onClose}>
                        Done
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
}

// Create Event
interface EventModalProps {
    defaultDate: string;
    onClose: () => void;
    onCreated: (event: CalendarEvent) => void;
}

function EventModal({
    defaultDate,
    onClose,
    onCreated
}: EventModalProps) {
    const { user } = useAuth();

    const [form, setForm] = useState({
        title: "",
        date: defaultDate,
        startTime: "10:00",
        endTime: "11:00",
        eventType: "in-person" as "in-person" | "online",
        location: "",
        meetLink: ""
    });

    const [error, setError] = useState("");
    const [copyError, setCopyError] = useState("");
    const [copied, setCopied] = useState(false);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [employeeLoading, setEmployeeLoading] = useState(false);
    const [employeeError, setEmployeeError] = useState("");
    const [employeeSearch, setEmployeeSearch] = useState("");
    const [showEmployees, setShowEmployees] = useState(false);
    const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
    const attendeeRef = useRef<HTMLDivElement>(null);

    const set = (key: Exclude<keyof typeof form, "eventType">) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setForm(prev => ({
                ...prev,
                [key]: e.target.value
            }));
        };

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

        setSelectedEmployees(previous => {
            const selectedIndex = previous.findIndex(employee =>
                employee.id === creator.id ||
                employee.email.toLowerCase() === creator.email.toLowerCase()
            );
            if (selectedIndex === -1) return [creator, ...previous];
            return previous.map((employee, index) =>
                index === selectedIndex ? { ...employee, ...creator } : employee
            );
        });
    }, [employees, user]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (attendeeRef.current && !attendeeRef.current.contains(event.target as Node)) {
                setShowEmployees(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredEmployees = employees.filter(employee => {
        const search = employeeSearch.trim().toLowerCase();
        return (
            employee.name?.toLowerCase().includes(search) ||
            employee.email?.toLowerCase().includes(search) ||
            employee.designation?.toLowerCase().includes(search) ||
            employee.department?.toLowerCase().includes(search)
        );
    });

    const generateMeetLink = () => {
        const code = Math.random().toString(36).substring(2, 5)
            + "-" + Math.random().toString(36).substring(2, 6)
            + "-" + Math.random().toString(36).substring(2, 5);
        setForm(prev => ({ ...prev, meetLink: `https://meet.google.com/${code}` }));
        setCopied(false);
    };

    const copyMeetLink = async () => {
        if (!form.meetLink) return;

        try {
            await navigator.clipboard.writeText(form.meetLink);
            setCopied(true);
            setCopyError("");
        } catch (copyFailure) {
            console.error("Failed to copy meeting link:", copyFailure);
            setCopied(false);
            setCopyError("Unable to copy link.");
        }
    };

    const handleSelectEmployee = (employee: Employee) => {
        setSelectedEmployees(prev => prev.some(item => item.id === employee.id)
            ? prev
            : [...prev, employee]);
        setEmployeeSearch("");
        setShowEmployees(true);
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
            id: Date.now(),
            title: form.title.trim(),
            description: null,
            start_datetime: `${form.date}T${form.startTime}:00`,
            end_datetime: `${form.date}T${form.endTime}:00`,
            location: form.eventType === "in-person" ? form.location.trim() : null,
            event_type: form.eventType,
            meet_link: form.eventType === "online" ? form.meetLink.trim() || null : null,
            attendees: selectedEmployees.map(employee => employee.email),
            creator_name: "Current User"
        };

        onCreated(newEvent);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="w-full max-w-[440px] max-h-[90vh] overflow-y-auto p-5 bg-(--soft-white-light) flex flex-col gap-4 rounded-lg"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center">
                    <h2 className="text-[16px] font-semibold text-[#17212B]">
                        Create Event
                    </h2>

                    <MaskIcon
                        src="/icons/cross.svg"
                        size={20}
                        onClick={onClose}
                    />
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div className="flex flex-col gap-3">

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
                            className="grid grid-cols-2 rounded-md border border-(--soft-white-dark-hover) p-0.5"
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
                                        setCopyError("");
                                    }}
                                    className={`h-8 rounded text-xs font-medium transition-colors ${form.eventType === type
                                        ? "bg-[#DDF0FA] text-[#17212B]"
                                        : "text-[#17212B] hover:bg-[#F3F7FA]"
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
                            <div className="flex flex-col gap-2">
                                <label className="form-label">Location <span>*</span></label>
                                <div className="relative">
                                    <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                                    <InputField
                                        value={form.location}
                                        onChange={set("location")}
                                        placeholder="Enter event location"
                                        className="[&_.input-field__input]:pl-9"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <label className="form-label">Video conference URL</label>
                                <div className="flex gap-2">
                                    <InputField
                                        value={form.meetLink}
                                        onChange={set("meetLink")}
                                        placeholder="https://meet.google.com/..."
                                        className="min-w-0 flex-1"
                                        onInput={() => setCopied(false)}
                                    />
                                    <Button
                                        type="button"
                                        size="small"
                                        leftIcon={<Copy size={14} />}
                                        onClick={copyMeetLink}
                                    >
                                        {copied ? "Copied" : "Copy"}
                                    </Button>
                                </div>
                                <p className="text-[11px] text-(--info-normal)">
                                    Add a link, or{" "}
                                    <button type="button" className="underline" onClick={generateMeetLink}>
                                        generate one
                                    </button>
                                    , to share with attendees.
                                </p>
                                {copyError && <p className="text-xs text-red-600" role="alert">{copyError}</p>}
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            <label className="form-label">Attendees</label>
                            <div className="relative" ref={attendeeRef}>
                                <div className="relative">
                                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                                    <input
                                        type="text"
                                        value={employeeSearch}
                                        onFocus={() => setShowEmployees(true)}
                                        onChange={event => {
                                            setEmployeeSearch(event.target.value);
                                            setShowEmployees(true);
                                        }}
                                        placeholder="Search by name or email to add attendees"
                                        className="h-[40px] w-full rounded-md border border-(--soft-white-dark-hover) bg-white pl-9 pr-3 text-xs outline-none focus:border-(--blue-dark-normal)"
                                    />
                                </div>
                                {showEmployees && (
                                    <div className="absolute z-20 mt-1 max-h-[160px] w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                                        {employeeLoading ? (
                                            <p className="p-3 text-xs text-gray-500">Loading employees...</p>
                                        ) : employeeError ? (
                                            <p className="p-3 text-xs text-red-500">{employeeError}</p>
                                        ) : filteredEmployees.filter(employee =>
                                            !selectedEmployees.some(selected => selected.id === employee.id)
                                        ).length > 0 ? (
                                            filteredEmployees
                                                .filter(employee => !selectedEmployees.some(selected => selected.id === employee.id))
                                                .map(employee => (
                                                    <button
                                                        key={employee.id}
                                                        type="button"
                                                        onClick={() => handleSelectEmployee(employee)}
                                                        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
                                                    >
                                                        <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-[#EAF3F9] text-[10px] font-semibold text-[#235E94]">
                                                            {employee.profile_picture ? (
                                                                <img
                                                                    src={employee.profile_picture.startsWith("http")
                                                                        ? employee.profile_picture
                                                                        : `${(process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/api\/?$/, "")}/uploads/profile/photo/${employee.profile_picture}`}
                                                                    alt=""
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            ) : employee.name.split(" ").map(word => word[0]).join("").slice(0, 2)}
                                                        </span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate text-xs font-medium text-[#17212B]">{employee.name}</span>
                                                            <span className="block truncate text-[10px] text-gray-500">{employee.email}</span>
                                                        </span>
                                                    </button>
                                                ))
                                        ) : (
                                            <p className="p-3 text-xs text-gray-500">
                                                {employeeSearch ? "No employees found." : "No more employees to add."}
                                            </p>
                                        )}
                                    </div>
                                )}
                                {selectedEmployees.length > 0 && (
                                    <div className="mt-2">
                                        <p className="mb-1 text-[9px] font-medium uppercase text-[#64748B]">
                                            Selected attendees ({selectedEmployees.length})
                                        </p>
                                        <div className="space-y-1">
                                            {selectedEmployees.map(employee => (
                                                <div key={employee.id} className="flex items-center gap-2 py-1">
                                                    <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-[#EAF3F9] text-[10px] font-semibold text-[#235E94]">
                                                        {employee.profile_picture ? (
                                                            <img
                                                                src={employee.profile_picture.startsWith("http")
                                                                    ? employee.profile_picture
                                                                    : `${(process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/api\/?$/, "")}/uploads/profile/photo/${employee.profile_picture}`}
                                                                alt=""
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : employee.name.split(" ").map(word => word[0]).join("").slice(0, 2)}
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-[11px] font-medium text-[#17212B]">
                                                            {employee.name}
                                                            {user && (
                                                                employee.id === user.id ||
                                                                employee.email.toLowerCase() === user.email.toLowerCase()
                                                            ) && (
                                                                <span className="ml-1 rounded bg-[#DDF0FA] px-1 text-[9px]">You</span>
                                                            )}
                                                        </span>
                                                        <span className="block truncate text-[9px] text-gray-500">{employee.email}</span>
                                                    </span>
                                                    {employee.designation && (
                                                        <span className="text-[10px] text-gray-500">{employee.designation}</span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedEmployees(prev => prev.filter(item => item.id !== employee.id))}
                                                        className="px-1 text-gray-500 hover:text-red-500"
                                                        aria-label={`Remove ${employee.name}`}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {error && (
                            <p className="form-error-text">{error}</p>
                        )}
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="text"
                            size="small"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            variant="primary"
                            size="small"
                        >
                            Create Event
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
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="w-full max-w-[452px] bg-(--soft-white-light) rounded-lg p-8 flex flex-col gap-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col gap-2 items-center">
                    <img
                        src="/icons/success-icon.svg"
                        alt=""
                        className="h-10 w-10"
                    />

                    <p className="text-[12px] text-(--gray-dark-hover)">
                        YOU'RE ALL SET
                    </p>

                    <div className="flex flex-col gap-2 items-center text-center">
                        <h2 className="text-[20px] font-semibold text-[#17212B]">
                            Event Created
                        </h2>

                        <p className="text-[12px] text-(--gray-dark-hover)">
                            Your event{" "}
                            <span className="font-semibold">
                                {event.title}
                            </span>{" "}
                            has been successfully created for{" "}
                            {format(
                                new Date(event.start_datetime),
                                "MMMM dd, yyyy"
                            )}
                            {" at "}
                            {format(
                                new Date(event.start_datetime),
                                "hh:mm a"
                            )}.
                        </p>
                    </div>
                </div>

                <Button
                    className="w-full"
                    size="small"
                    onClick={onClose}
                >
                    Done
                </Button>
            </div>
        </div>,
        document.body
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
        const savedMeetings = meetingStorage.getAll();
        setEvents(savedMeetings);
    }, []);

    // delete meeting
    const handleDeleteMeeting = (id: number) => {
        meetingStorage.delete(id);

        setEvents(prev =>
            prev.filter(event => event.id !== id)
        );
    };

    // Event
    useEffect(() => {
        setCalendarEvents(eventStorage.getAll());
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
                title={"Calendar "}
                discription={"View and manage your schedule, meetings, company events, and important dates in one place."}
            />

            {/* Main container */}
            <div className="w-full flex flex-col gap-5">

                {/* Calendar container */}
                <div className="w-full rounded-xl space-y-7">
                    {/* Calendar action */}
                    <div className="w-full flex justify-end">
                        <div className="flex items-center gap-2">
                            {/* Date picker Dropdown */}
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsMonthPickerOpen((prev) => !prev)}
                                    className="p-3 bg-(--soft-white-light) rounded-lg flex justify-center items-center gap-2 cursor-pointer"
                                >
                                    <MaskIcon src="/icons/calendar.svg" size={16} color={"#141B34"} />

                                    <span className="text-[14px] font-medium leading-5 text-[#020617]">
                                        {format(currentDate, "MMM, yyyy")}
                                    </span>

                                    <MaskIcon src="/icons/chevron-down.svg" size={16} color="#17212B" />
                                </button>

                                {/* Dropdown calander */}
                                {isMonthPickerOpen && (
                                    <div className="absolute -right-18 mt-3 bg-(--soft-white-light) rounded-xl shadow-lg p-4 z-50">
                                        <div className="flex flex-col gap-3 w-[245px]">

                                            {/* Months Switcher */}
                                            <div className="flex items-center justify-between">
                                                {/* previous month */}
                                                <button
                                                    type="button"
                                                    onClick={handlePreviousMonth}
                                                    className="flex items-center"
                                                >
                                                    <MaskIcon src="/icons/chevron-left.svg" color="#3C4653" size={16} />
                                                </button>

                                                {/* Current month */}
                                                <span className="text-[16px] font-semibold leading-6 tracking-[0.15px]">
                                                    {format(currentDate, "MMMM yyyy")}
                                                </span>

                                                {/* Next month */}
                                                <button
                                                    type="button"
                                                    onClick={handleNextMonth}
                                                    className="flex items-center"
                                                >
                                                    <MaskIcon className="rotate-180" src="/icons/chevron-left.svg" color="#3C4653" size={16} />
                                                </button>
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                {/*Dropdown Weekday - Mon First */}
                                                <div className="grid grid-cols-7 justify-between content-between">

                                                    {DROPDOWN_WEEKDAYS.map((day) => (
                                                        <div key={day} className="text-[14px] font-medium leading-5 text-[#3C4653]">
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
                                                                className={`h-8 w-8 text-[14px] font-medium leading-5 flex justify-center items-center rounded-full  ${isToday
                                                                    ? "border border-[#1E5C8B]"
                                                                    : " hover:bg-[#EBF5FB]"
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
                                leftIcon={<MaskIcon src="/icons/plus.svg" size={18} />}
                                onClick={() => handleScheduleClick()}
                            >
                                Schedule Meeting
                            </Button>
                        </div>
                    </div>

                    {/*Main Calendar Grid */}
                    <div className="w-full flex flex-col gap-4">
                        {/* Weekday Headers */}
                        <div className="grid grid-cols-7">
                            {WEEKDAYS.map((day) => (
                                <div
                                    key={day}
                                    className="text-center text-[16px] font-medium leading-6 text-[#17212B]"
                                >
                                    {day}
                                </div>
                            ))}
                        </div>


                        {/* Main Calendar Days */}
                        <div className="grid grid-cols-7 gap-1">

                            {/* Previous month dates */}
                            {previousMonthDays.map((day, index) => (
                                <div
                                    key={`prev-${index}`}
                                    className="h-[150px] bg-[#E8E9EA80] rounded-sm p-2"
                                >
                                    <div className="flex justify-end">
                                        <span className="text-[12px] leading-4 text-[#B7BABD]">
                                            {day}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {/* Current month dates */}
                            {days.map((day) => {
                                const dateKey = format(day, "yyyy-MM-dd")

                                const dayEvents = events.filter(
                                    event => event.start_datetime.slice(0, 10) === dateKey
                                );

                                const dayCalendarEvents = calendarEvents.filter(
                                    event => event.start_datetime.slice(0, 10) === dateKey
                                );
                                const dayItems = [
                                    ...dayEvents.map(item => ({ type: "meeting" as const, item })),
                                    ...dayCalendarEvents.map(item => ({ type: "event" as const, item }))
                                ].sort((a, b) =>
                                    a.item.start_datetime.localeCompare(b.item.start_datetime)
                                );
                                const visibleDayItems = dayItems.slice(0, 2);
                                const hiddenDayItemCount = dayItems.length - visibleDayItems.length;

                                return (
                                    <div
                                        key={dateKey}
                                        className="h-[150px] p-2 flex flex-col rounded-sm gap-1 bg-white"
                                    >
                                        {/* Day Number and Add Button */}
                                        <div className="flex items-center justify-between">
                                            <button
                                                type="button"
                                                onClick={() => handleCreateEventClick(dateKey)}
                                                className="p-0.5 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                                                aria-label={`Create event on ${dateKey}`}
                                            >
                                                <MaskIcon
                                                    src="/icons/plus.svg"
                                                    size={14}
                                                    color="#334155"
                                                />
                                            </button>

                                            <span className="text-[12px] leading-4">
                                                {format(day, "dd")}
                                            </span>
                                        </div>

                                        {/* Meetings and Calendar Events */}
                                        <div className="flex flex-col gap-1 overflow-hidden">
                                            {visibleDayItems.map(({ type, item }, index) => {
                                                const isMeeting = type === "meeting";
                                                return (
                                                    <div
                                                        key={`${type}-${item.id}`}
                                                        className={`rounded-md px-2 py-1 text-[11px] leading-tight cursor-pointer ${isMeeting
                                                            ? index % 2 === 0
                                                                ? "bg-[#E5E5E5] text-[#0F172A]"
                                                                : "bg-[#DDF0FA] text-[#0F172A]"
                                                            : "bg-[#FFF0D9] text-[#7A4B00]"
                                                            }`}
                                                        onClick={() => console.log(
                                                            isMeeting ? "Meeting details:" : "Event details:",
                                                            item
                                                        )}
                                                    >
                                                        <div className={`flex items-center gap-1 text-[11px] font-medium ${isMeeting ? "text-[#2D343F]" : ""
                                                            }`}>
                                                            <MaskIcon
                                                                src="/icons/clock.svg"
                                                                size={12}
                                                                color={isMeeting ? "#2D343F" : "#7A4B00"}
                                                            />
                                                            <span>
                                                                {format(new Date(item.start_datetime), "hh:mm a")}
                                                                {" - "}
                                                                {format(new Date(item.end_datetime), "hh:mm a")}
                                                            </span>
                                                        </div>
                                                        <div className="truncate text-[12px] font-medium">
                                                            {item.title}
                                                        </div>
                                                        <span className={`text-[10px] ${isMeeting ? "text-[#235E94]" : ""
                                                            }`}>
                                                            {isMeeting ? "Meeting" : "Event"}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                            {hiddenDayItemCount > 0 && (
                                                <span className="px-2 text-[10px] font-medium text-[#475569]">
                                                    +{hiddenDayItemCount} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}

                            {/* Next month dates */}
                            {nextMonthDays.map((day, index) => (
                                <div
                                    key={`next-${index}`}
                                    className="h-[150px] bg-[#E8E9EA80] rounded-sm p-2"
                                >
                                    <div className="flex justify-end">
                                        <span className="text-[12px] leading-4 text-[#B7BABD]">
                                            {day}
                                        </span>
                                    </div>
                                </div>
                            ))}

                        </div>

                    </div>

                </div>


                {/* Holidays & events */}
                <div>
                    <h2 className="text-lg font-semibold text-[#020617]">Holiday</h2>
                </div>
            </div>
            {/* Popup schedule meeting */}
            {showModal && (
                <ScheduleModal
                    defaultDate={modalDate}
                    onClose={() => setShowModal(false)}
                    onCreated={(meeting) => {
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
                    onCreated={(event) => {
                        eventStorage.add(event);

                        setCalendarEvents(prev => [...prev, event]);

                        setShowEventModal(false);

                        setSuccessEvent(event);
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

