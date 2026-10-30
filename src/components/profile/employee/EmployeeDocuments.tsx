
'use client';

import { useState } from 'react';
import Button from '@/components/Button/Button';
import FileUpload from '@/components/FileUpload/FileUpload';

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

type DocumentsState = Record<DocKey, File | null>;

type ErrorsState = Partial<Record<DocKey, string>>;

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
    const [documents, setDocuments] =
        useState<DocumentsState>(INITIAL_DOCUMENTS);

    const [errors, setErrors] = useState<ErrorsState>({});

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

    // Icons
    const sectionIcons: Record<string, string> = {
        'Personal Documents': '/icons/user.svg',
        'Tax Documents': '/icons/file-02.svg',
        'Educational Documents': '/icons/certificate.svg',
        'Employment Documents': '/icons/file-text.svg',
    };

    return (
        <div className="flex flex-col gap-4">
            {DOCUMENT_SECTIONS.map((section) => (
                <section
                    key={section.title}
                    className="flex flex-col gap-4 p-3"
                >
                    {/* Section Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EBF5FB] text-[#4A6FA5]">

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
                            className="text-[#235E94]!"
                            variant="text"
                            size="small"
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
                            Edit
                        </Button>
                    </div>

                    {/* Document Uploads */}
                    <div className="flex flex-wrap justify-between">
                        {section.documents.map(
                            ({ key, label, required, optional }) => (
                                <div className=' w-[378px]'>
                                    <FileUpload

                                        key={key}
                                        name={key}
                                        label={
                                            optional ? (
                                                <>
                                                    {label}{' '}
                                                    <span className="text-[#919395]">
                                                        (optional)
                                                    </span>
                                                </>
                                            ) : (
                                                label
                                            )
                                        }
                                        required={required}
                                        value={documents[key]}
                                        onChange={(file) =>
                                            handleFileChange(key, file)
                                        }
                                        error={errors[key]}
                                    />
                                </div>
                            )
                        )}
                    </div>
                </section>
            ))}
        </div>
    );
};

export default EmployeeDocuments;
