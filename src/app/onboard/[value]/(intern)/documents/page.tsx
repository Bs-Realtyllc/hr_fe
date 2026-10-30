'use client'

import { useState, type FormEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Button from '@/components/Button/Button'
import FileUpload from '@/components/FileUpload/FileUpload'

/* ---------- Document config ---------- */

type DocKey =
    | 'citizenshipFront'
    | 'citizenshipBack'
    | 'panFront'
    | 'panBack'
    | 'educational'
    | 'additional'

type DocField = { key: DocKey; label: string; required: boolean }
type DocSection = { title: string; fields: DocField[] }

const DOCUMENT_SECTIONS: DocSection[] = [
    {
        title: 'Identity Documents',
        fields: [
            { key: 'citizenshipFront', label: 'Citizenship/National ID - Front', required: true },
            { key: 'citizenshipBack', label: 'Citizenship/National ID - Back', required: true },
        ],
    },
    {
        title: 'Tax Documents',
        fields: [
            { key: 'panFront', label: 'PAN Card - Front', required: true },
            { key: 'panBack', label: 'PAN Card - Back', required: true },
        ],
    },
    {
        title: 'Other Documents',
        fields: [
            { key: 'educational', label: 'Educational Documents', required: true },
            { key: 'additional', label: 'Additional Documents', required: true },
        ],
    },
]

type DocumentsState = Record<DocKey, File | null>
type ErrorsState = Partial<Record<DocKey, string>>

const INITIAL_DOCUMENTS: DocumentsState = {
    citizenshipFront: null,
    citizenshipBack: null,
    panFront: null,
    panBack: null,
    educational: null,
    additional: null,
}

/* ---------- Page ---------- */

const Page = () => {
    const router = useRouter()
    const { value } = useParams<{ value: string }>();


    const [documents, setDocuments] = useState<DocumentsState>(INITIAL_DOCUMENTS)
    const [errors, setErrors] = useState<ErrorsState>({})
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleFileChange = (key: DocKey, file: File | null) => {
        setDocuments((prev) => ({ ...prev, [key]: file }))
        // Clear the error as soon as the user uploads a file
        if (file) setErrors((prev) => ({ ...prev, [key]: undefined }))
    }

    const validate = () => {
        const newErrors: ErrorsState = {}
        DOCUMENT_SECTIONS.forEach((section) =>
            section.fields.forEach(({ key, label, required }) => {
                if (required && !documents[key]) newErrors[key] = `Upload your ${label}.`
            })
        )
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setSubmitError(null)

        if (!validate()) {
            // Scroll to the first field with an error
            document.querySelector('[role="alert"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            return
        }

        const formData = new FormData()
            ; (Object.keys(documents) as DocKey[]).forEach((key) => {
                const file = documents[key]
                if (file) formData.append(key, file)
            })

        try {
            setIsSubmitting(true)
            // Replace with your backend endpoint or onboarding service
            // const res = await fetch('/api/onboarding/documents', {
            //     method: 'POST',
            //     body: formData,
            // })
            // if (!res.ok) throw new Error('Upload failed')

            router.push(`/onboard/${value}/contract-sign`)
        } catch {
            setSubmitError("Your documents couldn't be uploaded. Check your connection and try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="relative flex w-full min-h-screen px-15 pt-22 pb-8">
            <div className="absolute top-9 left-15">
                <img width={111} height={20} src="/logos/gitgi-hr-logo.svg" alt="Gitgi HR" />
            </div>

            <div className="flex w-full max-w-[880px] flex-col gap-13">
                <div className="flex flex-col gap-2">
                    <h2 className="text-[24px] text-(--neutral-normal) font-medium">Upload your documents</h2>
                    <p className="text-[16px] text-[#4B5768]">
                        Upload the required documents to complete your HR record.
                    </p>
                </div>

                <form className=" flex flex-col gap-8" onSubmit={handleSubmit} noValidate>
                    {DOCUMENT_SECTIONS.map((section) => (
                        <section key={section.title} className=" flex flex-col gap-5">
                            <h3 className="text-[18px] font-medium text-(--neutral-normal)">{section.title}</h3>

                            <div className=" flex justify-between">
                                {section.fields.map(({ key, label, required }) => (
                                    <FileUpload

                                        key={key}
                                        name={key}
                                        label={label}
                                        required={required}
                                        value={documents[key]}
                                        onChange={(file) => handleFileChange(key, file)}
                                        error={errors[key]}
                                        disabled={isSubmitting}
                                    />
                                ))}
                            </div>
                        </section>
                    ))}

                    {submitError && (
                        <p role="alert" className=" text-[13px] text-(--error-normal)">
                            {submitError}
                        </p>
                    )}

                    <div className="flex justify-between">
                        <Button
                            className="outline text-(--blue-sky-hover)!"
                            variant="text"
                            size="medium"
                            type='button'
                            onClick={() => router.push(`/onboard/${value}/emergency-contact`)}
                            disabled={isSubmitting}
                        >
                            Back
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Uploading...' : 'Next Page'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default Page