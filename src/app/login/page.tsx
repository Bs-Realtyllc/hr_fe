'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { AuthUser } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: '100%', marginTop: 8 }}
            >
              {loading ? 'Verifying…' : 'Verify & Sign In'}
            </button>

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

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className={errorType === 'org' ? 'auth-error auth-error-org' : 'auth-error'}>
              {errorType === 'org' && <span style={{ fontSize: 16, marginRight: 8 }}>🔒</span>}
              {error}
            </div>
          )}

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', marginTop: 8 }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

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
