'use client'

import { BSRealtyAvatar } from '@bsrealtyllc/design-system'
import React, { useEffect, useState } from 'react'
import { getToken } from "@/lib/auth"
import { api } from '@/lib/api'
import Button from '@/components/Button/Button'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface TokenUser {
    name: string;
    email: string;
    role: string;
}

function getUserFromToken(token: string | null | undefined): TokenUser {
    const empty: TokenUser = { name: '', email: '', role: '', };
    if (!token) return empty;
    try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
                .join('')
        );
        const payload = JSON.parse(json);
        const user = payload.user ?? payload;
        return {
            name: String(user.name ?? user.full_name ?? user.username ?? ''),
            email: String(user.email ?? ''),
            role: String(user.role ?? (Array.isArray(user.roles) ? user.roles[0] : '') ?? ''),
        };
    } catch {
        return empty;
    }
}

interface Profile {
    profile_picture?: string | null;
}

const BACKEND = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/?$/, '');

const LogoutPage = () => {
    const { logout } = useAuth();
    const user = getUserFromToken(getToken());
    const name = user.name.trim() || 'User';
    const email = user.email.trim();
    const router = useRouter();

    const [profile, setProfile] = useState<Profile | null>(null);

    useEffect(() => {
        async function loadProfile() {
            try {
                // Only used for the profile picture
                const data = await api.get<Profile>('/profile');
                setProfile(data ?? null);
            } catch {
                // Fall back to the initials avatar
            }
        }
        loadProfile();
    }, []);

    const profileImage = profile?.profile_picture
        ? `${BACKEND}/uploads/profile/photo/${profile.profile_picture}`
        : undefined;


    function handleLogout() {
        logout();
        router.replace('/login');
    }

    return (
        <div className="relative flex min-h-screen w-full items-center justify-center overflow-y-auto bg-(--soft-white-light) px-4 py-20">
            <div className="absolute top-[30px] left-[80px]">
                <img width={'111px'} height={'20px'} src="/logos/gitgi-hr-logo.svg" alt="" />
            </div>

            <div className="w-[336px]  flex flex-col gap-3">
                <div className='flex-col gap-4 w-full'>
                    <h1 className="text-[20px]  font-semibold text-(--neutral-normal) text-center ">Logout of GITGIHR</h1>

                    <div className="  flex justify-between items-start  px-2 py-3 bg-(--soft-white-normal) rounded-lg">
                        <div className=" flex  items-center gap-4">

                            <BSRealtyAvatar
                                name={name}
                                size="lg"
                                src={profileImage}
                            />

                            <div className="min-w-0">
                                <h3 className="break-words text-[18px] font-medium leading-7 text-(--neutral-normal)">
                                    {name}
                                </h3>

                                {email && (
                                    <p className="break-all text-[14px] leading-6 text-(--neutral-light-dark-active)">
                                        {email}
                                    </p>
                                )}


                            </div>
                        </div>
                        <div className="rotate-90">
                            <img src="/icons/chevron-up.svg" alt="" className="opacity-50" />
                        </div>
                    </div>
                </div>

                <div className='flex flex-col gap-3 w-full'>
                    <p className='text-[14px] text-(--neutral-normal) text-center'>You’ll need to log in again to acess this portal</p>
                    <div className='flex flex-col gap-2'>
                        <Button onClick={handleLogout}>Logout</Button>
                        <Button variant='text' className='border! border-(--neutral-light-hover)!'
                            onClick={() => { router.push('/') }}>Cancel</Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default LogoutPage