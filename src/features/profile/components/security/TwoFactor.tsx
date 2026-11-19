'use client';
import { useState } from 'react';
import Button from '@/components/Button/Button';
import InputField from '@/components/InputField/InputField';

export interface TwoFactorSetupData {
    secret: string;
    otpauthUrl: string;
    qrDataUrl: string;
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────

export function TwoFactorModal({ children, onClose, dismissible }: {
    children: React.ReactNode;
    onClose: () => void;
    dismissible: boolean;
}) {
    return (
        <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4"
            onClick={() => dismissible && onClose()}
        >
            <div
                role="dialog"
                aria-modal="true"
                className="relative w-full max-w-[560px] rounded-lg bg-(--soft-white-light) shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {dismissible && (
                    <button
                        type="button"
                        aria-label="Close"
                        onClick={onClose}
                        className="absolute right-4 top-4 text-[20px] leading-none text-(--gray-dark)"
                    >
                        ×
                    </button>
                )}
                {children}
            </div>
        </div>
    );
}

function TwoFactorError({ error }: { error: string }) {
    if (!error) return null;
    return <p role="alert" className="text-[14px] font-medium text-[#DC2626]">{error}</p>;
}

// ── Step 1: intro screen ──────────────────────────────────────────────────────

export function TwoFactorSetup({ loading, error, onSetup, onLater }: {
    loading: boolean;
    error: string;
    onSetup: () => void;
    onLater: () => void;
}) {
    return (
        <div className='flex flex-col gap-6 items-center p-6 text-center'>
            <div className='space-y-3'>
                <h1 className='text-[28px] font-semibold text-(--neutral-normal) leading-9'>Set up two-factor authentication (2FA) for your account</h1>
                <p className='text-[18px] font-medium text-(--gray-dark-active) leading-7'>
                    Protect sensitive information and secure your account by using an authenticator app to log in to your account.
                </p>
            </div>
            <TwoFactorError error={error} />
            <div className='flex flex-col w-[252px] gap-y-5'>
                <Button
                    type="button"
                    variant='primary'
                    className="w-full"
                    onClick={onSetup}
                    disabled={loading}
                >
                    {loading ? 'Setting up...' : 'Setup 2FA'}
                </Button>
                <button type="button" onClick={onLater} disabled={loading}>
                    <span className="w-full text-[18px] font-medium leading-7 text-[#235E94]">Setup later, go to my account</span>
                </button>
            </div>
        </div>
    );
}

// ── Step 2: scan QR code + confirm with 6-digit code ─────────────────────────

export function TwoFactorVerify({ setupData, otp, onOtpChange, loading, error, onConfirm, onCancel }: {
    setupData: TwoFactorSetupData;
    otp: string;
    onOtpChange: (v: string) => void;
    loading: boolean;
    error: string;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    const [copied, setCopied] = useState(false);

    async function copySecret() {
        try {
            await navigator.clipboard.writeText(setupData.secret);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* clipboard blocked */ }
    }

    return (
        <form
            className='flex flex-col gap-6 items-center p-6 text-center'
            onSubmit={(e) => { e.preventDefault(); onConfirm(); }}
        >
            <div className='space-y-2'>
                <h1 className='text-[24px] font-semibold text-(--neutral-normal) leading-8'>Scan the QR code</h1>
                <p className='text-[16px] font-medium text-(--gray-dark-active) leading-6'>
                    Open Google Authenticator, Microsoft Authenticator or Authy and scan this code,
                    then enter the 6-digit code it shows.
                </p>
            </div>

            {setupData.qrDataUrl && (
                <img
                    src={setupData.qrDataUrl}
                    alt="2FA QR code"
                    width={200}
                    height={200}
                    className="rounded-lg border border-(--soft-white-normal) bg-white p-2"
                />
            )}

            {setupData.secret && (
                <div className="flex flex-col items-center gap-1">
                    <span className="text-[14px] font-medium text-(--soft-white-dark-active)">Can&apos;t scan? Enter this key manually</span>
                    <div className="flex items-center gap-2">
                        <code className="rounded bg-(--soft-white-normal) px-2 py-1 text-[14px] tracking-wider break-all">{setupData.secret}</code>
                        <button type="button" onClick={copySecret} className="text-[14px] font-medium text-(--blue-sky)">
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                    </div>
                </div>
            )}

            <div className="flex flex-col  gap-2 w-[252px] ">
                <InputField
                    autoFocus
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="000000"
                    aria-label="6-digit authentication code"
                    value={otp}
                    onChange={(e) => onOtpChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full tracking-[0.8em]  "
                />
                <TwoFactorError error={error} />
            </div>

            <div className='flex flex-col w-[252px] gap-y-3'>
                <Button type="submit" variant='primary' className="w-full" disabled={loading || otp.length !== 6}>
                    {loading ? 'Verifying...' : 'Verify & Enable'}
                </Button>
                <button type="button" onClick={onCancel} disabled={loading}
                    className="text-[16px] font-medium leading-6 text-(--gray-dark)">
                    Cancel
                </button>
            </div>
        </form>
    );
}

// ── Step 3: one-time backup codes ─────────────────────────────────────────────

export function TwoFactorBackupCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
    const [copied, setCopied] = useState(false);
    const text = codes.join('\n');

    async function copyAll() {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* clipboard blocked */ }
    }

    function download() {
        const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = 'backup-codes.txt';
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className='flex flex-col gap-6 items-center p-6 text-center'>
            <div className='space-y-2'>
                <h1 className='text-[24px] font-semibold text-(--neutral-normal) leading-8'>Save your backup codes</h1>
                <p className='text-[16px] font-medium text-(--gray-dark-active) leading-6'>
                    2FA is now on. Each code works once if you lose access to your authenticator app.
                    Store them somewhere safe; you won&apos;t see them again.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-2 rounded-lg border border-(--soft-white-normal) bg-(--soft-white-normal) px-6 py-4">
                {codes.map((c) => (
                    <code key={c} className="text-[16px] tracking-wider text-(--neutral-normal)">{c}</code>
                ))}
            </div>

            <div className="flex gap-4">
                <button type="button" onClick={copyAll} className="text-[14px] font-medium text-(--blue-sky)">
                    {copied ? 'Copied' : 'Copy codes'}
                </button>
                <button type="button" onClick={download} className="text-[14px] font-medium text-(--blue-sky)">
                    Download .txt
                </button>
            </div>

            <div className='w-[252px]'>
                <Button type="button" variant='primary' className="w-full" onClick={onDone}>
                    I&apos;ve saved them
                </Button>
            </div>
        </div>
    );
}

// ── Disable: confirm with password + current authenticator code ───────────────

export function TwoFactorDisable({ password, onPasswordChange, otp, onOtpChange, loading, error, onConfirm, onCancel }: {
    password: string;
    onPasswordChange: (v: string) => void;
    otp: string;
    onOtpChange: (v: string) => void;
    loading: boolean;
    error: string;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <form
            className='flex flex-col gap-6 items-center p-6 text-center'
            onSubmit={(e) => { e.preventDefault(); onConfirm(); }}
        >
            <div className='space-y-2'>
                <h1 className='text-[24px] font-semibold text-(--neutral-normal) leading-8'>Turn off two-factor authentication?</h1>
                <p className='text-[16px] font-medium text-(--gray-dark-active) leading-6'>
                    Your account will be less secure. Enter your password and the 6-digit code from your authenticator app to confirm.
                </p>
            </div>

            <div className="flex flex-col items-center gap-3 w-[252px]">
                <InputField
                    autoFocus
                    type="password"
                    autoComplete="current-password"
                    placeholder="Password"
                    aria-label="Account password"
                    value={password}
                    showPasswordToggle={true}
                    onChange={(e) => onPasswordChange(e.target.value)}
                    className="w-full  "
                />
                <InputField
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="000000"
                    aria-label="6-digit authentication code"
                    value={otp}
                    onChange={(e) => onOtpChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full text-2xl! tracking-[0.7em]!  "
                />
                <TwoFactorError error={error} />
            </div>

            <div className='flex flex-col w-[252px] gap-y-3'>
                <Button type="submit" variant='primary' className="w-full" disabled={loading || !password || otp.length !== 6}>
                    {loading ? 'Disabling...' : 'Turn off 2FA'}
                </Button>
                <button type="button" onClick={onCancel} disabled={loading}
                    className="text-[16px] font-medium leading-6 text-(--gray-dark)">
                    Keep 2FA on
                </button>
            </div>
        </form>
    );
}


