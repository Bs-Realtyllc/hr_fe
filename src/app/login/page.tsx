'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { AuthUser } from '@/lib/auth';
import { BSRealtyButton, BSRealtyTextField } from '@bsrealtyllc/design-system';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const loginFormRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState<'default' | 'org'>('default');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (requiresOtp) {
        const res = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: otp, tempToken }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? 'Verification failed');
          return;
        }
        login(data.token as string, data.user as AuthUser);
        router.replace('/');
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
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
        router.replace('/');
      }
    } catch {
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

          <form ref={loginFormRef} onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="otp-input">Verification Code</label>
              <BSRealtyTextField
                {...({
                  style: {
                    letterSpacing: '0.4em',
                    textAlign: 'center',
                    fontSize: '22px',
                    fontWeight: 'bold',
                  }, inputMode: "numeric",
                  pattern: "[0-9]*",
                  maxLength: 6,
                  autoComplete: "one-time-code"
                } as any)}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                type='text'
                value={otp}
              />
            </div>

            {error && (
              <div className="auth-error">
                {error}
              </div>
            )}


            <div className='text-center'>
              <BSRealtyButton
                variant={'primary'}
                size={'small'}
                label={loading ? 'Verifying…' : 'Verify & Sign In'}
                showLeftIcon={false}
                showRightIcon={false}
                onClick={() => loginFormRef.current?.requestSubmit()}
                disabled={loading}
              />
            </div>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button
                type="button"
                onClick={() => {
                  setRequiresOtp(false);
                  setTempToken('');
                  setError('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '13px',
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Back to Sign In
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <img src="/logos/hr-platform.svg" alt="HR Platform" width={28} height={28} />
          </div>
          <h1>HR Platform</h1>
          <p>Sign in to your account</p>
        </div>

        <form ref={loginFormRef} onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email address</label>

            <BSRealtyTextField
              {...({ autoComplete: 'email' } as any)}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              type={'email'}
              value={email}
              
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <BSRealtyTextField
                {...({ autoComplete: "current-password" } as any)}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                showPasswordToggle
                type={showPassword ? 'text' : 'password'}
                value={password}
                required
              />
            </div>
          </div>

          {error && (
            <div className={errorType === 'org' ? 'auth-error auth-error-org' : 'auth-error'}>
              {errorType === 'org' && <span style={{ fontSize: 16, marginRight: 8 }}>🔒</span>}
              {error}
            </div>
          )}


          <div className='text-center'>
            <BSRealtyButton
              label={loading ? 'Signing in…' : 'Sign In'} variant='primary'
              showRightIcon={false}
              showLeftIcon={false}
              size='small'
              onClick={() => loginFormRef.current?.requestSubmit()}
              disabled={loading}
            
            />
          </div>


          <div style={{ textAlign: 'right', marginTop: 12 }}>
            <a href="/forgot-password" style={{ fontSize: 13, color: 'var(--color-primary)', textDecoration: 'none' }}>
              Forgot password?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
