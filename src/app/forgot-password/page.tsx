'use client';
import { useState } from 'react';
import Link from 'next/link';
import Button from '@/components/Button/Button';
import InputField from '@/components/InputField/InputField';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`;
      console.log('[AUTH] POST', url, { email });
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      console.log('[AUTH] forgot-password response', res.status);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Something went wrong');
      }
      setSent(true);
    } catch (err: unknown) {
      console.error('[AUTH] fetch error', err);
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className=" h-screen w-screen relative flex flex-col justify-center items-center">
      <div className="absolute top-[32px] left-[80px]">
        <img src="/logos/gitgi-hr-logo.svg" alt="Gitgi HR" width={'111px'} height={'20px'} />
      </div>
      {sent ? (
        <div className=' flex flex-col w-[613px] p-6 gap-6 items-center text-center'>
          <div className='flex justify-center items-center h-20 w-20 bg-(--blue-sky-light) rounded-lg'>
            <span
              className="inline-block text-(--blue-dark-normal) "
              style={{
                width: "40px",
                height: "40px",
                backgroundColor: 'currentColor',
                maskImage: "url('/icons/mail.svg')",
                WebkitMaskImage: "url('/icons/mail.svg')",
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
                maskPosition: "center",
                WebkitMaskPosition: "center",
                maskSize: "contain",
                WebkitMaskSize: "contain",
              }}
            />
          </div>
          <div className='p-6 space-y-6'>
            <div className='space-y-3'>
              <h2 className='text-[28px] font-semibold leading-9 text-(--neutral-normal)'>Email on the way!</h2>
              <p className='text-[18px] font-medium leading-7 text-(--gray-dark-active)'>We sent you password reset instructions. If it doesn’t show up soon, check your spam folder.  We sent it from the email address
                no-reply@gitgi.com.</p>

            </div>
            <Button
              className="text-(--blue-dark-normal)!"
              variant="text"
              type='button'
              size="medium"
              onClick={() => router.push('/login')}
              leftIcon={
                <span
                  className="inline-block bg-(--blue-dark-normal)"
                  style={{
                    width: "18px",
                    height: "18px",
                    backgroundColor: 'currentColor',
                    maskImage: "url('/icons/arrow-left.svg')",
                    WebkitMaskImage: "url('/icons/arrow-left.svg')",
                    maskRepeat: "no-repeat",
                    WebkitMaskRepeat: "no-repeat",
                    maskPosition: "center",
                    WebkitMaskPosition: "center",
                    maskSize: "contain",
                    WebkitMaskSize: "contain",
                  }}
                />
              }
            >
              Back to Sign In
            </Button>
          </div>

        </div>
      ) : (
        <div className=" max-w-[591px] flex flex-col  p-6 gap-6">
          <div className=" space-y-3 text-center ">
            <h1 className='text-[28px] font-semibold leading-9 text-(--neutral-normal)  '>Forget Password ?</h1>
            <p className='text-[18px] font-medium leading-7 text-(--gray-dark-active) '>All good. Enter your account’s email address and we’ll send you a link to reset your password.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="w-full ">
              <InputField type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="johndoe@gitgi.com"
                autoComplete="email"
                required />
            </div>


            {error && (
              <div className="auth-error">{error}</div>
            )}

            <div className=' mx-auto flex flex-col w-[252px] items-center mt-6 gap-5'>
              <Button className='w-full'
                type="submit"
                variant='primary'
                size='medium'
                disabled={loading}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </Button>

              <div >
                {/* <Link href="/login" className=''>
                    ← Back to Sign In
                  </Link> */}
                <Button
                  className="text-(--blue-dark-normal)!"
                  variant="text"
                  type='button'
                  size="medium"
                  onClick={() => router.push('/login')}
                  leftIcon={
                    <span
                      className="inline-block bg-(--blue-dark-normal)"
                      style={{
                        width: "18px",
                        height: "18px",
                        backgroundColor: 'currentColor',
                        maskImage: "url('/icons/arrow-left.svg')",
                        WebkitMaskImage: "url('/icons/arrow-left.svg')",
                        maskRepeat: "no-repeat",
                        WebkitMaskRepeat: "no-repeat",
                        maskPosition: "center",
                        WebkitMaskPosition: "center",
                        maskSize: "contain",
                        WebkitMaskSize: "contain",
                      }}
                    />
                  }
                >
                  Back to Sign In
                </Button>
              </div>
            </div>
          </form>
        </div>


      )
      }

    </div >

  );
}
