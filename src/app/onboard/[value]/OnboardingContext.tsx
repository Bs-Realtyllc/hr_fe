"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
    DEFAULT_LAYOUT,
    isStepVisible,
    nextStep,
    prevStep,
    resolveLayout,
    sectionHelpers,
    type ResolvedLayout,
    type SectionKey,
    type StepPath,
} from "./formLayout";

export type PersonalInfo = {
    name: string;
    dob: string;
    gender: string;
    nationality: string;
    email: string;
    phone: string;
    linkedin: string;
    github: string;
    portfolio: string;
    currentAddress: string;
    permanentAddress: string;
};

export type EmploymentInfo = {
    jobTitle: string;
    department: string;
    startDate: string;
    reportingManager: string;
    employmentType: string;
    workLocation: string;
};

export type EducationItem = {
    id: string;
    educationLevel: string;
    degree: string;
    institution: string;
    graduationYear: string;
    currentEnrollment: boolean;
    document: File | null;
};

export type ExperienceItem = {
    id: string;
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    currentWorking: boolean;
    employeeType: string;
    workType: string;
    description: string;
    document: File | null;
};

export type EmergencyContact = {
    fullName: string;
    relationship: string;
    phone: string;
    email: string;
    address: string;
};

export type OnboardingDocumentKey =
    | "citizenshipFront"
    | "citizenshipBack"
    | "panFront"
    | "panBack"
    | "educational"
    | "additional"
    | "passportSizePhoto";

export type ContractDocumentKey = "signedContract" | "offerLetter" | "otherEmployment";

export type ContractDocuments = {
    signedContract: File | null;
    offerLetter: File | null;
    /** Up to MAX_OTHER_DOCUMENTS files, sent as repeated "otherDocument" parts. */
    otherEmployment: File[];
};

export type OnboardingData = {
    personalInfo: PersonalInfo;
    employmentInfo: EmploymentInfo;
    educations: EducationItem[];
    experiences: ExperienceItem[];
    emergencyContact: EmergencyContact;
    documents: Record<OnboardingDocumentKey, File | null>;
    contractDocuments: ContractDocuments;
    sameAsCurrent: boolean;
    confirmed: boolean;
};

const INITIAL_DATA: OnboardingData = {
    personalInfo: {
        name: "",
        dob: "",
        gender: "",
        nationality: "",
        email: "",
        phone: "",
        linkedin: "",
        github: "",
        portfolio: "",
        currentAddress: "",
        permanentAddress: "",
    },
    employmentInfo: {
        jobTitle: "",
        department: "",
        startDate: "",
        reportingManager: "",
        employmentType: "",
        workLocation: "",
    },
    educations: [{
        id: "education-initial",
        educationLevel: "",
        degree: "",
        institution: "",
        graduationYear: "",
        currentEnrollment: false,
        document: null,
    }],
    experiences: [{
        id: "experience-initial",
        company: "",
        role: "",
        startDate: "",
        endDate: "",
        currentWorking: false,
        employeeType: "",
        workType: "",
        description: "",
        document: null,
    }],
    emergencyContact: {
        fullName: "",
        relationship: "",
        phone: "",
        email: "",
        address: "",
    },
    documents: {
        passportSizePhoto: null,
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
        otherEmployment: [],
    },
    sameAsCurrent: false,
    confirmed: false,
};

type OnboardingContextValue = {
    role: "intern" | "employee";
    /** Admin-configured fields per section (DEFAULT_LAYOUT if none configured). */
    layout: ResolvedLayout;
    /** True when the layout failed to load and the full default form is shown. */
    layoutFallback: boolean;
    data: OnboardingData;
    updateSection: <K extends keyof OnboardingData>(
        section: K,
        value: OnboardingData[K],
    ) => void;
    reset: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({
    role,
    children,
}: {
    role: "intern" | "employee";
    children: ReactNode;
}) {
    const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
    const [layout, setLayout] = useState<ResolvedLayout | null>(null);
    const [layoutFallback, setLayoutFallback] = useState(false);

    // Public endpoint: the candidate isn't logged in, so no auth header.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/form-layout?type=${role}`,
                );
                if (!res.ok) throw new Error(`form-layout ${res.status}`);
                const resolved = resolveLayout(await res.json(), role);
                if (cancelled) return;
                setLayout(resolved.layout);
                setLayoutFallback(false);
            } catch (err) {
                console.error("Could not load form layout", err);
                if (cancelled) return;
                setLayout(DEFAULT_LAYOUT);
                setLayoutFallback(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [role]);

    const updateSection = useCallback(
        <K extends keyof OnboardingData>(section: K, value: OnboardingData[K]) => {
            setData((current) => ({ ...current, [section]: value }));
        },
        [],
    );

    const reset = useCallback(() => setData(INITIAL_DATA), []);
    const contextValue = useMemo(
        () => ({
            role,
            layout: layout ?? DEFAULT_LAYOUT,
            layoutFallback,
            data,
            updateSection,
            reset,
        }),
        [role, layout, layoutFallback, data, updateSection, reset],
    );

    if (!layout) {
        return (
            <div className="flex min-h-screen items-center justify-center text-[14px] text-(--gray-dark)">
                Loading form…
            </div>
        );
    }

    return (
        <OnboardingContext.Provider value={contextValue}>
            {children}
        </OnboardingContext.Provider>
    );
}

export function useOnboarding() {
    const context = useContext(OnboardingContext);
    if (!context) {
        throw new Error("useOnboarding must be used within OnboardingProvider");
    }
    return context;
}

/**
 * Layout + navigation for one onboarding step. Redirects to the next step when
 * this step's section has no fields in the layout.
 */
export function useOnboardingStep(path: StepPath, section: SectionKey) {
    const router = useRouter();
    const { role, layout } = useOnboarding();
    const visible = isStepVisible(layout, path);
    const next = nextStep(layout, path);
    const prev = prevStep(layout, path);

    useEffect(() => {
        if (!visible) router.replace(`/onboard/${role}/${next}`);
    }, [visible, next, role, router]);

    return {
        ...sectionHelpers(layout[section]),
        /** False while redirecting away from a hidden step; render nothing then. */
        stepVisible: visible,
        goNext: () => router.push(`/onboard/${role}/${next}`),
        goBack: () => router.push(`/onboard/${role}/${prev}`),
    };
}
