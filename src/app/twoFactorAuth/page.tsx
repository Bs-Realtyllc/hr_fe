'use client'
import Button from '@/components/Button/Button'
import InputField from '@/components/InputField/InputField'
import Link from 'next/link'
import React, { useState } from 'react'



const TwoFactorAuthPage = () => {
    const [show2FAForm, setShow2FAForm] = useState(false)
    return (
        <div className='flex justify-center items-center h-full w-full '>
            <div className=' flex flex-col w-[591px] gap-3 items-center'>
                {/* Logo */}
                <img width={'111px'} height={'20px'} src="/logos/gitgi-hr-logo.svg" alt="gitgi" />

                {/* 2FA form */}
                {
                    show2FAForm ? (
                        <div className=' flex flex-col gap-6 items-center p-6  text-center'>
                            <div className=' space-y-3 '>
                                <h1 className='text-[28px] font-semibold text-(--neutral-normal) leading-9'>Set up two-factor authentication(2FA) for your account</h1>
                                <p className='text-[18px] font-medium text-(--gray-dark-active) leading-7'>Protect  sensitive information and secure your account by using
                                    an authenticator app to log in to your accoun.</p>
                            </div>
                            <div className='w-[384px]'>
                                <InputField type='number' placeholder='000000' />

                            </div>
                            <div className=' w-[304px] space-y-5'>
                                <Button className='w-[252px]' >Setup 2FA</Button>
                                <Link
                                    href="/dashboard"
                                    className="w-full text-[18px] font-medium leading-7 text-(--blue-dark-normal) cursor-pointer"
                                >
                                    Cancel Setup and go to my account
                                </Link>
                            </div>

                        </div>
                    ) : (
                        <div className=' flex flex-col gap-6 items-center p-6  text-center'>
                            <div className=' space-y-3 '>
                                <h1 className='text-[28px] font-semibold text-(--neutral-normal) leading-9'>Set up two-factor authentication(2FA) for your account</h1>
                                <p className='text-[18px] font-medium text-(--gray-dark-active) leading-7'>Protect  sensitive information and secure your account by using
                                    an authenticator app to log in to your accoun.</p>
                            </div>
                            <div className=' w-[252px] space-y-5'>
                                <Button className='w-full' onClick={() => setShow2FAForm(true)}>Setup 2FA</Button>
                                <Link
                                    href="/dashboard"
                                    className="w-full text-[18px] font-medium leading-7 text-(--blue-dark-normal)  cursor-pointer"
                                >
                                    Setup later, go to my account
                                </Link>
                            </div>

                        </div>
                    )
                }
            </div >
        </div>
    )
}

export default TwoFactorAuthPage
