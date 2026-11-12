'use client';

import { useEffect, useState } from 'react';
import { parseDevice, displayIp, formatDate, PhoneIcon, MonitorIcon } from './deviceFormat';

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
    loading?: boolean;
    // Whether the caller is allowed to switch to the company-wide list at all.
    canViewAll?: boolean;
    view?: 'own' | 'all';
    onViewChange?: (view: 'own' | 'all') => void;
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
    loading = false,
    canViewAll = false,
    view = 'own',
    onViewChange,
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

                {canViewAll && (
                    <div className="mb-4 flex gap-2">
                        <button
                            type="button"
                            disabled={loading}
                            onClick={() => onViewChange?.('own')}
                            className={
                                'rounded-xl px-4 py-2 text-[14px] font-medium disabled:opacity-60 ' +
                                (view === 'own'
                                    ? 'bg-(--info-normal) text-white'
                                    : 'border border-(--neutral-light-hover) text-(--gray-darker)')
                            }
                        >
                            My Sessions
                        </button>
                        <button
                            type="button"
                            disabled={loading}
                            onClick={() => onViewChange?.('all')}
                            className={
                                'rounded-xl px-4 py-2 text-[14px] font-medium disabled:opacity-60 ' +
                                (view === 'all'
                                    ? 'bg-(--info-normal) text-white'
                                    : 'border border-(--neutral-light-hover) text-(--gray-darker)')
                            }
                        >
                            All Employees
                        </button>
                    </div>
                )}

                <ul className="flex-1 space-y-3 overflow-y-auto">
                    {loading && (
                        <li className="rounded-2xl border border-(--neutral-light-hover) p-6 text-center text-[14px] text-(--soft-white-dark-active)">
                            Loading…
                        </li>
                    )}

                    {!loading && rows.length === 0 && (
                        <li className="rounded-2xl border border-(--neutral-light-hover) p-6 text-center text-[14px] text-(--soft-white-dark-active)">
                            No logins recorded yet.
                        </li>
                    )}

                    {!loading && rows.map((item) => {
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