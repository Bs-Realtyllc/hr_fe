'use client'

import Button from "@/components/Button/Button"
import { api } from '@/lib/api';
import { getToken } from "@/lib/auth"
import { BSRealtyAvatar } from "@bsrealtyllc/design-system"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"


// Progress Tab

interface PersonalInfoProgressProps {
    text: string;
    icon?: string;
    statusIcon?: string;
    completed?: boolean;
    iconBgColor?: string;
    iconColor?: string;
}

function PersonalInfoProgress({
    text,
    icon = "/icons/user.svg",
    statusIcon = "/icons/check.svg",
    completed = true,
    iconBgColor,
    iconColor,
}: PersonalInfoProgressProps) {
    const iconStyle = (url: string, color: string) => ({
        display: "block",
        width: "16px",
        height: "16px",
        flexShrink: 0,
        backgroundColor: color,
        WebkitMaskImage: `url("${url}")`,
        maskImage: `url("${url}")`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
    });

    return (
        <div className="flex justify-between rounded-lg border border-(--neutral-light-hover) p-3">
            {/* Left icon and text */}
            <div className="flex items-center gap-3">
                <div
                    className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full p-0.5"
                    style={{
                        backgroundColor:
                            iconBgColor ??
                            (completed ? "var(--success-light-active)" : "var(--success-light-active)"),
                    }}
                >
                    <span
                        style={iconStyle(
                            icon,
                            iconColor ??
                            (completed ? "var(--success-normal)" : "var(--success-light-active)")
                        )}
                    />
                </div>

                <span className="text-[12px] font-medium leading-4 text-(--neutral-normal)">
                    {text}
                </span>
            </div>

            {/* Right status icon */}
            <div
                className={`flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full p-0.5 ${completed ? "bg-(--success-normal)" : ""
                    }`}
            >
                {completed ? (
                    <span style={iconStyle(statusIcon, "var(--soft-white-light)")} />
                ) : (
                    <img
                        src="/icons/chevron-right.svg"
                        alt="Incomplete"
                        className="h-4 w-4 opacity-50"
                    />
                )}
            </div>
        </div>
    );
}


interface TokenUser {
    name: string;
    email: string;
    role: string;
}

// Reads name, email and role from the JWT payload (no signature check; display only)
function getUserFromToken(token: string | null | undefined): TokenUser {
    const empty = { name: '', email: '', role: '' };
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

const BACKEND = (
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6002/api'
).replace(/\/api\/?$/, '');


export default function WelcomePage() {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!getToken()) {
            router.replace('/login');
            return;
        }

        async function loadProfile() {
            try {
                // Only used for the profile picture
                const data = await api.get<Profile>('/profile');
                setProfile(data ?? null);
            } catch (error) {
                // Page still renders without the picture
                console.error('Failed to load profile:', error);
            } finally {
                setLoading(false);
            }
        }


        loadProfile();
    }, [router]);

    if (!getToken()) {
        return null;
    }
    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                Loading profile...
            </div>
        );
    }

    // Name, email and role come from the token
    const user = getUserFromToken(getToken());
    const name = user.name.trim() || 'User';
    const email = user.email.trim();
    const role = user.role ? user.role.replace(/_/g, ' ') : '';
    const profileImage = profile?.profile_picture
        ? `${BACKEND}/uploads/profile/photo/${profile.profile_picture}` : undefined;

    return (
        <div className="relative min-h-screen w-full overflow-hidden">

            <div className="fixed  h-[900px] w-[900px] bg-(--blue-sky-light) right-[-483px] top-[-483px] rounded-full"></div>
            <div className="fixed  h-[900px] w-[900px] bg-(--blue-sky-light) left-[-483px] bottom-[-483px] rounded-full"></div>

            {/* Main content */}
            <div className="relative z-20  w-screen h-screen flex justify-around items-center">
                <div className=" w-[453px] flex flex-col gap-6 " >
                    <div className="space-y-11">
                        <img height={'20px'} width={'111px'} src="/logos/gitgi-hr-logo.svg" alt="" />
                        <div className="space-y-4">
                            <h1 className="text-[40px] font-semibold text-(--neutral-normal) leading-12 tracking-normal">Welcome to GITGI HR</h1>
                            <p className="text-[22px] leading-7 text-(--gray-dark-hover)">Your Personal HR workspace to manage your information, track your requests, and stay connected with team.</p>
                        </div>
                    </div>
                    <div>
                        <Button
                            size="medium"
                            rightIcon={true}
                            onClick={() => router.replace('/')}
                        >
                            Continue
                        </Button>
                    </div>
                </div>
                <div className=" flex items-center  gap-8">
                    <div className="  h-[486px] flex flex-col items-center justify-center py-6 px-2 gap-3 bg-(--blue-dark-dark) rounded-t-full rounded-b-full">
                        <div className=" flex flex-col gap-5">
                            <BSRealtyAvatar name="Ram" size="xl" src="/images/default-avatar-01.jpg" />
                            <BSRealtyAvatar name="Ram" size="xl" src="/images/default-avatar-02.jpg" />
                            <BSRealtyAvatar name="Ram" size="xl" src="/images/default-avatar-03.jpg" />
                            <BSRealtyAvatar name="Ram" size="xl" src="/images/default-avatar-04.jpg" />
                            <BSRealtyAvatar name="Ram" size="xl" src="/images/default-avatar-05.jpg" />
                        </div>

                        <div className="flex flex-col text-center text-(--soft-white-normal)">
                            <span className="text-[20px] font-semibold "> +12</span>
                            <span className="text-[14px] font-medium "> employees</span>
                        </div>

                    </div>

                    <div className="border space-y-4 w-[374px] max-h-[448px] bg-(--soft-white-light) border-(--neutral-light-hover) p-6 rounded-lg shadow-[0px_2px_4px_0px_rgba(0,0,0,0.08)]">
                        <div className="flex justify-between items-start">

                            <div className="flex min-w-0 items-center gap-4">
                                <div className="relative flex justify-end items-end ">
                                    <BSRealtyAvatar
                                        name={name}
                                        size="xl"
                                        src={profileImage}
                                    />
                                    <span className="absolute  bg-(--success-normal) h-4 w-4 rounded-full border border-(--soft-white-light)"></span>
                                </div>

                                <div className="min-w-0">
                                    <h3 className="break-words text-[18px] font-medium leading-7 text-(--neutral-normal)">
                                        {name}
                                    </h3>

                                    {email && (
                                        <p className="break-all text-[14px] leading-6 text-(--neutral-light-dark-active)">
                                            {email}
                                        </p>
                                    )}

                                    {role && (
                                        <div className="py-1 flex gap-1">
                                            <span
                                                style={{
                                                    display: 'inline-block',
                                                    width: '16px',
                                                    height: '16px',
                                                    backgroundColor: 'currentColor',
                                                    WebkitMaskImage: `url('/icons/Users.svg')`,
                                                    maskImage: `url('/icons/Users.svg')`,
                                                    WebkitMaskRepeat: 'no-repeat',
                                                    maskRepeat: 'no-repeat',
                                                    WebkitMaskPosition: 'center',
                                                    maskPosition: 'center',
                                                    WebkitMaskSize: 'contain',
                                                    maskSize: 'contain',
                                                }}
                                            ></span>
                                            <span className="text-[14px] font-medium leading-5 capitalize">{role}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="rotate-90">
                                <img src="/icons/dots.svg" alt="" className=" opacity-50" />
                            </div>
                        </div>

                        {/* divider */}
                        <div className="border border-(--neutral-light-hover)  "></div>

                        <div className="  flex flex-col px-3 gap-3">
                            <div className="space-y-4">
                                <p className="flex justify-between text-[14px] font-semibold ">
                                    <span className="text-(--neutral-normal)">My Progress</span>
                                    <span className="text-(--neutral-light-active)">3 of 5 completed</span>
                                </p>

                                <div className="relative w-full h-[10px] bg-(--neutral-light-hover) rounded-full overflow-hidden">
                                    <div className="absolute top-0 left-0 h-full w-[70%] bg-(--blue-salt-dark) rounded-full"></div>
                                </div>
                            </div>
                            <div className="flex flex-col py-3 gap-1">

                                <PersonalInfoProgress
                                    text="Personal Information"
                                    icon="/icons/user.svg"
                                    completed={true}
                                    iconBgColor="var(--success-light-active)"
                                    iconColor="var(--success-normal)"
                                />

                                <PersonalInfoProgress
                                    text="Documents"
                                    icon="/icons/document.svg"
                                    completed={true}
                                    iconBgColor="var(--blue-sky)"
                                    iconColor="var(--white-light)"
                                />
                                <PersonalInfoProgress
                                    text="Company Policies"
                                    icon="/icons/book-open.svg"
                                    completed={false}
                                    iconBgColor="var(--blue-dark-normal)"
                                    iconColor="var(--white-light)"
                                />
                                <PersonalInfoProgress
                                    text="Onboarding"
                                    icon="/icons/square-check.svg"
                                    completed={false}
                                    iconBgColor="var(--warning-normal)"
                                    iconColor="var(--white-light)"
                                />

                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    )
}
