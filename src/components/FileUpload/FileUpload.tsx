'use client'

import {
    useEffect, useId, useRef, useState,
    type ChangeEvent, type DragEvent, type KeyboardEvent, type ReactNode,
} from "react"
import Button from "../Button/Button"
import DocumentPreview from "../DocumentPreview"

const ACCEPTED_MIME_TYPES = [
    "image/png",
    "image/jpeg",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]
const ACCEPTED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".pdf", ".docx"]

type FileUploadProps = {
    label?: ReactNode
    required?: boolean
    optional?: boolean
    name?: string
    value?: File | File[] | null
    onChange?: (files: File | File[] | null) => void
    maxSizeMB?: number
    error?: string
    disabled?: boolean
    multiple?: boolean
}

const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const isAccepted = (file: File) => {
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
    return ACCEPTED_MIME_TYPES.includes(file.type) || ACCEPTED_EXTENSIONS.includes(ext)
}

/* ---------------- Icons ---------------- */

const CloudUploadIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 18a5 5 0 01-.9-9.92A6 6 0 0117.7 7.1 4.5 4.5 0 0117.5 18" stroke="#2D343F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 12v8m0-8l-3 3m3-3l3 3" stroke="#2D343F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

const SmallUploadIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 15V4m0 0l-4 4m4-4l4 4M5 20h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

const ImageFileIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="3" stroke="#D92D20" strokeWidth="2" />
        <circle cx="9" cy="9" r="1.8" fill="#D92D20" />
        <path d="M21 15l-5-5-9 9" stroke="#D92D20" strokeWidth="2" strokeLinejoin="round" />
    </svg>
)

const PdfIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M13 5H9V1L13 5ZM9 1H3C2.45 1 2 1.45 2 2V16C2 16.55 2.45 17 3 17H13C13.55 17 14 16.55 14 16V5L9 1Z" stroke="#A51D1D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="8" y="12" textAnchor="middle" fontSize="4.5" fontWeight="bold" fill="#A51D1D">PDF</text>
    </svg>
);

const DocFileIcon = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" stroke="#D92D20" strokeWidth="2" strokeLinejoin="round" />
        <path d="M14 3v5h5M9 13h6M9 17h4" stroke="#D92D20" strokeWidth="2" strokeLinecap="round" />
    </svg>
)

const DotsIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#5A687D" aria-hidden="true">
        <circle cx="12" cy="5" r="1.8" />
        <circle cx="12" cy="12" r="1.8" />
        <circle cx="12" cy="19" r="1.8" />
    </svg>
)

const dashedBorder = (color: string) =>
    `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg'%3e%3crect x='1' y='1' width='calc(100%25 - 2px)' height='calc(100%25 - 2px)' fill='none' rx='12' ry='12' stroke='${encodeURIComponent(color)}' stroke-width='1.5' stroke-dasharray='6%2c 14' stroke-linecap='round'/%3e%3c/svg%3e")`

/* ---------------- Isolated File Item Preview Component ---------------- */
type FileItemPreviewProps = {
    fileItem: File
    idx: number
    menuOpenIndex: number | null
    setMenuOpenIndex: (idx: number | null) => void
    disabled: boolean
    handleReplace: (idx: number) => void
    handleRemove: (idx: number) => void
    menuRef: (element: HTMLDivElement | null) => void
}

const FileItemPreview = ({
    fileItem,
    idx,
    menuOpenIndex,
    setMenuOpenIndex,
    disabled,
    handleReplace,
    handleRemove,
    menuRef,
}: FileItemPreviewProps) => {
    const isImage = fileItem.type.startsWith("image/")
    const isPdf = fileItem.type === "application/pdf" || fileItem.name.toLowerCase().endsWith(".pdf")
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    useEffect(() => {
        if (!isImage) {
            setPreviewUrl(null)
            return
        }
        const url = URL.createObjectURL(fileItem)
        setPreviewUrl(url)
        return () => URL.revokeObjectURL(url)
    }, [fileItem, isImage])

    return (
        <div className="flex flex-col gap-2 pb-1 border-b border-gray-200 last:border-b-0">
            {/* Header: icon + file name + 3-dot menu */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    {isImage ? <ImageFileIcon /> : isPdf ? <PdfIcon /> : <DocFileIcon />}
                    <span className="text-[13px] font-medium text-(--gray-dark-active) truncate" title={fileItem.name}>
                        {fileItem.name}
                    </span>
                </div>

                <div
                    ref={menuOpenIndex === idx ? menuRef : undefined}
                    className="relative shrink-0"
                >
                    <button
                        type="button"
                        aria-label="File options"
                        aria-haspopup="menu"
                        aria-expanded={menuOpenIndex === idx}
                        disabled={disabled}
                        onClick={() => setMenuOpenIndex(menuOpenIndex === idx ? null : idx)}
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-(--blue-salt-light-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--blue-sky-dark-hover)/40"
                    >
                        <DotsIcon />
                    </button>

                    {menuOpenIndex === idx && (
                        <div
                            role="menu"
                            className="absolute right-0 top-8 z-30 w-32 py-1 bg-white rounded-lg border border-(--blue-salt-light-hover) shadow-lg"
                        >
                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => handleReplace(idx)}
                                className="w-full text-left px-3 py-2 text-[13px] text-(--gray-dark-active) hover:bg-(--soft-white-normal)"
                            >
                                Replace
                            </button>
                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => handleRemove(idx)}
                                className="w-full text-left px-3 py-2 text-[13px] text-(--error-normal-active) hover:bg-(--warning-light)"
                            >
                                Remove
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Preview */}
            <div className="h-[180px] w-full rounded-lg overflow-hidden bg-white">
                {isImage ? (
                    previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={previewUrl} alt={fileItem.name} className="w-full h-full object-cover object-top" />
                    ) : (
                        <div className="flex h-full items-center justify-center text-sm text-gray-500">
                            Loading image preview...
                        </div>
                    )
                ) : (
                    <DocumentPreview file={fileItem} />
                )}
            </div>
        </div>
    )
}

/* ---------------- Main Component ---------------- */

const FileUpload = ({
    label,
    required = false,
    optional = false,
    name,
    value,
    onChange,
    maxSizeMB = 10,
    error,
    disabled = false,
    multiple = false,
}: FileUploadProps) => {
    const inputId = useId()
    const inputRef = useRef<HTMLInputElement>(null)
    const [internalFiles, setInternalFiles] = useState<File[]>([])
    const [isDragging, setIsDragging] = useState(false)
    const [localError, setLocalError] = useState<string | null>(null)
    const [menuOpenIndex, setMenuOpenIndex] = useState<number | null>(null)
    const [showAllFiles, setShowAllFiles] = useState(false)
    const [menuElement, setMenuElement] = useState<HTMLDivElement | null>(null)

    const files: File[] = (() => {
        if (value !== undefined) {
            if (!value) return []
            return Array.isArray(value) ? value : [value]
        }
        return internalFiles
    })()

    const shownError = error || localError

    useEffect(() => {
        if (menuOpenIndex === null) return
        const onClick = (e: MouseEvent) => {
            if (menuElement && !menuElement.contains(e.target as Node)) setMenuOpenIndex(null)
        }
        const onKey = (e: globalThis.KeyboardEvent) => {
            if (e.key === "Escape") setMenuOpenIndex(null)
        }
        document.addEventListener("mousedown", onClick)
        document.addEventListener("keydown", onKey)
        return () => {
            document.removeEventListener("mousedown", onClick)
            document.removeEventListener("keydown", onKey)
        }
    }, [menuElement, menuOpenIndex])

    const processFiles = (incomingList: FileList | File[] | null) => {
        if (!incomingList || incomingList.length === 0) return
        const newFiles = Array.from(incomingList)

        for (const f of newFiles) {
            if (!isAccepted(f)) {
                setLocalError("This file type isn't supported. Upload a PNG, JPG, PDF or DOCX.")
                return
            }
            if (f.size > maxSizeMB * 1024 * 1024) {
                setLocalError(`This file is ${formatSize(f.size)}. The limit is ${maxSizeMB}MB.`)
                return
            }
        }

        setLocalError(null)

        let updatedFiles: File[]
        if (multiple) {
            updatedFiles = [...files, ...newFiles]
        } else {
            updatedFiles = [newFiles[0]]
        }

        setInternalFiles(updatedFiles)
        onChange?.(multiple ? updatedFiles : updatedFiles[0])
    }

    const openPicker = () => {
        if (!disabled) inputRef.current?.click()
    }

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        processFiles(e.target.files)
        e.target.value = ""
    }

    const handleReplace = (_index: number) => {
        setMenuOpenIndex(null)
        openPicker()
    }

    const handleRemove = (indexToRemove: number) => {
        setMenuOpenIndex(null)
        const updated = files.filter((_, idx) => idx !== indexToRemove)
        setInternalFiles(updated)
        onChange?.(multiple ? (updated.length ? updated : null) : null)
        if (updated.length <= 1) setShowAllFiles(false)
    }

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        if (!disabled) setIsDragging(true)
    }
    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(false)
    }
    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(false)
        if (!disabled) processFiles(e.dataTransfer.files)
    }
    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            openPicker()
        }
    }

    const displayedFiles = multiple && !showAllFiles ? files.slice(0, 1) : files
    const hiddenCount = files.length - 1

    return (
        <div className="flex flex-col gap-2 w-full max-w-[400px]">
            {label && (
                <label htmlFor={inputId} className="text-[14px] font-medium text-(--gray-dark-active)">
                    {label}
                    {required && <span className="text-(--error-normal-hover)">*</span>}
                    {optional && <span className="text-(--soft-white-dark-hover)">(optional)</span>}
                </label>
            )}

            <input
                ref={inputRef}
                id={inputId}
                name={name}
                type="file"
                className="hidden"
                multiple={multiple}
                accept={ACCEPTED_EXTENSIONS.join(",")}
                onChange={handleInputChange}
                disabled={disabled}
            />

            {files.length === 0 ? (
                /* ================= BEFORE UPLOAD ================= */
                <div
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    aria-label={`Upload ${typeof label === "string" ? label : "file"}`}
                    onClick={openPicker}
                    onKeyDown={handleKeyDown}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`flex flex-col justify-center items-center h-[224px] w-full rounded-xl gap-[10px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-(--blue-salt-dark-active)/40
    ${isDragging ? "bg-(--blue-sky-light)/60" : ""}
    ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    style={{ backgroundImage: dashedBorder(shownError ? "#b01e1e" : "#bfbfbf") }}
                >
                    <div className="w-11 h-11 rounded-full bg-(--blue-sky-light) flex items-center justify-center">
                        <CloudUploadIcon />
                    </div>
                    <div className="text-center">
                        <h3 className="text-[12px] text-(--gray-dark-active) font-medium">
                            {isDragging ? "Drop your file here" : "Select your file or drag and drop"}
                        </h3>
                        <p className="text-[11px] font-medium text-(--gray-normal-hover)">
                            PNG, JPG, PDF or DOCX - Max {maxSizeMB}MB
                        </p>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                        <Button type="button" size='xs' onClick={openPicker} disabled={disabled}>
                            <span className="flex items-center gap-2">
                                <SmallUploadIcon />
                                Upload
                            </span>
                        </Button>
                    </div>
                </div>
            ) : (
                /* ================= AFTER UPLOAD ================= */
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative flex flex-col w-full h-[230px] rounded-xl bg-(--soft-white-normal) p-3 border transition-colors overflow-hidden
                        ${isDragging ? "border-dashed border-(--soft-white-normal)" : "border-transparent"}`}
                >
                    {/* Displayed File Preview Area with internal scroll enabled ONLY when viewing all */}
                    <div className={`flex flex-col gap-3 pr-1 ${showAllFiles ? 'overflow-y-auto h-[170px]' : ''}`}>
                        {displayedFiles.map((fileItem, idx) => (
                            <FileItemPreview
                                key={idx}
                                fileItem={fileItem}
                                idx={idx}
                                menuOpenIndex={menuOpenIndex}
                                setMenuOpenIndex={setMenuOpenIndex}
                                disabled={disabled}
                                handleReplace={handleReplace}
                                handleRemove={handleRemove}
                                menuRef={setMenuElement}
                            />
                        ))}
                    </div>

                    {/* Floating Overlay Badge + Add Button in the bottom with high z-index */}
                    {multiple && hiddenCount > 0 && !showAllFiles && (
                        <div className="absolute inset-x-3 bottom-3 z-10 flex items-center justify-between bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg border border-(--blue-salt-light-hover) shadow-md">
                            <span className="text-[12px] font-semibold text-(--gray-dark-active)">
                                +{hiddenCount} more file{hiddenCount > 1 ? 's' : ''}
                            </span>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAllFiles(true)}
                                    className="text-[12px] font-medium text-(--blue-sky-dark-hover) hover:underline"
                                >
                                    View all
                                </button>
                                <button
                                    type="button"
                                    onClick={openPicker}
                                    disabled={disabled}
                                    className="text-[12px] font-medium text-(--blue-sky-dark-hover) hover:underline"
                                >
                                    + Add
                                </button>
                            </div>
                        </div>
                    )}

                    {multiple && showAllFiles && (
                        <div className="absolute inset-x-3 bottom-3 z-10 flex items-center justify-between bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg border border-(--blue-salt-light-hover) shadow-md">
                            <button
                                type="button"
                                onClick={() => setShowAllFiles(false)}
                                className="text-[12px] font-medium text-(--blue-sky-dark-hover) hover:underline"
                            >
                                Show less
                            </button>
                            <button
                                type="button"
                                onClick={openPicker}
                                disabled={disabled}
                                className="text-[12px] font-medium text-(--blue-sky-dark-hover) hover:underline"
                            >
                                + Add another document
                            </button>
                        </div>
                    )}
                </div>
            )}

            {shownError && (
                <p role="alert" className="text-[11px] font-medium text-(--error-normal)">
                    {shownError}
                </p>
            )}
        </div>
    )
}

export default FileUpload