'use client'

import { useId, useState, type FormEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Button from '@/components/Button/Button'
import FileUpload from '@/components/FileUpload/FileUpload'
import { useOnboarding, type ContractDocumentKey, type ContractDocuments } from '../../OnboardingContext'

/* ---------- Document config ---------- */

type DocKey = ContractDocumentKey

type DocField = {
    key: DocKey;
    label: string;
    required: boolean;
    optional?: boolean;
    multiple?: boolean;
}

const DOCUMENT_FIELDS: DocField[] = [
    { key: 'signedContract', label: 'Signed Employment/Internship Contract/offerLetter', required: true },
    // { key: 'offerLetter', label: 'Offer Letter ', required: false, optional: true },
    { key: 'otherEmployment', label: 'Other Employment Documents', required: false, optional: true, multiple: true },
]

type ErrorsState = Partial<Record<DocKey | 'confirm', string>>

/* ---------- Page ---------- */

const Page = () => {
    const router = useRouter()
    const confirmId = useId()
    const { value } = useParams<{ value: string }>();
    const { data, updateSection } = useOnboarding()
    const documents = data.contractDocuments
    const confirmed = data.confirmed
    const [errors, setErrors] = useState<ErrorsState>({})
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Handle single or multi file changes
    const handleFileChange = <K extends DocKey>(key: K, files: ContractDocuments[K]) => {
        updateSection("contractDocuments", { ...documents, [key]: files })
        if (files && (Array.isArray(files) ? files.length > 0 : true)) {
            setErrors((prev) => ({ ...prev, [key]: undefined }))
        }
    }

    const handleConfirmChange = (checked: boolean) => {
        updateSection("confirmed", checked)
        if (checked) setErrors((prev) => ({ ...prev, confirm: undefined }))
    }

    const validate = () => {
        const newErrors: ErrorsState = {}
        DOCUMENT_FIELDS.forEach(({ key, label, required }) => {
            const val = documents[key]
            if (required) {
                if (Array.isArray(val)) {
                    if (val.length === 0) newErrors[key] = `Upload your ${label}.`
                } else {
                    if (!val) newErrors[key] = `Upload your ${label}.`
                }
            }
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
                const val = documents[key]
                if (Array.isArray(val)) {
                    // Append each file in the array under the same key or key[] depending on backend requirements
                    val.forEach((file) => {
                        formData.append(`${key}[]`, file)
                    })
                } else if (val) {
                    formData.append(key, val)
                }
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

            router.push(`/onboard/${value}/success`)
        } catch {
            setSubmitError("Your information couldn't be submitted. Check your connection and try again.")
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
                    <h2 className="text-[22px] lg:text-[24px] text-(--neutral-normal) font-semibold">Other Documents</h2>
                    <p className="text-[16px] lg:font-medium text-(--gray-dark)">
                        Upload any additional employment-related documents.
                    </p>
                </div>

                <form className="flex flex-col gap-10" onSubmit={handleSubmit} noValidate>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6  items-end">
                        {DOCUMENT_FIELDS.map(({ key, label, required, optional, multiple }) => (
                            <FileUpload
                                key={key}
                                name={key}
                                label={label}
                                required={required}
                                optional={optional}
                                multiple={multiple}
                                value={documents[key]}
                                onChange={(files) => handleFileChange(key, files)}
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
                                onClick={() => router.push(`/onboard/${value}/documents`)}
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