'use client';

import { useState, useEffect } from 'react';
import { BACKEND_URL } from '@/config/env';
import Button from '@/components/ui/Button/Button';
import FileUpload from '@/components/ui/FileUpload/FileUpload';
import { profileService } from '@/features/profile/api/profileService';
import { api } from '@/lib/api';


/* ---------- Document Configuration ---------- */

// Each key is the form field name the backend expects.
// A "multiple" field (up to 4 files) is sent as key_0, key_1, ... and the
// backend saves it as key0, key1, ... (e.g. educationCertificate_0 -> educationCertificate0).
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
        documents: [
            { key: 'educationCertificate', label: 'Educational Documents', required: true, multiple: true },
        ],
    },
    {
        title: 'Previous Experience',
        icon: '/icons/briefcase.svg',
        endpoint: '/profile/docs/employment',
        imagesOnly: false,
        documents: [
            { key: 'experienceLetter', label: 'Experience Letters', required: false, optional: true, multiple: true },
        ],
    },
    {
        title: 'Employment Documents',
        icon: '/icons/file-text.svg',
        endpoint: '/profile/docs/contract',
        imagesOnly: false,
        documents: [
            { key: 'contract', label: 'Employment / Internship Contract', required: true },
        ],
    },
    {
        title: 'Other Documents',
        icon: '/icons/folder.svg',
        endpoint: '/profile/docs/other',
        imagesOnly: false,
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
type IdPreviewFiles = Partial<Record<'idFront' | 'idBack', File>>;

const isIdKey = (key: FieldKey): key is 'idFront' | 'idBack' =>
    key === 'idFront' || key === 'idBack';

// Downloads a saved ID image so FileUpload can show it as a preview.
async function loadIdPreview(filename: string): Promise<File | null> {
    try {
        const blob = await api.download(
            `${BACKEND_URL}/uploads/profile/id/${encodeURIComponent(filename)}`,
        );
        const extension = filename.split('.').pop()?.toLowerCase();
        const mimeType = blob.type || (
            extension === 'png' ? 'image/png' :
            extension === 'webp' ? 'image/webp' :
            'image/jpeg'
        );
        return new File([blob], filename, { type: mimeType });
    } catch {
        return null;
    }
}

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

/* ---------- Component ---------- */

const EmployeeDocuments = () => {
    const [error, setError] = useState<string | null>(null);
    const [picked, setPicked] = useState<PickedState>({});
    const [saved, setSaved] = useState<SavedState>({});
    const [idPreviewFiles, setIdPreviewFiles] = useState<IdPreviewFiles>({});
    const [editingSection, setEditingSection] = useState<Record<string, boolean>>({});

    // Load saved documents on mount.
    // useEffect(() => {
    //     async function loadDocuments() {
    //         try {
    //             setLoading(true);
    //             const data = await profileService.getProfile();

    //             // GET /profile only returns the ID filenames for now.

    //         } catch (err: any) {
    //             setError(err.message || 'Failed to load documents');
    //         } finally {
    //             setLoading(false);
    //         }
    //     }
    //     loadDocuments();
    // }, []);

    const setEditing = (title: string, value: boolean) =>
        setEditingSection((prev) => ({ ...prev, [title]: value }));

    // Edit / Cancel. Cancelling drops the files picked in that section.
    const toggleEditSection = (section: DocumentSection) => {
        if (editingSection[section.title]) {
            setPicked((prev) => {
                const next = { ...prev };
                section.documents.forEach(({ key }) => delete next[key]);
                return next;
            });
        }
        setEditing(section.title, !editingSection[section.title]);
    };

    // Sends the picked files of one section to its PATCH endpoint.
    const handleSaveSection = async (section: DocumentSection) => {
        const formData = new FormData();
        for (const { key, multiple } of section.documents) {
            const files = picked[key] ?? [];
            files.forEach((file, i) => {
                formData.append(multiple ? `${key}_${i}` : key, file);
            });
        }

        // Nothing new picked — just close edit mode.
        if (![...formData.keys()].length) {
            setEditing(section.title, false);
            return;
        }

        try {
            const { documents } = await profileService.uploadDocuments(section.endpoint, formData);

            // Backend names are the key plus an optional index (educationCertificate0),
            // so strip the trailing number to find which field each file belongs to.
            setSaved((prev) => {
                const next = { ...prev };
                for (const { key } of section.documents) {
                    const filenames = documents
                        .filter((doc) => doc.name.replace(/\d+$/, '') === key)
                        .map((doc) => doc.filename);
                    if (filenames.length) next[key] = filenames;
                }
                return next;
            });

            // Use the just-uploaded ID images as the preview.
            const newFront = picked.idFront?.[0];
            const newBack = picked.idBack?.[0];
            setIdPreviewFiles((prev) => ({
                ...prev,
                ...(newFront && { idFront: newFront }),
                ...(newBack && { idBack: newBack }),
            }));

            setPicked((prev) => {
                const next = { ...prev };
                section.documents.forEach(({ key }) => delete next[key]);
                return next;
            });
            setEditing(section.title, false);
        } catch (err: any) {
            alert(err.message || 'Failed to save document changes');
        }
    };

    if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

    return (
        <div className="flex flex-col gap-4">
            {DOCUMENT_SECTIONS.map((section) => {
                const isEditing = !!editingSection[section.title];

                return (
                    <section key={section.title} className="flex flex-col gap-4 p-3">
                        {/* Section Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-(--blue-sky-light) text-(--blue-salt)">
                                    <span className="inline-block" style={maskIcon(section.icon)} />
                                </div>
                                <h2 className="text-[16px] font-semibold text-[#232931]">
                                    {section.title}
                                </h2>
                            </div>

                            <Button
                                className="text-(--blue-dark-normal)!"
                                variant="text"
                                size="small"
                                onClick={() => toggleEditSection(section)}
                                leftIcon={<span className="inline-block" style={maskIcon('/icons/edit-4.svg')} />}
                            >
                                {isEditing ? 'Cancel' : 'Edit'}
                            </Button>
                        </div>

                        {/* Document Uploads or View Display */}
                        <div className="flex flex-wrap justify-between gap-4">
                            {section.documents.map(({ key, label, required, optional, multiple }) => {
                                const pickedFiles = picked[key] ?? [];
                                const savedFiles = saved[key] ?? [];
                                const isId = isIdKey(key);
                                // No ID saved yet: show the upload box right away.
                                const showEmptyIdUpload = !isEditing && isId && !savedFiles.length;
                                // ID saved and its image loaded: show it as a preview.
                                const idPreview = isId ? idPreviewFiles[key] : undefined;
                                const showIdPreview = !isEditing && !!savedFiles.length && !!idPreview;

                                const labelNode = optional ? (
                                    <>
                                        {label}{' '}
                                        <span className="text-(--soft-white-dark-hover)">(optional)</span>
                                    </>
                                ) : (
                                    label
                                );

                                return (
                                    <div key={key} className="w-[378px]">
                                        {isEditing || showEmptyIdUpload || showIdPreview ? (
                                            <FileUpload
                                                name={key}
                                                label={labelNode}
                                                required={required}
                                                maxSizeMB={5}
                                                allowedExtensions={
                                                    section.imagesOnly ? IMAGE_EXTENSIONS : IMAGE_AND_PDF_EXTENSIONS
                                                }
                                                multiple={!!multiple}
                                                maxFiles={multiple ? MAX_FILES : undefined}
                                                value={
                                                    showIdPreview
                                                        ? idPreview ?? null
                                                        : multiple
                                                            ? pickedFiles
                                                            : pickedFiles[0] ?? null
                                                }
                                                disabled={showIdPreview}
                                                onChange={(value) => {
                                                    const files = !value ? [] : Array.isArray(value) ? value : [value];
                                                    setPicked((prev) => ({ ...prev, [key]: files }));
                                                    if (showEmptyIdUpload && files.length) {
                                                        setEditing(section.title, true);
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <div className="flex flex-col border-b border-(--neutral-light) py-3">
                                                <span className="text-[14px] font-medium text-(--gray-darker)">
                                                    {label}
                                                </span>
                                                {savedFiles.length ? (
                                                    savedFiles.map((filename) => (
                                                        <p
                                                            key={filename}
                                                            className="text-[14px] font-medium text-(--white-darker) mt-1 truncate"
                                                        >
                                                            {filename}
                                                        </p>
                                                    ))
                                                ) : (
                                                    <p className="text-[14px] font-medium text-(--white-darker) mt-1">-</p>
                                                )}
                                                {isId && savedFiles.length > 0 && !idPreview && (
                                                    <p className="text-xs text-(--gray-darker) mt-1">
                                                        Preview unavailable
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {isEditing && (
                            <div className="flex justify-end gap-2 mt-2">
                                <Button type="button" size="xs" onClick={() => handleSaveSection(section)}>
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
