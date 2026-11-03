'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button/Button';
import {
    TwoFactorBackupCodes,
    TwoFactorVerify,
    type TwoFactorSetupData,
} from '@/components/profile/TwoFactor';
import { api } from '@/lib/api';

type SetupStep = 'intro' | 'scan' | 'backup' | 'complete';

interface TwoFactorStatusResponse {
    enabled?: boolean;
    twoFactorEnabled?: boolean;
    two_factor_enabled?: boolean;
    is_enabled?: boolean;
}

interface TwoFactorSetupResponse {
    secret?: string;
    base32?: string;
    otpauthUrl?: string;
    otpauth_url?: string;
    qrDataUrl?: string;
    qr_data_url?: string;
    qrCode?: string;
    qr_code?: string;
}

interface TwoFactorEnableResponse {
    backupCodes?: unknown[];
    backup_codes?: unknown[];
    codes?: unknown[];
}

function isEnabled(data: TwoFactorStatusResponse) {
    return Boolean(data.enabled ?? data.twoFactorEnabled ?? data.two_factor_enabled ?? data.is_enabled);
}

function normalizeSetup(data: TwoFactorSetupResponse): TwoFactorSetupData {
    return {
        secret: data.secret ?? data.base32 ?? '',
        otpauthUrl: data.otpauthUrl ?? data.otpauth_url ?? '',
        qrDataUrl: data.qrDataUrl ?? data.qr_data_url ?? data.qrCode ?? data.qr_code ?? '',
    };
}

function readBackupCodes(data: TwoFactorEnableResponse) {
    const codes = data.backupCodes ?? data.backup_codes ?? data.codes;
    return Array.isArray(codes) ? codes.map(String) : [];
}

export default function SetupTwoFactorAuthPage() {
    const router = useRouter();
    const [step, setStep] = useState<SetupStep>('intro');
    const [enabled, setEnabled] = useState(false);
    const [statusLoading, setStatusLoading] = useState(true);
    const [statusError, setStatusError] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [setupData, setSetupData] = useState<TwoFactorSetupData | null>(null);
    const [otp, setOtp] = useState('');
    const [backupCodes, setBackupCodes] = useState<string[]>([]);

    async function loadStatus() {
        setStatusLoading(true);
        setStatusError('');
        try {
            const status = await api.get<TwoFactorStatusResponse>('/auth/2fa/status');
            setEnabled(isEnabled(status));
        } catch (err) {
            setStatusError(err instanceof Error && err.message ? err.message : 'Unable to check two-factor authentication status.');
        } finally {
            setStatusLoading(false);
        }
    }

    useEffect(() => {
        void loadStatus();
        // Load the current account status once when this page opens.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function startSetup() {
        if (enabled || loading) return;
        setLoading(true);
        setError('');
        setOtp('');
        try {
            const response = await api.post<TwoFactorSetupResponse>('/auth/2fa/setup', {});
            const setup = normalizeSetup(response);
            if (!setup.qrDataUrl && !setup.secret) {
                throw new Error('The server returned an empty 2FA setup response.');
            }
            setSetupData(setup);
            setStep('scan');
        } catch (err) {
            setError(err instanceof Error && err.message ? err.message : 'Unable to start 2FA setup. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    async function confirmSetup() {
        if (!/^\d{6}$/.test(otp)) {
            setError('Enter a valid 6-digit authentication code.');
            return;
        }
        if (!setupData || loading) return;

        setLoading(true);
        setError('');
        try {
            const response = await api.post<TwoFactorEnableResponse>('/auth/2fa/enable', {
                code: otp,
                secret: setupData.secret,
            });
            setEnabled(true);
            setSetupData(null);
            setOtp('');
            const codes = readBackupCodes(response);
            if (codes.length) {
                setBackupCodes(codes);
                setStep('backup');
            } else {
                setStep('complete');
            }
            await loadStatus();
        } catch (err) {
            setError(err instanceof Error && err.message ? err.message : 'Invalid code or unable to enable 2FA.');
        } finally {
            setLoading(false);
        }
    }

    function cancelSetup() {
        if (loading) return;
        setStep('intro');
        setSetupData(null);
        setOtp('');
        setError('');
    }

    function finishSetup() {
        router.push('/welcome');
    }

    return (
        <main className="flex  min-h-screen w-full items-center justify-center  px-4 lg:p-0">
            <div className="flex  w-full lg:w-[560px] flex-col items-center p-5 lg:p-6 gap-7 lg:gap-11 ">
                <img
                    className=" h-[16px] w-[89px] lg:h-[20px] lg:w-[111px]"
                    src="/logos/gitgi-hr-logo.svg"
                    alt="GITGI HR"
                />
                <section className="flex w-full items-center justify-center lg:gap-6 ">
                    <div className="w-full ">
                        {statusLoading ? (
                            <p className="text-center text-[16px] text-(--gray-dark-active)" role="status">
                                Checking your two-factor authentication status...
                            </p>
                        ) : statusError ? (
                            <div className="flex flex-col items-center gap-4 text-center ">
                                <p className="text-[16px] text-(--error-normal)" role="alert">{statusError}</p>
                                <Button type="button" variant="primary" onClick={() => void loadStatus()}>
                                    Try again
                                </Button>
                            </div>
                        ) : enabled ? (
                            <div className="flex flex-col items-center gap-6 text-center ">
                                <div className="space-y-2 ">
                                    <h1 className="text-[28px] font-semibold text-(--neutral-normal)">
                                        Two-factor authentication is on
                                    </h1>
                                    <p className="text-[16px] text-(--gray-dark-active)">
                                        Your account is protected with an authenticator app.
                                    </p>
                                </div>
                                <Button type="button" variant="primary" onClick={finishSetup}>
                                    Go to my account
                                </Button>
                            </div>
                        ) : step === 'intro' ? (
                            <div className="mx-auto flex w-full  flex-col items-center text-center gap-4 lg:gap-5 ">
                                <div className=" space-y-3">
                                    <h1 className="text-[22px]  font-semibold  text-[#17212B]">
                                        Set up two-factor authentication (2FA) for your account
                                    </h1>
                                    <p className="mt-2 text-[14px] lg:text-[16px] leading-5 lg:leading-06 text-[#2D343F]">
                                        Protect sensitive information and secure your account by using an authenticator app to log in to your account.
                                    </p>
                                </div>
                                {error && (
                                    <p className="mt-3 text-[12px] text-(--error-normal)" role="alert">{error}</p>
                                )}
                                <div className=' w-[252px] flex flex-col items-center gap-4 lg:gap-5 '>

                                    <Button
                                        className='w-full'
                                        type="button"
                                        variant="primary"
                                        size="medium"
                                        onClick={startSetup}
                                        disabled={loading}
                                    >
                                        {loading ? 'Setting up...' : 'Setup 2FA'}
                                    </Button>

                                    <Button
                                        variant='text'
                                        type="button"
                                        size="small"
                                        onClick={finishSetup}
                                        disabled={loading}
                                        className="w-full text-(--blue-dark-normal)!"
                                    >
                                        Setup later, go to my account
                                    </Button>
                                </div>
                            </div>
                        ) : step === 'scan' && setupData ? (
                            <TwoFactorVerify
                                setupData={setupData}
                                otp={otp}
                                onOtpChange={(value) => { setOtp(value); setError(''); }}
                                loading={loading}
                                error={error}
                                onConfirm={confirmSetup}
                                onCancel={cancelSetup}
                            />
                        ) : step === 'backup' ? (
                            <TwoFactorBackupCodes codes={backupCodes} onDone={finishSetup} />
                        ) : (
                            <div className="flex flex-col items-center gap-6 text-center">
                                <div className="space-y-2">
                                    <h1 className="text-[28px] font-semibold text-(--neutral-normal)">
                                        Two-factor authentication enabled
                                    </h1>
                                    <p className="text-[16px] text-(--gray-dark-active)">
                                        Your account is now protected. You can manage this setting from your profile.
                                    </p>
                                </div>
                                <Button type="button" variant="primary" onClick={finishSetup}>
                                    Return to profile
                                </Button>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}
