
'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/Button/Button';
import FileUpload from '@/components/FileUpload/FileUpload';
import { profileService } from '@/lib/profileService';
import type { DocsType } from '@/lib/profileService';

type FieldKey =
    | 'idFront'
    | 'idBack'
    | 'panFront'
    | 'panBack'
    | 'educationCertificate'
    | 'experienceLetter'
    | 'contract'
    | 'otherDocument';

type DocField = {
    key: FieldKey;
    label: string;
    required: boolean;
    optional?: boolean;
    multiple?: boolean; // up to MAX_FILES files
};

type DocumentSection = {
    title: string;
    icon: string;
    endpoint: string; // PATCH endpoint that saves this section's files
    imagesOnly: boolean; // ID and PAN accept images only
    actionLabel: string;
    documents: DocField[];
};

const MAX_FILES = 4;

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const IMAGE_AND_PDF_EXTENSIONS = [...IMAGE_EXTENSIONS, '.pdf'];

const DOCUMENT_SECTIONS: DocumentSection[] = [
    {
        title: 'Personal Documents',
        icon: '/icons/user.svg',
        endpoint: '/profile/docs/id',
        imagesOnly: true,
        actionLabel: 'Save Changes',
        documents: [
            { key: 'idFront', label: 'Citizenship/National ID - Front', required: true },
            { key: 'idBack', label: 'Citizenship/National ID - Back', required: true },
        ],
    },
    {
        title: 'Tax Documents',
        icon: '/icons/file-02.svg',
        endpoint: '/profile/docs/pan',
        imagesOnly: true,
        actionLabel: 'Save Change',
        documents: [
            { key: 'panFront', label: 'PAN Card - Front', required: true },
            { key: 'panBack', label: 'PAN Card - Back', required: true },
        ],
    },
    {
        title: 'Educational Documents',
        icon: '/icons/certificate.svg',
        endpoint: '/profile/docs/educational',
        imagesOnly: false,
        actionLabel: 'Save Change',
        documents: [
            { key: 'educationCertificate', label: 'Educational Documents', required: true, multiple: true },
        ],
    },
    {
        title: 'Previous Experience',
        icon: '/icons/briefcase.svg',
        endpoint: '/profile/docs/employment',
        imagesOnly: false,
        actionLabel: 'Save Change',
        documents: [
            { key: 'experienceLetter', label: 'Experience Letters', required: false, optional: true, multiple: true },
        ],
    },
    {
        title: 'Employment Documents',
        icon: '/icons/file-text.svg',
        endpoint: '/profile/docs/contract',
        imagesOnly: false,
        actionLabel: 'Save Change',
        documents: [
            { key: 'contract', label: 'Employment / Internship Contract', required: true },
        ],
    },
    {
        title: 'Other Documents',
        icon: '/icons/folder.svg',
        endpoint: '/profile/docs/other',
        imagesOnly: false,
        actionLabel: 'Save Change',
        documents: [
            { key: 'otherDocument', label: 'Other Documents', required: false, optional: true, multiple: true },
        ],
    },
];

/* ---------- Document State ---------- */

// picked = files chosen in the form but not saved yet
// saved  = filenames already saved on the backend
type PickedState = Partial<Record<FieldKey, File[]>>;
type SavedState = Partial<Record<FieldKey, string[]>>;
type PreviewFiles = Partial<Record<FieldKey, File[]>>;

/* ---------- Helpers ---------- */

const isFieldKey = (key: string): key is FieldKey =>
    DOCUMENT_SECTIONS.some((section) =>
        section.documents.some((document) => document.key === key)
    );

const maskIcon = (url: string) => ({
    width: '20px',
    height: '20px',
    backgroundColor: 'currentColor',
    maskImage: `url(${url})`,
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    WebkitMaskImage: `url(${url})`,
    WebkitMaskSize: 'contain',
    WebkitMaskRepeat: 'no-repeat',
});

async function loadPreviewFile(
    url: string,
    filename: string
): Promise<File | null> {
    try {
        const response = await fetch(url);

        if (!response.ok) {
            console.error(`Failed to load document preview: ${filename}`);
            return null;
        }

        const blob = await response.blob();
        const extension = filename.split('.').pop()?.toLowerCase();
        const mimeType = blob.type || (
            extension === 'pdf' ? 'application/pdf' :
                extension === 'png' ? 'image/png' :
                    extension === 'webp' ? 'image/webp' :
                        'image/jpeg'
        );

        return new File([blob], filename, {
            type: mimeType,
        });
    } catch (error) {
        console.error(`Preview loading error for ${filename}:`, error);
        return null;
    }
}

/* ---------- Component ---------- */

const EmployeeDocuments = () => {
    const [error, setError] = useState<string | null>(null);

    const [picked, setPicked] = useState<PickedState>({});
    const [saved, setSaved] = useState<SavedState>({});
    const [previewFiles, setPreviewFiles] = useState<PreviewFiles>({});

    const [editingSection, setEditingSection] = useState<
        Record<string, boolean>
    >({});

    /* ---------- Load Existing Documents ---------- */

    const loadDocuments = async () => {
        try {
            setError(null);

            const { files } = await profileService.getDocuments();
            const documentsByField: Partial<Record<FieldKey, DocsType[]>> = {};

            for (const document of files) {
                const key = document.name.replace(/\d+$/, '');
                if (!isFieldKey(key)) continue;

                documentsByField[key] ??= [];
                documentsByField[key]?.push(document);
            }

            const savedDocuments: SavedState = {};
            const previews: PreviewFiles = {};

            await Promise.all(
                DOCUMENT_SECTIONS.flatMap((section) =>
                    section.documents.map(async ({ key }) => {
                        const fieldDocuments = documentsByField[key] ?? [];
                        savedDocuments[key] = fieldDocuments.map(
                            (document) => document.filename
                        );

                        const loadedPreviews = await Promise.all(
                            fieldDocuments.map((document) =>
                                loadPreviewFile(document.url, document.filename)
                            )
                        );
                        previews[key] = loadedPreviews.filter(
                            (file): file is File => file !== null
                        );
                    })
                )
            );

            setSaved(savedDocuments);
            setPreviewFiles(previews);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load documents');
        }
    };

    useEffect(() => {
        loadDocuments();
    }, []);

    /* ---------- Edit / Cancel ---------- */

    const setEditing = (title: string, value: boolean) => {
        setEditingSection((prev) => ({
            ...prev,
            [title]: value,
        }));
    };

    const toggleEditSection = (section: DocumentSection) => {
        if (editingSection[section.title]) {
            // Cancel: discard newly selected files.
            setPicked((prev) => {
                const next = { ...prev };

                section.documents.forEach(({ key }) => {
                    delete next[key];
                });

                return next;
            });
        }

        setEditing(section.title, !editingSection[section.title]);
    };

    /* ---------- Save Section ---------- */

    const handleSaveSection = async (section: DocumentSection) => {
        const formData = new FormData();

        for (const { key, multiple } of section.documents) {
            const files = picked[key] ?? [];

            files.forEach((file, index) => {
                formData.append(
                    multiple ? `${key}_${index}` : key,
                    file
                );
            });
        }

        // No newly selected files.
        if (![...formData.keys()].length) {
            setEditing(section.title, false);
            return;
        }

        try {
            const { documents } = await profileService.uploadDocuments(
                section.endpoint,
                formData
            );

            // Update saved filenames using backend response.
            const updatedSaved: SavedState = {};

            for (const { key } of section.documents) {
                const filenames = documents
                    .filter(
                        (doc: any) =>
                            doc.name.replace(/\d+$/, '') === key
                    )
                    .map((doc: any) => doc.filename);

                if (filenames.length) {
                    updatedSaved[key] = filenames;
                }
            }

            setSaved((prev) => ({
                ...prev,
                ...updatedSaved,
            }));

            // Update previews using newly uploaded files.
            setPreviewFiles((prev) => {
                const next = { ...prev };

                for (const { key } of section.documents) {
                    const newFiles = picked[key];

                    if (newFiles?.length) {
                        next[key] = newFiles;
                    }
                }

                return next;
            });

            // Clear temporary selections.
            setPicked((prev) => {
                const next = { ...prev };

                section.documents.forEach(({ key }) => {
                    delete next[key];
                });

                return next;
            });

            setEditing(section.title, false);
        } catch (err: any) {
            alert(err.message || 'Failed to save document changes');
        }
    };

    if (error) {
        return (
            <div className="p-4 text-(--error-normal)">
                Error: {error}
            </div>
        );
    }

    // Reusable Icon Renderer
    const renderMaskIcon = (iconPath: string, size = '14px') => (
        <span style={{
            display: 'inline-block',
            width: size,
            height: size,
            backgroundColor: 'currentColor',
            maskImage: `url(${iconPath})`,
            maskSize: 'contain',
            maskRepeat: 'no-repeat',
            WebkitMaskImage: `url(${iconPath})`,
            WebkitMaskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat'
        }} />
    );

    /* ---------- UI ---------- */

    return (
        <div className="flex flex-col gap-4 pb-6">
            {DOCUMENT_SECTIONS.map((section) => {
                const isEditing = !!editingSection[section.title];

                return (
                    <section
                        key={section.title}
                        className="flex flex-col max-w-[776px] gap-4"
                    >
                        {/* Section Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-(--blue-sky-light) text-(--blue-salt)">
                                    <span
                                        className="inline-block"
                                        style={maskIcon(section.icon)}
                                    />
                                </div>

                                <h2 className="text-[16px] font-semibold text-(--gray-darker)">
                                    {section.title}
                                </h2>
                            </div>

                            <div className='flex items-center gap-2 justify-center'>

                                <Button
                                    className="text-(--blue-dark-normal)!"
                                    variant="text"
                                    size="xs"
                                    onClick={() => toggleEditSection(section)}
                                    leftIcon={renderMaskIcon('/icons/edit-4.svg')}
                                >
                                    {isEditing ? 'Cancel' : 'Edit'}
                                </Button>
                                {isEditing && (
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            type="button"
                                            size="xs"
                                            onClick={() => handleSaveSection(section)}
                                        >
                                            {section.actionLabel}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Document Uploads or View Display */}
                        <div className="flex flex-wrap justify-between gap-5 ">
                            {section.documents.map(
                                ({
                                    key,
                                    label,
                                    required,
                                    optional,
                                    multiple,
                                }) => {
                                    const pickedFiles = picked[key] ?? [];
                                    const savedFiles = saved[key] ?? [];
                                    const savedPreviews =
                                        previewFiles[key] ?? [];

                                    const hasSavedFiles =
                                        savedFiles.length > 0;

                                    const hasPreview =
                                        savedPreviews.length > 0;

                                    const labelNode = optional ? (
                                        <>
                                            {label}{' '}
                                            <span className="text-(--soft-white-dark-hover)">
                                                (optional)
                                            </span>
                                        </>
                                    ) : (
                                        label
                                    );

                                    const showUploadBox =
                                        isEditing ||
                                        !hasSavedFiles ||
                                        hasPreview;

                                    const displayFiles = isEditing
                                        ? pickedFiles.length
                                            ? pickedFiles
                                            : savedPreviews
                                        : savedPreviews;

                                    return (
                                        <div
                                            key={key}
                                            className="w-[378px]"
                                        >
                                            {showUploadBox ? (
                                                <FileUpload
                                                    name={key}
                                                    label={labelNode}
                                                    required={required}
                                                    maxSizeMB={5}
                                                    allowedExtensions={
                                                        section.imagesOnly
                                                            ? IMAGE_EXTENSIONS
                                                            : IMAGE_AND_PDF_EXTENSIONS
                                                    }
                                                    multiple={!!multiple}
                                                    maxFiles={
                                                        multiple
                                                            ? MAX_FILES
                                                            : undefined
                                                    }
                                                    value={
                                                        multiple
                                                            ? displayFiles
                                                            : displayFiles[0] ?? null
                                                    }
                                                    disabled={!isEditing}
                                                    onChange={(value) => {
                                                        const files = !value
                                                            ? []
                                                            : Array.isArray(value)
                                                                ? value
                                                                : [value];

                                                        setPicked((prev) => ({
                                                            ...prev,
                                                            [key]: files,
                                                        }));
                                                    }}
                                                />
                                            ) : (
                                                <div className="flex flex-col border-b border-(--neutral-light) py-3">
                                                    <span className="text-[14px] font-medium text-(--gray-darker)">
                                                        {label}
                                                    </span>

                                                    <p className="text-[14px] font-medium text-(--white-darker) mt-1">
                                                        Preview unavailable
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }
                            )}
                        </div>
                    </section>
                );
            })}
        </div>
    );
};

export default EmployeeDocuments;
