'use client'

import { useAuth } from "@/contexts/AuthContext";
import { BSRealtyAvatar, BSRealtyNotification } from "@bsrealtyllc/design-system";
import type { ReactNode } from "react";

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
                <BSRealtyNotification icon={
                    <img
                        src={'/icons/bell.svg'}
                        alt=""
                        width={20}
                        height={20}
                    />
                }
                    showIndicator={true} />
                {user &&
                    <BSRealtyAvatar size='sm' title={user.name} name={initials(user.name)} style={{ cursor: 'pointer' }} />
                }
            </div>
        </div>
    )
}