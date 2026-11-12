'use client'

import { useId, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/Button/Button'
import FileUpload from '@/components/FileUpload/FileUpload'
import { useOnboarding, useOnboardingStep, type ContractDocumentKey } from '../../OnboardingContext'
import { buildOnboardFormData, MAX_OTHER_DOCUMENTS } from '../../onboardSubmission'

/* ---------- Document config ---------- */

type DocKey = ContractDocumentKey

/** `field` is the layout field name (forms_layout "other" section). */
type DocField = {
    key: Exclude<DocKey, 'offerLetter'>
    field: string
    label: string
    /** Max files; set means a multi-file field. */
    maxFiles?: number
}

const DOCUMENT_FIELDS: DocField[] = [
    { key: 'signedContract', field: 'contractPath', label: 'Signed Employment/Internship Contract/Offer Letter' },
    {
        key: 'otherEmployment',
        field: 'otherDocumentPath',
        label: `Other Employment Documents (up to ${MAX_OTHER_DOCUMENTS})`,
        maxFiles: MAX_OTHER_DOCUMENTS,
    },
]

const hasFiles = (value: File | File[] | null) =>
    Array.isArray(value) ? value.length > 0 : !!value

type ErrorsState = Partial<Record<DocKey | 'confirm', string>>

/* ---------- Page ---------- */

/**
 * Always the last step: it holds the confirmation and the submit button. The
 * upload fields follow the layout's "other" section; with none, only the
 * confirmation is shown.
 */
const Page = () => {
    const router = useRouter()
    const confirmId = useId()
    const { role, layout, data, updateSection, reset } = useOnboarding()
    const step = useOnboardingStep('contract-sign', 'other')
    const documents = data.contractDocuments
    const confirmed = data.confirmed
    const [errors, setErrors] = useState<ErrorsState>({})
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const fields = DOCUMENT_FIELDS.filter((f) => step.show(f.field))

    const handleFileChange = ({ key, maxFiles }: DocField, files: File | File[] | null) => {
        const list = Array.isArray(files) ? files : files ? [files] : []
        // Multi-file fields hold an array (capped); single-file fields hold one File.
        const value = maxFiles !== undefined ? list.slice(0, maxFiles) : list[0] ?? null
        updateSection("contractDocuments", { ...documents, [key]: value })
        if (list.length) setErrors((prev) => ({ ...prev, [key]: undefined }))
    }

    const handleConfirmChange = (checked: boolean) => {
        updateSection("confirmed", checked)
        if (checked) setErrors((prev) => ({ ...prev, confirm: undefined }))
    }

    const validate = () => {
        const newErrors: ErrorsState = {}
        fields.forEach(({ key, field, label }) => {
            if (step.required(field) && !hasFiles(documents[key])) newErrors[key] = `Upload your ${label}.`
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

        try {
            setIsSubmitting(true)
            // multipart/form-data: let the browser set the Content-Type boundary.
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/onboard`, {
                method: 'POST',
                body: buildOnboardFormData(data, role, layout),
            })
            if (!res.ok) {
                const body = await res.json().catch(() => null)
                throw new Error(body?.error ?? body?.message ?? `Submit failed (${res.status})`)
            }

            reset()
            router.push(`/onboard/${role}/success`)
        } catch (err) {
            setSubmitError(
                err instanceof Error && !err.message.startsWith('Submit failed') && err.message !== 'Failed to fetch'
                    ? err.message
                    : "Your information couldn't be submitted. Check your connection and try again."
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="relative flex max-w-[820px] min-h-screen px-4 lg:px-15 pt-20 lg:pt-22 pb-5 lg:pb-8">
            <div className=' absolute top-7.5 left-4 lg:left-15  '>
                <img className='h-4 w-22 lg:h-5 lg:w-28' src="/logos/gitgi-hr-logo.svg" alt="" />
            </div >

            <div className="flex w-full  flex-col gap-13">
                <div className="flex flex-col gap-1">
                    <h2 className="text-[22px] lg:text-[24px] text-(--neutral-normal) font-semibold">
                        {step.visible ? 'Other Documents' : 'Review & Submit'}
                    </h2>
                    <p className="text-[16px] lg:font-medium text-(--gray-dark)">
                        {step.visible
                            ? 'Upload any additional employment-related documents.'
                            : 'Confirm your details and submit your onboarding information.'}
                    </p>
                </div>

                <form className="flex flex-col gap-10" onSubmit={handleSubmit} noValidate>
                    {fields.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6  items-end">
                            {fields.map((doc) => (
                                <FileUpload
                                    key={doc.key}
                                    name={doc.key}
                                    label={doc.label}
                                    required={step.required(doc.field)}
                                    optional={!step.required(doc.field)}
                                    multiple={doc.maxFiles !== undefined}
                                    maxFiles={doc.maxFiles}
                                    value={documents[doc.key]}
                                    onChange={(files) => handleFileChange(doc, files)}
                                    error={errors[doc.key]}
                                    disabled={isSubmitting}
                                />
                            ))}
                        </div>
                    )}

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
                                    className="text-[14px] font-medium text-(--neutral-dark) cursor-pointer select-none"
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
                                size="small"
                                type="button"
                                onClick={step.goBack}
                                disabled={isSubmitting}
                            >
                                Back
                            </Button>
                            <Button type="submit"
                                size='small' disabled={isSubmitting}>
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