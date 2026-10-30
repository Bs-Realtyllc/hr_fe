'use client'

import { useId, useState, type FormEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Button from '@/components/Button/Button'
import FileUpload from '@/components/FileUpload/FileUpload'

/* ---------- Document config ---------- */

type DocKey = 'signedContract' | 'offerLetter' | 'otherEmployment'
type DocField = { key: DocKey; label: string; required: boolean }

const DOCUMENT_FIELDS: DocField[] = [
    { key: 'signedContract', label: 'Signed Employment/Internship Contract', required: true },
    { key: 'offerLetter', label: 'Offer Letter (optional)', required: false },
    { key: 'otherEmployment', label: 'Other Employment Documents (optional)', required: false },
]

type DocumentsState = Record<DocKey, File | null>
type ErrorsState = Partial<Record<DocKey | 'confirm', string>>

const INITIAL_DOCUMENTS: DocumentsState = {
    signedContract: null,
    offerLetter: null,
    otherEmployment: null,
}

/* ---------- Page ---------- */

const Page = () => {
    const router = useRouter()
    const confirmId = useId()
    const { value } = useParams<{ value: string }>();


    const [documents, setDocuments] = useState<DocumentsState>(INITIAL_DOCUMENTS)
    const [confirmed, setConfirmed] = useState(false)
    const [errors, setErrors] = useState<ErrorsState>({})
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleFileChange = (key: DocKey, file: File | null) => {
        setDocuments((prev) => ({ ...prev, [key]: file }))
        if (file) setErrors((prev) => ({ ...prev, [key]: undefined }))
    }

    const handleConfirmChange = (checked: boolean) => {
        setConfirmed(checked)
        if (checked) setErrors((prev) => ({ ...prev, confirm: undefined }))
    }

    const validate = () => {
        const newErrors: ErrorsState = {}
        DOCUMENT_FIELDS.forEach(({ key, label, required }) => {
            if (required && !documents[key]) newErrors[key] = `Upload your ${label}.`
        })
        if (!confirmed) newErrors.confirm = 'Confirm that your information is accurate to submit.'
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setSubmitError(null)

        if (!validate()) {
            document.querySelector('[role="alert"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            return
        }

        const formData = new FormData()
            ; (Object.keys(documents) as DocKey[]).forEach((key) => {
                const file = documents[key]
                if (file) formData.append(key, file)
            })
        formData.append('confirmed', 'true')

        try {
            setIsSubmitting(true)
            // Replace with your backend endpoint or onboarding service
            // const res = await fetch('/api/onboarding/submit', {
            //     method: 'POST',
            //     body: formData,
            // })
            // if (!res.ok) throw new Error('Submit failed')

            router.push(`/`)
        } catch {
            setSubmitError("Your information couldn't be submitted. Check your connection and try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="relative flex max-w-[820px] min-h-screen px-15 pt-22 pb-8">
            <div className="absolute top-9 left-15">
                <img width={111} height={20} src="/logos/gitgi-hr-logo.svg" alt="Gitgi HR" />
            </div>

            <div className="flex w-full  flex-col gap-13">
                <div className="flex flex-col gap-1">
                    <h2 className="text-[24px] text-(--neutral-normal) font-medium">Other Documents</h2>
                    <p className="text-[16px] font-medium text-[#4B5768]">
                        Upload any additional employment-related documents.
                    </p>
                </div>

                <form className="flex flex-col gap-10" onSubmit={handleSubmit} noValidate>
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-6">
                        {DOCUMENT_FIELDS.map(({ key, label, required }) => (
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

                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-start gap-3">
                                <input
                                    id={confirmId}
                                    type="checkbox"
                                    checked={confirmed}
                                    onChange={(e) => handleConfirmChange(e.target.checked)}
                                    disabled={isSubmitting}
                                    aria-invalid={!!errors.confirm}
                                    className="mt-[2px] h-4 w-4 shrink-0 cursor-pointer rounded border-(--teal-light-active) accent-(--blue-sky-dark-hover)"
                                />
                                <label
                                    htmlFor={confirmId}
                                    className="text-[14px] text-(--neutral-dark) cursor-pointer select-none"
                                >
                                    I confirm that the information and documents provided are accurate and
                                    complete to the best of my knowledge.
                                </label>
                            </div>
                            {errors.confirm && (
                                <p role="alert" className="pl-7 text-[11px] font-medium text-(--error-normal)">
                                    {errors.confirm}
                                </p>
                            )}
                        </div>

                        {submitError && (
                            <p role="alert" className="text-[13px] text-(--error-normal)">
                                {submitError}
                            </p>
                        )}

                        <div className="flex justify-between">
                            <Button
                                className="outline text-(--blue-sky-hover)!"
                                variant="text"
                                size="medium"
                                type="button"
                                onClick={() => router.push(`/onboard/${value}/documents`)}
                                disabled={isSubmitting}
                            >
                                Back
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Submitting...' : 'Submit Information'}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default Page