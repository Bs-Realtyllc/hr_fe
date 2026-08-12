'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail]   = useState('');
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Something went wrong');
      }
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <img src="/logos/hr-platform.svg" alt="HR Platform" width={28} height={28} />
          </div>
          <h1>Forgot Password</h1>
          <p>Enter your company email to receive a reset link</p>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>Check your inbox</p>
            <p className="text-muted" style={{ fontSize: 14, marginBottom: 24 }}>
              If <strong>{email}</strong> is registered, a reset link has been sent.
              It expires in <strong>1 hour</strong>.
            </p>
            <Link href="/login" className="btn btn-ghost" style={{ width: '100%', display: 'block', textAlign: 'center' }}>
              Back to Sign In
            </Link>
          </div>
        ) : (
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

            {error && (
              <div className="auth-error">{error}</div>
            )}

            <button className="btn btn-primary" type="submit" disabled={loading}
              style={{ width: '100%', marginTop: 8 }}>
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Link href="/login" style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
                ← Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
