'use client';

import { useEffect, useState } from 'react';

export interface LoginHistory {
    id: number;
    ip_address: string;
    user_agent: string;
    created_at: string;
    // Extra fields returned by /auth/admin/login-history
    employee_id?: number;
    employee_name?: string;
    email?: string;
    success?: boolean;
    failure_reason?: string | null;
}

interface LoginHistoryModalProps {
    history: LoginHistory[];
    onClose: () => void;
    isAdmin?: boolean;
    pageSize?: number;
}

// Turn the raw User-Agent into "Mobile Chrome on Android", "Edge on Windows", etc.
// Order matters: Edge and Opera also contain "Chrome", and Chrome contains "Safari".
function parseDevice(ua: string): { label: string; mobile: boolean } {
    if (!ua) return { label: 'Unknown device', mobile: false };

    const browser =
        /Edg(A|iOS)?\//.test(ua) ? 'Edge' :
            /OPR\//.test(ua) ? 'Opera' :
                /(Firefox|FxiOS)\//.test(ua) ? 'Firefox' :
                    /(Chrome|CriOS)\//.test(ua) ? 'Chrome' :
                        /Safari\//.test(ua) ? 'Safari' :
                            /PostmanRuntime/.test(ua) ? 'Postman' : 'Unknown browser';

    const os =
        /Windows/.test(ua) ? 'Windows' :
            /Android/.test(ua) ? 'Android' :
                /iPhone|iPad|iPod/.test(ua) ? 'iOS' :
                    /Mac OS X/.test(ua) ? 'macOS' :
                        /Linux/.test(ua) ? 'Linux' : 'Unknown OS';

    const mobile = /Mobile|Android|iPhone|iPod/.test(ua);
    const prefix = mobile && browser !== 'Unknown browser' ? 'Mobile ' : '';

    return { label: `${prefix}${browser} on ${os}`, mobile };
}

// Make local/IPv6-mapped addresses readable.
function displayIp(ip: string) {
    if (!ip) return '—';
    if (ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1') return 'Localhost';
    if (ip.startsWith('::ffff:')) return ip.slice(7);
    return ip;
}

// "15 Oct 2026, 16:36"
function formatDate(value: string) {
    return new Date(value).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

function PhoneIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="7" y="2.5" width="10" height="19" rx="2" fill="currentColor" />
            <circle cx="12" cy="18" r="1" fill="#fff" />
        </svg>
    );
}

function MonitorIcon() {
    return (
        <svg
            width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        >
            <rect x="3" y="4" width="18" height="12" rx="2" />
            <path d="M12 16v4M8 20h8" />
        </svg>
    );
}

function StatusBadge({ success, reason }: { success?: boolean; reason?: string | null }) {
    // Older rows may not have `success`; treat missing as a successful login.
    const ok = success !== false;
    return (
        <span
            title={!ok && reason ? reason : undefined}
            className={
                'shrink-0 rounded-xl border px-3 py-1.5 text-[14px] font-medium ' +
                (ok
                    ? 'border-(--success-light-active) bg-(--success-light) text-(--success-normal-active)'
                    : 'border-(--error-light-hover) bg-(--error-light) text-(--error-normal)')
            }
        >
            {ok ? 'Success' : 'Failed'}
        </span>
    );
}

export default function LoginHistoryModal({
    history,
    onClose,
    isAdmin = false,
    pageSize = 5,
}: LoginHistoryModalProps) {
    const [page, setPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(history.length / pageSize));

    // Go back to page 1 when new data arrives.
    useEffect(() => setPage(1), [history]);

    const current = Math.min(page, totalPages);
    const rows = history.slice((current - 1) * pageSize, current * pageSize);

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div
                className="flex max-h-[85vh] w-full max-w-[560px] flex-col rounded-2xl bg-(--soft-white-light) p-5 sm:p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-[20px] font-semibold text-(--neutral-normal)">Login History</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="text-[24px] leading-none text-(--gray-darker)"
                    >
                        ×
                    </button>
                </div>

                <ul className="flex-1 space-y-3 overflow-y-auto">
                    {rows.length === 0 && (
                        <li className="rounded-2xl border border-(--neutral-light-hover) p-6 text-center text-[14px] text-(--soft-white-dark-active)">
                            No logins recorded yet.
                        </li>
                    )}

                    {rows.map((item) => {
                        const { label, mobile } = parseDevice(item.user_agent);
                        return (
                            <li
                                key={item.id}
                                className="flex items-center gap-4 rounded-2xl border border-(--neutral-light-hover) bg-(--soft-white-light) px-4 py-4 sm:px-5"
                            >
                                <span className={'shrink-0 ' + (mobile ? 'text-black' : 'text-(--gray-darker)')}>
                                    {mobile ? <PhoneIcon /> : <MonitorIcon />}
                                </span>

                                <div className="min-w-0 flex-1">
                                    <p
                                        className="truncate text-[16px] font-medium text-(--neutral-normal)"
                                        title={item.user_agent}
                                    >
                                        {label}
                                    </p>

                                    {isAdmin && (item.employee_name || item.email) && (
                                        <p className="truncate text-[13px] text-(--gray-darker)">
                                            {item.employee_name ?? item.email}
                                        </p>
                                    )}

                                    <p className="text-[14px] text-(--soft-white-dark-active)">
                                        <span className="break-all">{displayIp(item.ip_address)}</span>
                                        {' · '}
                                        <span className="whitespace-nowrap">{formatDate(item.created_at)}</span>
                                    </p>
                                </div>

                                <StatusBadge success={item.success} reason={item.failure_reason} />
                            </li>
                        );
                    })}
                </ul>

                <div className="mt-5 flex items-center justify-between">
                    <span className="text-[15px] text-(--soft-white-dark-active)">
                        Page {current} of {totalPages}
                    </span>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => setPage(current - 1)}
                            disabled={current === 1}
                            className="rounded-xl border-2 border-(--info-normal) px-4 py-2 text-[15px] text-(--info-normal-hover) disabled:border-(--info-light-hover) disabled:text-(--info-light-active)"
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            onClick={() => setPage(current + 1)}
                            disabled={current === totalPages}
                            className="rounded-xl border-2 border-(--info-normal-hover) px-4 py-2 text-[15px] text-(--info-normal-active) disabled:border-(--info-light-hover) disabled:text-(--info-light-active)"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}