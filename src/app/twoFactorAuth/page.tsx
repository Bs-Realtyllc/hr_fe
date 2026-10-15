'use client'
import Button from '@/components/Button/Button'
import InputField from '@/components/InputField/InputField'
import OtpInput from '@/components/OtpInput'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import type { AuthUser } from '@/lib/auth'
import { clearTwoFactorChallenge, readTwoFactorChallenge, type TwoFactorChallenge } from '@/lib/twoFactor'

// Where to send people with no pending 2FA login (direct visit, expired token).
const LOGIN_ROUTE = '/login'
const API = process.env.NEXT_PUBLIC_API_URL

// app    -> code from the authenticator app (POST /auth/2fa/verify)
// backup -> one-time backup code            (POST /auth/2fa/backup/verify)
// email  -> code emailed as a fallback      (POST /auth/2fa/email-otp/request + /verify)
type Mode = 'app' | 'backup' | 'email'

const COPY: Record<Mode, { title: string; subtitle: string; placeholder: string }> = {
    app: {
        title: 'Enter the 6-digit code from your authenticator app',
        subtitle: 'This helps us keep your account secure and make sure it’s really you logging in.',
        placeholder: '000000',
    },
    backup: {
        title: 'Enter one of your backup codes',
        subtitle: 'Use a backup code you saved when you turned on 2FA. Each code works only once.',
        placeholder: 'XXXX-XXXX',
    },
    email: {
        title: 'Enter the 6-digit code we emailed you',
        subtitle: 'Check your inbox for a one-time verification code.',
        placeholder: '000000',
    },
}

const VERIFY_PATH: Record<Mode, string> = {
    app: '/auth/2fa/verify',
    backup: '/auth/2fa/backup/verify',
    email: '/auth/2fa/email-otp/verify',
}

async function postJson(path: string, body: unknown) {
    const res = await fetch(`${API}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error ?? data.message ?? 'Verification failed')
    return data
}

const TwoFactorAuthPage = () => {
    const router = useRouter()
    const { login } = useAuth()

    const [challenge, setChallenge] = useState<TwoFactorChallenge | null>(null)
    const [mode, setMode] = useState<Mode>('app')
    const [otp, setOtp] = useState('')
    const [loading, setLoading] = useState(false)
    const [sendingEmail, setSendingEmail] = useState(false)
    const [resendIn, setResendIn] = useState(0)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    // The login page saves the temp token before sending the user here.
    useEffect(() => {
        const c = readTwoFactorChallenge()
        if (!c) {
            router.replace(LOGIN_ROUTE)
            return
        }
        setChallenge(c)
    }, [router])

    // Countdown for "Resend code".
    useEffect(() => {
        if (resendIn <= 0) return
        const t = setTimeout(() => setResendIn(s => s - 1), 1000)
        return () => clearTimeout(t)
    }, [resendIn])

    const isValid = mode === 'backup' ? otp.trim().length >= 6 : /^\d{6}$/.test(otp)

    function switchMode(next: Mode) {
        setMode(next)
        setOtp('')
        setError('')
        setSuccess('')
        if (next === 'email') sendEmailCode()
    }

    async function sendEmailCode() {
        if (!challenge || sendingEmail) return
        setSendingEmail(true)
        setError('')
        try {
            await postJson('/auth/2fa/email-otp/request', { tempToken: challenge.tempToken })
            setSuccess('We sent a code to your email.')
            setResendIn(60)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not send the email code.')
        } finally {
            setSendingEmail(false)
        }
    }

    async function handleVerify(e?: React.FormEvent, codeOverride?: string) {
        e?.preventDefault()
        const code = (codeOverride ?? otp).trim()
        if (!challenge || loading) return
        const valid = mode === 'backup' ? code.length >= 6 : /^\d{6}$/.test(code)
        if (!valid) {
            setError(mode === 'backup' ? 'Enter a valid backup code.' : 'Enter the 6-digit code.')
            return
        }

        setLoading(true)
        setError('')
        setSuccess('')

        try {
            const data = await postJson(VERIFY_PATH[mode], {
                tempToken: challenge.tempToken,
                code,
            })
            clearTwoFactorChallenge()
            setSuccess('Verified. Signing you in…')
            login(data.token as string, data.user as AuthUser)
            router.replace('/welcome')
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Verification failed'
            setError(message)
            // An expired temp token can't be retried; the user has to sign in again.
            if (/expired|invalid.*token/i.test(message)) {
                clearTwoFactorChallenge()
                setTimeout(() => router.replace(LOGIN_ROUTE), 1500)
            }
        } finally {
            setLoading(false)
        }
    }

    function backToSignIn() {
        clearTwoFactorChallenge()
        router.replace(LOGIN_ROUTE)
    }

    if (!challenge) return null

    const copy = COPY[mode]

    return (
        <div className='flex justify-center items-center h-full w-full min-h-screen'>
            <div className='flex flex-col w-[591px] gap-3 items-center'>
                {/* Logo */}
                <img width={'111px'} height={'20px'} src="/logos/gitgi-hr-logo.svg" alt="gitgi" />

                <form className='flex flex-col gap-6 items-center p-6 text-center w-full' onSubmit={handleVerify}>
                    <div className='space-y-3'>
                        <h1 className='text-[28px] font-semibold text-(--neutral-normal) leading-9'>{copy.title}</h1>
                        <p className='text-[18px] font-medium text-(--gray-dark-active) leading-7'>{copy.subtitle}</p>
                    </div>

                    <div className="w-full max-w-[384px]">
                        {mode === 'backup' ? (
                            <InputField
                                placeholder={copy.placeholder}
                                type="text"
                                autoComplete="one-time-code"
                                autoFocus
                                maxLength={20}
                                value={otp}
                                onChange={(event) => {
                                    setOtp(event.target.value.toUpperCase())
                                    setError('')
                                }}
                            />
                        ) : (
                            <OtpInput
                                key={mode}
                                value={otp}
                                autoFocus
                                disabled={loading}
                                error={!!error}
                                onChange={(value) => {
                                    setOtp(value)
                                    setError('')
                                }}
                                // Submit as soon as the 6th digit is entered.
                                onComplete={(code) => handleVerify(undefined, code)}
                            />
                        )}
                    </div>

                    {mode === 'email' && (
                        <button
                            type="button"
                            onClick={sendEmailCode}
                            disabled={sendingEmail || resendIn > 0}
                            className="text-[14px] font-medium text-[#235E94] disabled:opacity-50"
                        >
                            {sendingEmail ? 'Sending…' : resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
                        </button>
                    )}

                    {error && (
                        <p className="text-sm text-(--error-normal)" role="alert">
                            {error}
                        </p>
                    )}

                    {success && (
                        <p className="text-sm text-(--success-normal)" role="status">
                            {success}
                        </p>
                    )}

                    <div className='flex flex-col w-[252px] gap-y-5'>
                        <Button
                            className="w-full"
                            type="submit"
                            variant="primary"
                            disabled={loading || !isValid}
                        >
                            {loading ? 'Verifying...' : 'Verify'}
                        </Button>

                        <div className='flex flex-col gap-2 text-[16px] font-medium leading-6 text-(--blue-dark-normal)'>
                            {mode !== 'app' && (
                                <button type="button" onClick={() => switchMode('app')}>Use authenticator app</button>
                            )}
                            {mode !== 'backup' && (
                                <button type="button" onClick={() => switchMode('backup')}>Use a backup code</button>
                            )}
                            {mode !== 'email' && (
                                <button type="button" onClick={() => switchMode('email')}>Email me a code instead</button>
                            )}
                        </div>

                        <button type="button" onClick={backToSignIn} disabled={loading}>
                            <span className="w-full text-[18px] font-medium leading-7 text-(--gray-dark-active)">Back to sign in</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default TwoFactorAuthPage
