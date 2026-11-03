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
        <div className="flex min-h-dvh w-full flex-col bg-(--soft-white-light) px-4">
            {/* Logo */}
            <header className="pt-[30px] sm:pl-16">
                <img width={111} height={20} src="/logos/gitgi-hr-logo.svg" alt="GITGIHR" />
            </header>

            {/* Centered card */}
            <main className="flex flex-1 items-center justify-center py-8">
                <div className="flex w-full max-w-[336px] flex-col gap-3">
                    <div className="flex w-full flex-col gap-4">
                        <h1 className="text-center text-[20px] font-semibold text-(--neutral-normal)">
                            Logout of GITGIHR
                        </h1>

                        <div className="flex items-start justify-between rounded-lg bg-(--soft-white-normal) px-2 py-3">
                            <div className="flex min-w-0 items-center gap-4">
                                <BSRealtyAvatar name={name} size="lg" src={profileImage} />
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

                    <div className="flex w-full flex-col gap-3">
                        <p className="text-center text-[14px] text-(--neutral-normal)">
                            You’ll need to log in again to access this portal
                        </p>
                        <div className="flex flex-col gap-2">
                            <Button onClick={handleLogout}>Logout</Button>
                            <Button
                                variant="text"
                                className="border! border-(--neutral-light-hover)!"
                                onClick={() => router.push('/')}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer links */}
            <footer className="flex justify-center gap-2 pb-6">
                <p className="text-[14px] font-medium underline underline-offset-2">Term of Use</p>
                <span className="border-l border-[#B7BABD]" />
                <p className="text-[14px] font-medium underline underline-offset-2">Privacy Policy</p>
            </footer>
        </div>
    )
}

export default LogoutPage