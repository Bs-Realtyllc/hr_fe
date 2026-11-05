"use client";

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from "react";

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
    data: OnboardingData;
    updateSection: <K extends keyof OnboardingData>(
        section: K,
        value: OnboardingData[K],
    ) => void;
    reset: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
    const [data, setData] = useState<OnboardingData>(INITIAL_DATA);

    const updateSection = useCallback(
        <K extends keyof OnboardingData>(section: K, value: OnboardingData[K]) => {
            setData((current) => ({ ...current, [section]: value }));
        },
        [],
    );

    const reset = useCallback(() => setData(INITIAL_DATA), []);
    const contextValue = useMemo(
        () => ({ data, updateSection, reset }),
        [data, updateSection, reset],
    );

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
