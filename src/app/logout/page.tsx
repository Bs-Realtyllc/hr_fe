'use client'

import { BSRealtyAvatar } from '@bsrealtyllc/design-system'
import React, { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import Button from '@/components/Button/Button'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface Profile {
    profile_picture?: string | null;
}

const BACKEND = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/?$/, '');

const LogoutPage = () => {
    const { logout, user } = useAuth();
    const router = useRouter();

    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const [displayUser, setDisplayUser] = useState(() => ({
        name: user?.name?.trim(),
        email: user?.email?.trim(),
    }));

    useEffect(() => {
        if (user) {
            setDisplayUser({
                name: user.name?.trim(),
                email: user.email?.trim(),
            });
        }
    }, [user]);

    useEffect(() => {
        async function loadProfile() {
            try {
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

    async function handleLogout() {
        if (isLoggingOut) return;
        setIsLoggingOut(true);

        try {
            await logout();
            router.replace('/login');
        } catch {
            // Only reset loading state if logout fails
            setIsLoggingOut(false);
        }
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
                            {displayUser.name || displayUser.email ? (
                                <div className="flex min-w-0 items-center gap-4">
                                    <BSRealtyAvatar name={displayUser.name || displayUser.email || "User"} size="lg" src={profileImage} />
                                    <div className="min-w-0">
                                        {displayUser.name && (
                                            <h3 className="break-words text-[18px] font-medium leading-7 text-(--neutral-normal)">
                                                {displayUser.name}
                                            </h3>
                                        )}
                                        {displayUser.email && (
                                            <p className="break-all text-[14px] leading-6 text-(--neutral-light-dark-active)">
                                                {displayUser.email}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                /* Skeleton placeholder while AuthContext hydrates */
                                <div className="flex min-w-0 flex-1 animate-pulse items-center gap-4">
                                    <div className="h-12 w-12 shrink-0 rounded-full bg-gray-200" />
                                    <div className="flex flex-1 flex-col gap-2">
                                        <div className="h-5 w-32 rounded bg-gray-200" />
                                        <div className="h-4 w-44 rounded bg-gray-200" />
                                    </div>
                                </div>
                            )}
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
                            <Button onClick={handleLogout} disabled={isLoggingOut}>{isLoggingOut ? 'Logging out.....' : 'Logout'}</Button>
                            <Button
                                variant="text"
                                className="text-[#2E8CBF]! border! border-[#2E8CBF]!"
                                onClick={() => router.push('/')}
                                disabled={isLoggingOut}
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