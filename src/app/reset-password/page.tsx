'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '@/components/Button/Button';
import InputField from '@/components/InputField/InputField';
import ConfettiAnimation from '@/components/ConfettiAnimation';

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [form, setForm] = useState({ new_password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const password = form.new_password;

  const passwordRules = [
    {
      label: 'Lowercase characters',
      valid: /[a-z]/.test(password),
    },
    {
      label: 'Uppercase characters',
      valid: /[A-Z]/.test(password),
    },
    {
      label: 'Numbers',
      valid: /[0-9]/.test(password),
    },
    {
      label: '14 characters',
      valid: password.length >= 14,
    },
  ];

  useEffect(() => {
    if (!token) setError('Invalid or missing reset token. Please request a new link.');
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordRules.every((rule) => rule.valid)) {
      setError('Please meet all password requirements.');
      return;
    }

    if (form.new_password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError(''); setLoading(true);
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`;
      console.log('[AUTH] POST', url);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: form.new_password }),
      });
      const data = await res.json().catch(() => ({}));
      console.log('[AUTH] reset-password response', res.status, data);
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      setDone(true);
      // setTimeout(() => router.replace('/login'), 10000);
    } catch (err: unknown) {
      console.error('[AUTH] fetch error', err);
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  }



  return (
    <div className='relative flex justify-center items-center h-full w-full' >
      <div className=' absolute top-7.5 left-4 lg:left-20  '>
        <img className='h-4 w-22 lg:h-5 lg:w-28' src="/logos/gitgi-hr-logo.svg" alt="" /></div >



      {done ? (
        <div className=' m-4 lg:m-0 text-center w-[580px]  space-y-3 '>
          <ConfettiAnimation />
          <div className='p-5 lg:p-6  flex flex-col gap-4 lg:gap-6 items-center'>

            <img src="icons/success-tick.svg" className='h-[64px] w-[64px]' alt="" />

            <div className=''>
              <h1 className='text-[20px] lg:text-[28px] font-semibold leading-7 lg:leading-9 text-(--neutral-normal)'>Success!</h1>
              <p className='text-[14px] lg:text-[18px] font-medium leading-5 lg:leading-7 text-(--gray-dark)'>Almost done. Enter your new password and you’re good to go.</p>
            </div>
            <div className='w-[269px] '>
              <div className='block lg:hidden'>
                <Button className='w-full' variant='primary' size='small' onClick={() => router.push('/login')}>Return to login</Button>
              </div>
              <div className='hidden lg:block'>
                <Button className='w-full' variant='primary' size='medium' onClick={() => router.push('/login')}>Return to login</Button>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className=' m-4 lg:m-0 p-5 lg:p-6 lg:w-[581px] text-center  '>
            <div className=' flex flex-col  gap-4'>

              <div className=' space-y-4 lg:space-y-6'>
                <div className='space-y-3'>
                  <h1 className='text-[22px] lg:text-[28px] font-semibold leading-7 lg:leading-9 text-(--neutral-normal) '>Reset your Password</h1>
                  <p className='text-[14px] lg:text-[18px] lg:font-medium leading-5 lg:leading-7 text-(--gray-dark-active'>Almost done. Enter your new password and you’re good to go.</p>
                </div>
                <div className='space-y-3'>
                  <InputField type='password' showPasswordToggle={true} placeholder='New password'
                    autoComplete="new-password" required
                    value={form.new_password}
                    onChange={e => setForm(f => ({ ...f, new_password: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    {passwordRules.map((rule) => (
                      <div
                        key={rule.label}
                        className="flex items-center gap-2"
                      >
                        <span
                          className={`flex h-[6px] w-[6px] shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${rule.valid
                            ? 'text-green-600'
                            : 'bg-(--neutral-light-active) text-white'
                            }`}
                        >
                          {rule.valid ? '✓' : ''}
                        </span>

                        <span
                          className={`text-[14px] text-(--gray-dark-hover)`}
                        >
                          {rule.label}
                        </span>
                      </div>
                    ))}
                  </div>


                  <InputField placeholder='Conform password' type='password' showPasswordToggle={true} autoComplete="new-password"
                    required
                    value={form.confirm}
                    onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} />

                </div>
              </div>
              {error && <div className="auth-error">{error}</div>}
              <div className=' flex justify-center'>
                <div className='block lg:hidden'>
                  <Button className='w-63 '
                    size='medium' type="submit"
                    disabled={loading || !token}
                  >
                    {loading ? 'Resetting…' : 'Reset Password'}</Button>
                </div>
                <div className='hidden lg:block'>
                  <Button className='w-63 '
                    size='large' type="submit"
                    disabled={loading || !token}
                  >
                    {loading ? 'Resetting…' : 'Reset Password'}</Button>
                </div>
              </div>
            </div>
          </div>

        </form>
      )}
    </div>

  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
