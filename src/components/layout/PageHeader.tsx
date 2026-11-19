'use client'

import { useAuth } from "@/contexts/AuthContext";
import { BSRealtyAvatar } from "@bsrealtyllc/design-system";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

interface PageHeaderProps {
    title: string, discription: string,
    /** Extra items rendered at the start of the header's right-hand actions */
    children?: ReactNode
}

export default function PageHeader({
    title,
    discription,
    children
}: PageHeaderProps) {
    const { user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const [showProfileToogle, setShowProfileToogle] = useState(false);

    // function handleLogout() {
    //     setShowProfileToogle(false);
    //     logout();
    //     router.replace('/login');
    // }

    const profileMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                profileMenuRef.current &&
                !profileMenuRef.current.contains(event.target as Node)
            ) {
                setShowProfileToogle(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    function initials(name: string) {
        return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    }
    return (
        <div className="page-header">
            <div>
                <h1>{title}</h1>
                <p>{discription}</p>
            </div>
            <div className="flex items-center gap-3">
                {children}
                <button className="topbar-icon-btn" title="Toggle theme">
                    <span className="icon-mask" style={{ WebkitMaskImage: 'url(/icons/moon.svg)', maskImage: 'url(/icons/moon.svg)' }} />
                </button>
                <button className="topbar-icon-btn" title="Inbox" onClick={() => router.push('/inbox')}>
                    <span className="icon-mask" style={{ WebkitMaskImage: 'url(/icons/inbox.svg)', maskImage: 'url(/icons/inbox.svg)' }} />
                    <span className="topbar-icon-btn-dot" />
                </button>
                {user &&

                    (
                        <div className="relative" ref={profileMenuRef}>
                            <div className=""  >
                                <button type="button" onClick={() => { setShowProfileToogle(prev => !prev) }}
                                    aria-label="Open profile menu"
                                    aria-expanded={showProfileToogle}
                                    className="rounded-full focus:outline-none"
                                >
                                    <BSRealtyAvatar size='sm' name={initials(user.name)} />
                                </button>

                            </div>

                            {
                                showProfileToogle && (
                                    <>
                                        <div className="absolute  rounded-lg flex flex-col py-3 px-2 gap-2 right-0 top-15.25 bg-(--soft-white-light) shadow-(--shadow-sm) ">
                                            <div className={`flex items-center p-2 gap-2 cursor-pointer rounded-lg ${pathname === '/profile'
                                                ? 'bg-(--blue-sky-light)'
                                                : 'hover:bg-(--blue-sky-light)'
                                                }`}
                                                onClick={() => {
                                                    setShowProfileToogle(false);
                                                    router.push('/profile');
                                                }} title="Profile"
                                            >
                                                <BSRealtyAvatar size='md' name={user ? initials(user.name) : '?'} />

                                                <div className="flex flex-col">
                                                    <span className="text-[14px] font-medium leading-5 text-(--neutral-normal)">{user?.name ?? ''}</span>
                                                    <span className="text-xs leading-4 text-(--gray-normal)">{user?.email ?? ''}</span>
                                                </div>
                                                <span
                                                    className="inline-block h-4 w-4 bg-(--neutral-dark)"
                                                    style={{
                                                        WebkitMaskImage: 'url(/icons/chevron-right.svg)',
                                                        maskImage: 'url(/icons/chevron-right.svg)',
                                                        WebkitMaskRepeat: 'no-repeat',
                                                        maskRepeat: 'no-repeat',
                                                        WebkitMaskPosition: 'center',
                                                        maskPosition: 'center',
                                                        WebkitMaskSize: 'contain',
                                                        maskSize: 'contain',
                                                    }}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <div className={`flex items-center py-2 px-3 gap-1 rounded-lg text-[14px] font-medium text-(--neutral-normal) cursor-pointer ${pathname === '/settings'
                                                    ? 'bg-(--blue-sky-light)'
                                                    : 'hover:bg-(--blue-sky-light)'
                                                    }`}
                                                    onClick={() => {
                                                        setShowProfileToogle(false);
                                                        router.push('/settings');
                                                    }} title="Settings">
                                                    <span
                                                        className="inline-block h-4.5 w-4.5 bg-(--neutral-dark)"
                                                        style={{
                                                            WebkitMaskImage: 'url(/icons/settings.svg)',
                                                            maskImage: 'url(/icons/settings.svg)',
                                                            WebkitMaskRepeat: 'no-repeat',
                                                            maskRepeat: 'no-repeat',
                                                            WebkitMaskPosition: 'center',
                                                            maskPosition: 'center',
                                                            WebkitMaskSize: 'contain',
                                                            maskSize: 'contain',
                                                        }}
                                                    />
                                                    <span>Setting</span>
                                                </div>
                                                <div className="flex items-center py-2 px-3 gap-1 rounded-lg cursor-pointer hover:bg-(--error-light)" onClick={() => router.push('/logout')} title="Sign out">
                                                    <button className="flex items-center gap-1 text-[14px] font-medium text-(--error-normal) " >
                                                        <span
                                                            className="inline-block h-4.5 w-4.5"
                                                            style={{
                                                                WebkitMaskImage: 'url(/icons/log-out.svg)',
                                                                maskImage: 'url(/icons/log-out.svg)',
                                                                WebkitMaskRepeat: 'no-repeat',
                                                                maskRepeat: 'no-repeat',
                                                                WebkitMaskPosition: 'center',
                                                                maskPosition: 'center',
                                                                WebkitMaskSize: 'contain',
                                                                maskSize: 'contain',
                                                                background: 'currentColor'
                                                            }}
                                                        />
                                                        <span>Logout</span>
                                                    </button>
                                                </div>
                                            </div>

                                        </div>


                                    </>
                                )
                            }

                        </div>

                    )

                }
            </div>

        </div>
    )
}

