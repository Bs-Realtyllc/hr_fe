'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { AuthUser } from '@/lib/auth';
import Button from '@/components/Button/Button'
import InputField from '@/components/InputField/InputField';
import { validateEmail } from '@/lib/validation';


export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);


  const [errorType, setErrorType] = useState<'default' | 'org'>('default');
  const [loading, setLoading] = useState(false);

  // Validation
  const handleEmailChange = (value: string) => {
    setEmail(value);

    if (emailTouched) {
      setEmailError(validateEmail(value));
    }
  };

  const passwordError =
    passwordTouched && !password.trim()
      ? 'Password is required'
      : '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (requiresOtp) {
        const url = `${process.env.NEXT_PUBLIC_API_URL}/auth/verify-otp`;
        console.log('[AUTH] POST', url, { code: otp });
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: otp, tempToken }),
        });
        const data = await res.json();
        console.log('[AUTH] verify-otp response', res.status, data);
        if (!res.ok) {
          setError(data.error ?? 'Verification failed');
          return;
        }
        login(data.token as string, data.user as AuthUser);
        router.replace('/welcome');
      } else {
        const url = `${process.env.NEXT_PUBLIC_API_URL}/auth/login`;
        console.log('[AUTH] POST', url, { email });
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        console.log('[AUTH] login response', res.status, data);
        if (!res.ok) {
          setErrorType(res.status === 403 ? 'org' : 'default');
          setError(data.error ?? 'Login failed');
          return;
        }
        if (data.requiresOtp) {
          setRequiresOtp(true);
          setTempToken(data.tempToken);
          setOtp('');
          return;
        }
        login(data.token as string, data.user as AuthUser);
        router.replace('/welcome');
      }
    } catch (err) {
      console.error('[AUTH] fetch error', err);
      setError('Unable to connect to server');
    } finally {
      setLoading(false);
    }
  }

  if (requiresOtp) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <img src="/logos/hr-platform.svg" alt="HR Platform" width={28} height={28} />
            </div>
            <h1>Security Verification</h1>
            <p>Enter the 6-digit OTP code sent to your email.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="otp-input">Verification Code</label>
              <input
                id="otp-input"
                className="form-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoComplete="one-time-code"
                required
                autoFocus
                style={{
                  letterSpacing: '0.4em',
                  textAlign: 'center',
                  fontSize: '22px',
                  fontWeight: 'bold',
                }}
              />
            </div>

            {error && (
              <div className="auth-error">
                {error}
              </div>
            )}


            <Button
              type="submit"
              variant='primary'
              size='small'
              disabled={loading}>
              {loading ? 'Verifying…' : 'Verify & Sign In'}
            </Button>

            <div style={{ textAlign: 'center', marginTop: 16 }}>

              <Button className='underline'
                type="button"
                onClick={() => {
                  setRequiresOtp(false);
                  setTempToken('');
                  setError('');
                }}
                variant='text'
                size='small'
                disabled={loading}>
                Back to Sign In
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }


  return (
    <>
      {
        // Login page
        showLoginForm ? (
          <div className=' w-full flex   min-h-screen'>
            <div className='relative w-[812px] shrink-0 h-screen bg-(--soft-white-light) flex justify-center items-center'>
              <div className='absolute top-[30px] left-[80px] '>
                <img width={'111px'} height={'20px'} src="/logos/gitgi-hr-logo.svg" alt="" /></div >
              <div className='flex flex-col gap-9 justify-center items-center '>

                <div className='flex flex-col px-6 py-7 gap-6'>
                  <div className='flex flex-col items-center gap-3 '>
                    <h1 className='text-[24px] font-medium text-(--neutral-normal) '>Sign In</h1>
                    <p className='text-(--gray-dark-active) font-normal text-[16px]'>Sign in with your authorized company email to access the hiring portal.</p>
                  </div>
                  <form className=" flex flex-col gap-6 justify-center items-center" onSubmit={handleSubmit}>

                    <div className="w-full flex flex-col gap-3">
                      <InputField className='w-full' type="email"
                        value={email}
                        onChange={e => handleEmailChange(e.target.value)}
                        onBlur={() => {
                          setEmailTouched(true);
                          setEmailError(validateEmail(email));
                        }}
                        placeholder="you@company.com"
                        autoComplete="email"
                        variant={
                          emailTouched
                            ? emailError
                              ? 'error'
                              : 'success'
                            : 'default'
                        }
                        errorMessage={emailError ?? undefined}
                      // successMessage="Valid email address"

                      />


                      <InputField className='w-full' showPasswordToggle={true}
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onBlur={() => setPasswordTouched(true)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        variant={passwordError ? 'error' : 'default'}
                        errorMessage={passwordError || undefined}
                      />

                      {error && (
                        <div className={errorType === 'org' ? 'auth-error auth-error-org' : 'auth-error'}>
                          {errorType === 'org' && <span style={{ fontSize: 16, marginRight: 8 }}>🔒</span>}
                          {error}
                        </div>
                      )}

                      <div className=' w-full flex justify-end' >
                        <a className='right-0 text-[16px] font-semibold text-(--gray-dark-active)' href="/forgot-password"
                        >
                          Forgot password?
                        </a>
                      </div>
                    </div>

                    <Button
                      className='w-full'
                      type="submit"
                      variant='primary'
                      size='medium'
                      disabled={loading}>
                      {loading ? 'Signing in…' : 'Sign In'}
                    </Button>


                  </form>
                  <p className='text-[16px] text-(--gray-dark-hover) font-medium text-center'>Don’t have access ? Contact your HR  administrator.</p>
                </div>
              </div >
            </div >

            <div className=' flex flex-1 items-center justify-center bg-(--blue-dark-normal)'>
              <img className='' width={'499px'} height={'599px'} src="/images/onboarding-login-page.png" alt="" />
            </div>
          </div >
        ) : (
          // Onboarding screen
          <div className=' w-full flex   min-h-screen'>
            <div className='relative w-[812px] shrink-0 h-screen bg-(--soft-white-light) flex justify-center items-center'>
              <div className='absolute top-[30px] left-[80px] '>
                <img width={'111px'} height={'20px'} src="/logos/gitgi-hr-logo.svg" alt="" /></div >
              <div className='flex flex-col gap-9 justify-center items-center '>
                {/* <div className="auth-logo">
                  <img src="/logos/hr-platform.svg" alt="HR Platform" width={28} height={28} />
                </div> */}
                <div className='flex flex-col px-6 py-7 gap-6'>
                  <div className='flex flex-col items-center  '>
                    <h1 className='text-[28px] font-semibold text-(--neutral-normal)'>Welcome</h1>
                    <p className='text-(--gray-dark-active) font-normal text-[16px]'>This portal is intended for authorized GITGI members only.</p>
                  </div>
                  <div className='flex flex-col items-center gap-6'>
                    <div className='flex flex-col gap-3 w-[302px]'>
                      <Button onClick={() => setShowLoginForm(true)}>Sign In</Button>

                      <a className='border-2 border-(--blue-dark-normal) text-(--blue-dark-normal) text-[16px] font-medium px-5 py-3 rounded-xl flex justify-center' href='/request-access' >Request Access</a>

                    </div>
                    <p className='text-(--gray-darker) text-[16px] font-medium '>Don’t have access ? Contact your HR administrator.</p>
                  </div>
                </div>
              </div>
            </div >

            <div className=' flex flex-1 items-center justify-center bg-(--blue-dark-normal)'>
              <img className='' width={'499px'} height={'599px'} src="/images/onboarding-login-page.png" alt="" />
            </div>
          </div >
        )
      }
    </>
  );
}
