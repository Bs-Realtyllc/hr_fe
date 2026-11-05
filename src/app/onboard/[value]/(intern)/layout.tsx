'use client'

import type { ReactNode } from 'react'
import { InternOnboardingProvider } from './_context/InternOnboardingContext'

// Shared across every step in this route group, so data survives client-side
// navigation between pages. Renders no markup of its own.
export default function InternOnboardingLayout({ children }: { children: ReactNode }) {
    return <InternOnboardingProvider>{children}</InternOnboardingProvider>
}
