'use client'

import Button from "@/components/Button/Button"
import { api } from '@/lib/api';
import { getToken } from "@/lib/auth"
import { BSRealtyAvatar } from "@bsrealtyllc/design-system"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface Profile {
    id: number;
    name: string;
    email: string;
    role: string;
    profile_picture: string;
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
                const data = await api.get<Profile>('/profile');
                setProfile(data);
            } catch (error) {
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

    if (!profile) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4">
                <p>Unable to load your profile.</p>
                <Button onClick={() => router.replace('/login')}>
                    Back to Login
                </Button>
            </div>
        );
    }

    const profileImage = profile.profile_picture
        ? `${BACKEND}/uploads/profile/${profile.profile_picture}`
        : undefined;
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
                <div className="flex items-center  gap-8">

                    <div className="border space-y-4 w-[374px] max-h-[448px] bg-(--soft-white-light) border-(--neutral-light-hover) p-6 rounded-lg shadow-[0px_2px_4px_0px_rgba(0,0,0,0.08)]">
                        <div className="flex justify-between items-start">

                            <div className="flex min-w-0 items-center gap-4">
                                <BSRealtyAvatar
                                    name={profile.name}
                                    size="xl"
                                    src={profileImage}
                                />

                                <div className="min-w-0">
                                    <h3 className="break-words text-[18px] font-medium leading-7 text-(--neutral-normal)">
                                        {profile.name}
                                    </h3>

                                    <p className="break-all text-[14px] leading-6 text-(--neutral-light-dark-active">
                                        {profile.email}
                                    </p>

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
                                        <span className="text-[14px] font-medium leading-5 capitalize">{profile.role.replace(/_/g, ' ')}</span>
                                    </div>


                                </div>
                            </div>
                            <div className="rotate-90">
                                <img src="icons/dots.svg" alt="" />
                            </div>
                        </div>



                        {/* divider */}
                        <div className="border border-(--neutral-light-hover)  "></div>

                        <div className="  flex flex-col px-3 gap-3">
                            <div>
                                <p className="flex justify-between text-[14px] font-semibold ">
                                    <span className="text-(--neutral-normal)">My Progress</span>
                                    <span className="text-(--neutral-light-active)">3 of 5 completed</span>
                                </p>

                                <div className="relative w-full h-5 bg-(--neutral-light-hover) rounded-full overflow-hidden">
                                    <div className="absolute top-0 left-0 h-full w-[70%] bg-(--blue-salt-dark) rounded-full"></div>
                                </div>
                            </div>
                            <div className="flex flex-col py-3 gap-1">
                                <div className="border border-(--neutral-light-hover) rounded-lg flex justify-between p-3 ">
                                    <div className="flex items-center gap-3">
                                        <div className="flex justify-center  items-center h-[22px] w-[22px] p-0.5 bg-(--success-light-active) rounded-full">
                                            <span
                                                style={{
                                                    display: 'inline-block',
                                                    width: '16px',
                                                    height: '16px',
                                                    backgroundColor: '#16A34A',
                                                    WebkitMaskImage: `url('/icons/user.svg')`,
                                                    maskImage: `url('/icons/user.svg')`,
                                                    WebkitMaskRepeat: 'no-repeat',
                                                    maskRepeat: 'no-repeat',
                                                    WebkitMaskPosition: 'center',
                                                    maskPosition: 'center',
                                                    WebkitMaskSize: 'contain',
                                                    maskSize: 'contain',

                                                }}
                                            ></span>
                                        </div>
                                        <span className="text-[12px] font-medium leading-4 text-[#000000] ">Personal Information</span>
                                    </div>
                                    <div className="flex justify-center  items-center h-[22px] w-[22px] p-0.5 bg-(--success-normal) rounded-full">
                                        <span
                                            style={{
                                                display: 'inline-block',
                                                width: '16px',
                                                height: '16px',
                                                backgroundColor: '#FEFEFE',
                                                WebkitMaskImage: `url('/icons/check.svg')`,
                                                maskImage: `url('/icons/check.svg')`,
                                                WebkitMaskRepeat: 'no-repeat',
                                                maskRepeat: 'no-repeat',
                                                WebkitMaskPosition: 'center',
                                                maskPosition: 'center',
                                                WebkitMaskSize: 'contain',
                                                maskSize: 'contain',

                                            }}
                                        ></span>
                                    </div>
                                </div>
                                <div className="border border-(--neutral-light-hover) rounded-lg flex justify-between p-3 ">
                                    <div className="flex items-center gap-3">
                                        <div className="flex justify-center  items-center h-[22px] w-[22px] p-0.5 bg-(--neutral-light-active) rounded-full">
                                            <span
                                                style={{
                                                    display: 'inline-block',
                                                    width: '16px',
                                                    height: '16px',
                                                    backgroundColor: '#16A34A',
                                                    WebkitMaskImage: `url('/icons/user.svg')`,
                                                    maskImage: `url('/icons/user.svg')`,
                                                    WebkitMaskRepeat: 'no-repeat',
                                                    maskRepeat: 'no-repeat',
                                                    WebkitMaskPosition: 'center',
                                                    maskPosition: 'center',
                                                    WebkitMaskSize: 'contain',
                                                    maskSize: 'contain',

                                                }}
                                            ></span>
                                        </div>
                                        <span className="text-[12px] font-medium leading-4 text-[#000000] ">Personal Information</span>
                                    </div>
                                    <div className="flex justify-center  items-center h-[22px] w-[22px] p-0.5 bg-(--success-normal) rounded-full">
                                        <span
                                            style={{
                                                display: 'inline-block',
                                                width: '16px',
                                                height: '16px',
                                                backgroundColor: '#FEFEFE',
                                                WebkitMaskImage: `url('/icons/check.svg')`,
                                                maskImage: `url('/icons/check.svg')`,
                                                WebkitMaskRepeat: 'no-repeat',
                                                maskRepeat: 'no-repeat',
                                                WebkitMaskPosition: 'center',
                                                maskPosition: 'center',
                                                WebkitMaskSize: 'contain',
                                                maskSize: 'contain',

                                            }}
                                        ></span>
                                    </div>
                                </div>
                                <div className="border border-(--neutral-light-hover) rounded-lg flex justify-between p-3 ">
                                    <div className="flex items-center gap-3">
                                        <div className="flex justify-center  items-center h-[22px] w-[22px] p-0.5 bg-(--success-light-active) rounded-full">
                                            <span
                                                style={{
                                                    display: 'inline-block',
                                                    width: '16px',
                                                    height: '16px',
                                                    backgroundColor: '#16A34A',
                                                    WebkitMaskImage: `url('/icons/user.svg')`,
                                                    maskImage: `url('/icons/user.svg')`,
                                                    WebkitMaskRepeat: 'no-repeat',
                                                    maskRepeat: 'no-repeat',
                                                    WebkitMaskPosition: 'center',
                                                    maskPosition: 'center',
                                                    WebkitMaskSize: 'contain',
                                                    maskSize: 'contain',

                                                }}
                                            ></span>
                                        </div>
                                        <span className="text-[12px] font-medium leading-4 text-[#000000] ">Personal Information</span>
                                    </div>
                                    <div className="flex justify-center  items-center h-[22px] w-[22px] p-0.5 rounded-full">
                                        <span
                                            style={{
                                                display: 'inline-block',
                                                width: '16px',
                                                height: '16px',
                                                backgroundColor: '#B7BABD',
                                                WebkitMaskImage: `url('/icons/chevron-right.svg')`,
                                                maskImage: `url('/icons/chevron-right.svg')`,
                                                WebkitMaskRepeat: 'no-repeat',
                                                maskRepeat: 'no-repeat',
                                                WebkitMaskPosition: 'center',
                                                maskPosition: 'center',
                                                WebkitMaskSize: 'contain',
                                                maskSize: 'contain',

                                            }}
                                        ></span>
                                    </div>
                                </div>
                                <div className="border border-(--neutral-light-hover) rounded-lg flex justify-between p-3 ">
                                    <div className="flex items-center gap-3">
                                        <div className="flex justify-center  items-center h-[22px] w-[22px] p-0.5 bg-(--success-light-active) rounded-full">
                                            <span
                                                style={{
                                                    display: 'inline-block',
                                                    width: '16px',
                                                    height: '16px',
                                                    backgroundColor: '#16A34A',
                                                    WebkitMaskImage: `url('/icons/user.svg')`,
                                                    maskImage: `url('/icons/user.svg')`,
                                                    WebkitMaskRepeat: 'no-repeat',
                                                    maskRepeat: 'no-repeat',
                                                    WebkitMaskPosition: 'center',
                                                    maskPosition: 'center',
                                                    WebkitMaskSize: 'contain',
                                                    maskSize: 'contain',

                                                }}
                                            ></span>
                                        </div>
                                        <span className="text-[12px] font-medium leading-4 text-[#000000] ">Personal Information</span>
                                    </div>
                                    <div className="flex justify-center  items-center h-[22px] w-[22px] p-0.5  rounded-full">
                                        <span
                                            style={{
                                                display: 'inline-block',
                                                width: '16px',
                                                height: '16px',
                                                backgroundColor: '#B7BABD',
                                                WebkitMaskImage: `url('/icons/chevron-right.svg')`,
                                                maskImage: `url('/icons/chevron-right.svg')`,
                                                WebkitMaskRepeat: 'no-repeat',
                                                maskRepeat: 'no-repeat',
                                                WebkitMaskPosition: 'center',
                                                maskPosition: 'center',
                                                WebkitMaskSize: 'contain',
                                                maskSize: 'contain',

                                            }}
                                        ></span>
                                    </div>
                                </div>

                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    )
}

