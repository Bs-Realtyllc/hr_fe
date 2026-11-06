'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/Button/Button';
import FileUpload from '@/components/FileUpload/FileUpload';
import { profileService } from '@/lib/profileService';
import { getToken } from '@/lib/auth';

const BACKEND = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/api\/?$/, '');

/* ---------- Document Configuration ---------- */

type DocKey =
    | 'citizenshipFront'
    | 'citizenshipBack'
    | 'panFront'
    | 'panBack'
    | 'educational'
    | 'additionalEducational'
    | 'signedEmp'
    | 'offerLetter'
    | 'employmentDoc';

type DocField = {
    key: DocKey;
    label: string;
    required: boolean;
    optional?: boolean;
};

type DocumentSection = {
    title: string;
    documents: DocField[];
};

const DOCUMENT_SECTIONS: DocumentSection[] = [
    {
        title: 'Personal Documents',
        documents: [
            {
                key: 'citizenshipFront',
                label: 'Citizenship/National ID - Front',
                required: true,
            },
            {
                key: 'citizenshipBack',
                label: 'Citizenship/National ID - Back',
                required: true,
            },
        ],
    },
    {
        title: 'Tax Documents',
        documents: [
            {
                key: 'panFront',
                label: 'PAN Card - Front',
                required: true,
            },
            {
                key: 'panBack',
                label: 'PAN Card - Back',
                required: true,
            },
        ],
    },
    {
        title: 'Educational Documents',
        documents: [
            {
                key: 'educational',
                label: 'Educational Documents',
                required: true,
            },
            {
                key: 'additionalEducational',
                label: 'Additional Educational',
                required: true,
            },
        ],
    },
    {
        title: 'Employment Documents',
        documents: [
            {
                key: 'signedEmp',
                label: 'Employment / Internship Contract',
                required: true,
            },
            {
                key: 'offerLetter',
                label: 'Offer Letter',
                required: false,
                optional: true,
            },
            {
                key: 'employmentDoc',
                label: 'Employment Documents',
                required: false,
                optional: true,
            },
        ],
    },
];

/* ---------- Document State ---------- */

type DocumentsState = Record<DocKey, File | string | null>;
type ErrorsState = Partial<Record<DocKey, string>>;
type EditingState = Record<string, boolean>;
type CitizenshipPreviewFiles = Partial<Record<'citizenshipFront' | 'citizenshipBack', File>>;

const INITIAL_DOCUMENTS: DocumentsState = {
    citizenshipFront: null,
    citizenshipBack: null,
    panFront: null,
    panBack: null,
    educational: null,
    additionalEducational: null,
    signedEmp: null,
    offerLetter: null,
    employmentDoc: null,
};

/* ---------- Component ---------- */

const EmployeeDocuments = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [documents, setDocuments] = useState<DocumentsState>(INITIAL_DOCUMENTS);
    const [errors, setErrors] = useState<ErrorsState>({});
    const [citizenshipPreviewFiles, setCitizenshipPreviewFiles] = useState<CitizenshipPreviewFiles>({});

    // Section-wise editing toggles
    const [isEditingSection, setIsEditingSection] = useState<EditingState>({});

    // Fetch profile and document data on mount
    useEffect(() => {
        async function loadDocuments() {
            try {
                setLoading(true);
                const data = await profileService.getProfile();
                console.log("Fetched Profile Data for Documents:", data);

                const loadedDocuments: DocumentsState = {
                    citizenshipFront: (data as any).citizenship_front || (data as any).citizenshipFront || null,
                    citizenshipBack: (data as any).citizenship_back || (data as any).citizenshipBack || null,
                    panFront: (data as any).pan_front || (data as any).panFront || null,
                    panBack: (data as any).pan_back || (data as any).panBack || null,
                    educational: (data as any).educational_docs || (data as any).educational || null,
                    additionalEducational: (data as any).additional_educational || (data as any).additionalEducational || null,
                    signedEmp: (data as any).signed_emp || (data as any).signedEmp || null,
                    offerLetter: (data as any).offer_letter || (data as any).offerLetter || null,
                    employmentDoc: (data as any).employment_doc || (data as any).employmentDoc || null,
                };
                setDocuments(loadedDocuments);

                const token = getToken();
                const citizenshipKeys = ['citizenshipFront', 'citizenshipBack'] as const;
                const previews = await Promise.all(
                    citizenshipKeys.map(async (key) => {
                        const filename = loadedDocuments[key];
                        if (typeof filename !== 'string') return [key, null] as const;

                        try {
                            const response = await fetch(
                                `${BACKEND}/uploads/docs/${encodeURIComponent(filename)}`,
                                { headers: token ? { Authorization: `Bearer ${token}` } : {} },
                            );
                            if (!response.ok) return [key, null] as const;

                            const blob = await response.blob();
                            const extension = filename.split('.').pop()?.toLowerCase();
                            const mimeType = blob.type || (
                                extension === 'png' ? 'image/png' :
                                extension === 'webp' ? 'image/webp' :
                                'image/jpeg'
                            );
                            return [key, new File([blob], filename, { type: mimeType })] as const;
                        } catch {
                            return [key, null] as const;
                        }
                    }),
                );
                setCitizenshipPreviewFiles(
                    Object.fromEntries(previews.filter((entry) => entry[1] !== null)) as CitizenshipPreviewFiles,
                );
            } catch (err: any) {
                setError(err.message || "Failed to load documents");
            } finally {
                setLoading(false);
            }
        }
        loadDocuments();
    }, []);

    const handleFileChange = (key: DocKey, file: File | null) => {
        setDocuments((prev) => ({
            ...prev,
            [key]: file,
        }));

        if (file) {
            setErrors((prev) => ({
                ...prev,
                [key]: undefined,
            }));
        }
    };

    const toggleEditSection = (title: string) => {
        setIsEditingSection((prev) => ({
            ...prev,
            [title]: !prev[title],
        }));
    };

    const handleSaveSection = async (sectionTitle: string) => {
        try {
            if (sectionTitle === 'Personal Documents') {
                const citizenshipFiles = [
                    ['front', 'citizenshipFront'],
                    ['back', 'citizenshipBack'],
                ] as const;

                for (const [side, key] of citizenshipFiles) {
                    const file = documents[key];
                    if (file instanceof File) {
                        const { filename } = await profileService.uploadCitizenship(side, file);
                        setDocuments((prev) => ({ ...prev, [key]: filename }));
                        setCitizenshipPreviewFiles((prev) => ({ ...prev, [key]: file }));
                    }
                }
            } else {
                await profileService.updateProfile({
                    citizenship_front: documents.citizenshipFront,
                    citizenship_back: documents.citizenshipBack,
                    pan_front: documents.panFront,
                    pan_back: documents.panBack,
                    educational: documents.educational,
                    additional_educational: documents.additionalEducational,
                    signed_emp: documents.signedEmp,
                    offer_letter: documents.offerLetter,
                    employment_doc: documents.employmentDoc,
                } as any);
            }

            console.log(`Saved section: ${sectionTitle}`);
            setIsEditingSection((prev) => ({
                ...prev,
                [sectionTitle]: false,
            }));
        } catch (err: any) {
            alert(err.message || "Failed to save document changes");
        }
    };

    // Icons
    const sectionIcons: Record<string, string> = {
        'Personal Documents': '/icons/user.svg',
        'Tax Documents': '/icons/file-02.svg',
        'Educational Documents': '/icons/certificate.svg',
        'Employment Documents': '/icons/file-text.svg',
    };

    if (loading) return <div className="p-4 text-gray-500">Loading documents...</div>;
    if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

    return (
        <div className="flex flex-col gap-4">
            {DOCUMENT_SECTIONS.map((section) => {
                const isEditing = !!isEditingSection[section.title];

                return (
                    <section
                        key={section.title}
                        className="flex flex-col gap-4 p-3"
                    >
                        {/* Section Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-(--blue-sky-light) text-(--blue-salt)">
                                    <span
                                        className="inline-block"
                                        style={{
                                            width: '20px',
                                            height: '20px',
                                            backgroundColor: 'currentColor',
                                            maskImage: `url(${sectionIcons[section.title]})`,
                                            maskSize: 'contain',
                                            maskRepeat: 'no-repeat',
                                            WebkitMaskImage: `url(${sectionIcons[section.title]})`,
                                            WebkitMaskSize: 'contain',
                                            WebkitMaskRepeat: 'no-repeat',
                                        }}
                                    />
                                </div>

                                <h2 className="text-[16px] font-semibold text-[#232931]">
                                    {section.title}
                                </h2>
                            </div>

                            <Button
                                className="text-(--blue-dark-normal)!"
                                variant="text"
                                size="small"
                                onClick={() => toggleEditSection(section.title)}
                                leftIcon={
                                    <span
                                        className="inline-block"
                                        style={{
                                            width: '20px',
                                            height: '20px',
                                            backgroundColor: 'currentColor',
                                            maskImage: 'url(/icons/edit-4.svg)',
                                            maskSize: 'contain',
                                            maskRepeat: 'no-repeat',
                                            WebkitMaskImage:
                                                'url(/icons/edit-4.svg)',
                                            WebkitMaskSize: 'contain',
                                            WebkitMaskRepeat: 'no-repeat',
                                        }}
                                    />
                                }
                            >
                                {isEditing ? "Cancel" : "Edit"}
                            </Button>
                        </div>

                        {/* Document Uploads or View Display */}
                        <div className="flex flex-wrap justify-between gap-4">
                            {section.documents.map(
                                ({ key, label, required, optional }) => {
                                    const fileValue = documents[key];
                                    const isCitizenship =
                                        key === 'citizenshipFront' || key === 'citizenshipBack';
                                    const hasSavedCitizenship = isCitizenship && typeof fileValue === 'string';
                                    const showEmptyCitizenshipUpload =
                                        !isEditing && isCitizenship && !fileValue;
                                    const showCitizenshipPreview =
                                        !isEditing &&
                                        hasSavedCitizenship &&
                                        citizenshipPreviewFiles[key as 'citizenshipFront' | 'citizenshipBack'] !== undefined;

                                    return (
                                        <div key={key} className="w-[378px]">
                                            {isEditing || showEmptyCitizenshipUpload || showCitizenshipPreview ? (
                                                <FileUpload
                                                    name={key}
                                                    label={
                                                        optional ? (
                                                            <>
                                                                {label}{' '}
                                                                <span className="text-(--soft-white-dark-hover)">
                                                                    (optional)
                                                                </span>
                                                            </>
                                                        ) : (
                                                            label
                                                        )
                                                    }
                                                    required={required}
                                                    maxSizeMB={
                                                        key === 'citizenshipFront' || key === 'citizenshipBack'
                                                            ? 5
                                                            : 10
                                                    }
                                                    allowedExtensions={
                                                        key === 'citizenshipFront' || key === 'citizenshipBack'
                                                            ? ['.jpg', '.jpeg', '.png', '.webp']
                                                            : undefined
                                                    }
                                                    value={
                                                        showCitizenshipPreview
                                                            ? citizenshipPreviewFiles[key as 'citizenshipFront' | 'citizenshipBack'] ?? null
                                                            : typeof fileValue === 'string'
                                                                ? null
                                                                : fileValue
                                                    }
                                                    disabled={showCitizenshipPreview}
                                                    multiple={false}
                                                    onChange={(file) => {
                                                        const selectedFile = Array.isArray(file) ? file[0] ?? null : file;
                                                        handleFileChange(key, selectedFile);
                                                        if (showEmptyCitizenshipUpload && selectedFile) {
                                                            setIsEditingSection((prev) => ({
                                                                ...prev,
                                                                [section.title]: true,
                                                            }));
                                                        }
                                                    }}
                                                    error={errors[key]}
                                                />
                                            ) : (
                                                <div className="flex flex-col border-b border-(--neutral-light) py-3">
                                                    <span className="text-[14px] font-medium text-(--gray-darker)">
                                                        {label}
                                                    </span>
                                                    {fileValue ? (
                                                        typeof fileValue === 'string' ? (
                                                            isCitizenship ? (
                                                                <>
                                                                    <p className="text-[14px] font-medium text-(--white-darker) mt-1 truncate">
                                                                        {fileValue}
                                                                    </p>
                                                                    {hasSavedCitizenship && !showCitizenshipPreview && (
                                                                        <p className="text-xs text-(--gray-darker) mt-1">
                                                                            Preview unavailable
                                                                        </p>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <a
                                                                    href={fileValue}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-[14px] font-medium text-(--blue-dark-normal) underline mt-1 truncate"
                                                                >
                                                                    View Document
                                                                </a>
                                                            )
                                                        ) : (
                                                            <p className="text-[14px] font-medium text-(--white-darker) mt-1 truncate">
                                                                {fileValue.name}
                                                            </p>
                                                        )
                                                    ) : (
                                                        <p className="text-[14px] font-medium text-(--white-darker) mt-1">-</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }
                            )}
                        </div>

                        {isEditing && (
                            <div className="flex justify-end gap-2 mt-2">
                                <Button type="button" size="xs" onClick={() => handleSaveSection(section.title)}>
                                    Save Changes
                                </Button>
                            </div>
                        )}
                    </section>
                );
            })}
        </div>
    );
};

export default EmployeeDocuments;