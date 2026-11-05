'use client';

import { parseDevice, displayIp, formatDate, PhoneIcon, MonitorIcon } from './deviceFormat';

export interface TrustedDevice {
    id: number;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
    last_used_at: string;
    expires_at: string;
}

interface TrustedDevicesModalProps {
    devices: TrustedDevice[];
    loading?: boolean;
    revokingId?: number | null;
    onClose: () => void;
    onRevoke: (deviceId: number) => void;
    onRevokeAll: () => void;
}

export default function TrustedDevicesModal({
    devices,
    loading = false,
    revokingId = null,
    onClose,
    onRevoke,
    onRevokeAll,
}: TrustedDevicesModalProps) {
    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div
                className="flex max-h-[85vh] w-full max-w-[560px] flex-col rounded-2xl bg-(--soft-white-light) p-5 sm:p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-[20px] font-semibold text-(--neutral-normal)">Trusted Devices</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="text-[24px] leading-none text-(--gray-darker)"
                    >
                        ×
                    </button>
                </div>

                <p className="mb-4 text-[14px] text-(--soft-white-dark-active)">
                    These devices skip the authenticator code for 30 days after "Remember this device" was checked at login. Revoke any you don't recognize.
                </p>

                <ul className="flex-1 space-y-3 overflow-y-auto">
                    {loading && (
                        <li className="rounded-2xl border border-(--neutral-light-hover) p-6 text-center text-[14px] text-(--soft-white-dark-active)">
                            Loading…
                        </li>
                    )}

                    {!loading && devices.length === 0 && (
                        <li className="rounded-2xl border border-(--neutral-light-hover) p-6 text-center text-[14px] text-(--soft-white-dark-active)">
                            No trusted devices.
                        </li>
                    )}

                    {!loading && devices.map((device) => {
                        const { label, mobile } = parseDevice(device.user_agent ?? '');
                        const revoking = revokingId === device.id;
                        return (
                            <li
                                key={device.id}
                                className="flex items-center gap-4 rounded-2xl border border-(--neutral-light-hover) bg-(--soft-white-light) px-4 py-4 sm:px-5"
                            >
                                <span className={'shrink-0 ' + (mobile ? 'text-black' : 'text-(--gray-darker)')}>
                                    {mobile ? <PhoneIcon /> : <MonitorIcon />}
                                </span>

                                <div className="min-w-0 flex-1">
                                    <p
                                        className="truncate text-[16px] font-medium text-(--neutral-normal)"
                                        title={device.user_agent ?? undefined}
                                    >
                                        {label}
                                    </p>
                                    <p className="text-[14px] text-(--soft-white-dark-active)">
                                        <span className="break-all">{displayIp(device.ip_address)}</span>
                                        {' · '}
                                        <span className="whitespace-nowrap">Last used {formatDate(device.last_used_at)}</span>
                                    </p>
                                    <p className="text-[13px] text-(--soft-white-dark-active)">
                                        Trusted until {formatDate(device.expires_at)}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    disabled={revoking}
                                    onClick={() => onRevoke(device.id)}
                                    className="shrink-0 rounded-xl border border-(--error-light-hover) bg-(--error-light) px-3 py-1.5 text-[14px] font-medium text-(--error-normal) disabled:opacity-60"
                                >
                                    {revoking ? 'Revoking…' : 'Revoke'}
                                </button>
                            </li>
                        );
                    })}
                </ul>

                {!loading && devices.length > 0 && (
                    <div className="mt-5 flex justify-end">
                        <button
                            type="button"
                            onClick={onRevokeAll}
                            className="rounded-xl border-2 border-(--error-light-hover) px-4 py-2 text-[15px] font-medium text-(--error-normal)"
                        >
                            Revoke All
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
