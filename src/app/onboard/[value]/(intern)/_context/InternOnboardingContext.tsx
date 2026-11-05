'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

/* ---------- Types (one per step) ---------- */

/** Step 1 — /personal-info */
export type PersonalInfo = {
    name: string
    dob: string // "YYYY-MM-DD"
    gender: string // 'male' | 'female' | 'other'
    nationality: string
    email: string
    phone: string
    currentAddress: string
    permanentAddress: string
}

/** Step 2 — /employee-info */
export type EmploymentInfo = {
    jobTitle: string
    department: string // 'admin' | 'design' | 'engineering' | 'finance' | 'hr' | 'it' | 'marketing'
    startDate: string // "YYYY-MM-DD"
    reportingManager: string // optional
    employmentType: string // 'full_time' | 'part_time' | 'contract' | 'internship'
    workLocation: string
}

/** Step 3 — /emergency-contact */
export type EmergencyContact = {
    fullName: string
    relationship: string // 'parent' | 'cousin' | 'patner' | 'neighbour' | 'nephew'
    phone: string
    email: string // optional
    address: string // optional
}

/** Step 4 — /documents */
export type DocumentKey =
    | 'citizenshipFront'
    | 'citizenshipBack'
    | 'panFront'
    | 'panBack'
    | 'educational'
    | 'additional'
export type Documents = Record<DocumentKey, File | null>

/** Step 5 — /contract-sign */
export type ContractDocumentKey = 'signedContract' | 'offerLetter' | 'otherEmployment'
export type ContractDocuments = Record<ContractDocumentKey, File | null>

/** The single state object holding every step's data */
export type InternOnboardingData = {
    personalInfo: PersonalInfo
    employmentInfo: EmploymentInfo
    emergencyContact: EmergencyContact
    documents: Documents
    contractDocuments: ContractDocuments
    confirmed: boolean
}

type SectionKey = Exclude<keyof InternOnboardingData, 'confirmed'>

/* ---------- Initial state ---------- */

export const INITIAL_ONBOARDING_DATA: InternOnboardingData = {
    personalInfo: {
        name: '',
        dob: '',
        gender: '',
        nationality: '',
        email: '',
        phone: '',
        currentAddress: '',
        permanentAddress: '',
    },
    employmentInfo: {
        jobTitle: '',
        department: '',
        startDate: '',
        reportingManager: '',
        employmentType: '',
        workLocation: '',
    },
    emergencyContact: {
        fullName: '',
        relationship: '',
        phone: '',
        email: '',
        address: '',
    },
    documents: {
        citizenshipFront: null,
        citizenshipBack: null,
        panFront: null,
        panBack: null,
        educational: null,
        additional: null,
    },
    contractDocuments: {
        signedContract: null,
        offerLetter: null,
        otherEmployment: null,
    },
    confirmed: false,
}

/* ---------- Completeness check for earlier steps ---------- */

// Required fields per step. State lives in memory only, so a page refresh mid-flow
// wipes earlier steps — the final submit uses this to catch that before posting.
const REQUIRED_STEPS: { section: SectionKey; label: string; keys: string[] }[] = [
    {
        section: 'personalInfo',
        label: 'Personal Information',
        keys: ['name', 'dob', 'gender', 'nationality', 'email', 'phone', 'currentAddress', 'permanentAddress'],
    },
    {
        section: 'employmentInfo',
        label: 'Employment Information',
        keys: ['jobTitle', 'department', 'startDate', 'employmentType', 'workLocation'],
    },
    {
        section: 'emergencyContact',
        label: 'Emergency Contact',
        keys: ['fullName', 'relationship', 'phone'],
    },
    {
        section: 'documents',
        label: 'Documents',
        keys: ['citizenshipFront', 'citizenshipBack', 'panFront', 'panBack', 'educational', 'additional'],
    },
]

/** Returns the label of the first earlier step with a missing required field, or null if all complete. */
export function findIncompleteStep(data: InternOnboardingData): string | null {
    for (const { section, label, keys } of REQUIRED_STEPS) {
        const values = data[section] as Record<string, string | File | null>
        const missing = keys.some((key) => {
            const v = values[key]
            return typeof v === 'string' ? !v.trim() : !v
        })
        if (missing) return label
    }
    return null
}

/* ---------- Request body ---------- */

/** JSON part of the submission (sent as the `payload` field) */
export type OnboardingPayload = {
    role: string // route value: 'intern' | 'employee'
    personalInfo: PersonalInfo
    employmentInfo: Omit<EmploymentInfo, 'reportingManager'> & { reportingManager: string | null }
    emergencyContact: Omit<EmergencyContact, 'email' | 'address'> & { email: string | null; address: string | null }
    confirmed: boolean
}

export function buildPayload(data: InternOnboardingData, role: string): OnboardingPayload {
    const { personalInfo: p, employmentInfo: e, emergencyContact: c } = data
    return {
        role,
        personalInfo: {
            ...p,
            name: p.name.trim(),
            nationality: p.nationality.trim(),
            email: p.email.trim().toLowerCase(),
            phone: p.phone.trim(),
            currentAddress: p.currentAddress.trim(),
            permanentAddress: p.permanentAddress.trim(),
        },
        employmentInfo: {
            ...e,
            jobTitle: e.jobTitle.trim(),
            reportingManager: e.reportingManager.trim() || null,
            workLocation: e.workLocation.trim(),
        },
        emergencyContact: {
            fullName: c.fullName.trim(),
            relationship: c.relationship,
            phone: c.phone.trim(),
            email: c.email.trim().toLowerCase() || null,
            address: c.address.trim() || null,
        },
        confirmed: data.confirmed,
    }
}

/**
 * multipart/form-data body:
 *   payload          — JSON string of OnboardingPayload
 *   <DocumentKey>    — one file per identity/tax/education document
 *   <ContractDocumentKey> — signed contract (+ optional offer letter / other docs)
 */
export function buildFormData(data: InternOnboardingData, role: string): FormData {
    const body = new FormData()
    body.append('payload', JSON.stringify(buildPayload(data, role)))

    const files = { ...data.documents, ...data.contractDocuments }
    Object.entries(files).forEach(([key, file]) => {
        if (file) body.append(key, file, file.name)
    })
    return body
}

/* ---------- Context ---------- */

type InternOnboardingContextValue = {
    data: InternOnboardingData
    updateSection: <S extends SectionKey>(section: S, patch: Partial<InternOnboardingData[S]>) => void
    setConfirmed: (confirmed: boolean) => void
    reset: () => void
}

const InternOnboardingContext = createContext<InternOnboardingContextValue | null>(null)

export function InternOnboardingProvider({ children }: { children: ReactNode }) {
    const [data, setData] = useState<InternOnboardingData>(INITIAL_ONBOARDING_DATA)

    const updateSection = useCallback(
        <S extends SectionKey>(section: S, patch: Partial<InternOnboardingData[S]>) => {
            setData((prev) => ({ ...prev, [section]: { ...prev[section], ...patch } }))
        },
        []
    )

    const setConfirmed = useCallback((confirmed: boolean) => {
        setData((prev) => ({ ...prev, confirmed }))
    }, [])

    const reset = useCallback(() => setData(INITIAL_ONBOARDING_DATA), [])

    const value = useMemo(
        () => ({ data, updateSection, setConfirmed, reset }),
        [data, updateSection, setConfirmed, reset]
    )

    return <InternOnboardingContext.Provider value={value}>{children}</InternOnboardingContext.Provider>
}

export function useInternOnboarding() {
    const ctx = useContext(InternOnboardingContext)
    if (!ctx) throw new Error('useInternOnboarding must be used inside InternOnboardingProvider')
    return ctx
}
