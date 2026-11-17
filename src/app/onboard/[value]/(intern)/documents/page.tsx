'use client'

import { useState, type FormEvent } from 'react'
import Button from '@/components/Button/Button'
import FileUpload from '@/components/FileUpload/FileUpload'
import { useOnboarding, useOnboardingStep, type OnboardingDocumentKey } from '../../OnboardingContext'

/* ---------- Document config ---------- */

type DocKey = OnboardingDocumentKey

/** `field` is the layout field name (forms_layout "documents" section). */
type DocField = { key: DocKey; field: string; label: string }
type DocSection = { title: string; fields: DocField[] }

const DOCUMENT_SECTIONS: DocSection[] = [
    {
        title: 'Passport Size Photo',
        fields: [
            { key: 'passportSizePhoto', field: 'photoPath', label: 'Passport Size Photo' },
        ],
    },
    {
        title: 'Identity Documents',
        fields: [
            { key: 'citizenshipFront', field: 'idFrontPath', label: 'Citizenship/National ID - Front' },
            { key: 'citizenshipBack', field: 'idBackPath', label: 'Citizenship/National ID - Back' },
        ],
    },
    {
        title: 'Tax Documents',
        fields: [
            { key: 'panFront', field: 'panFrontPath', label: 'PAN Card - Front' },
            { key: 'panBack', field: 'panBackPath', label: 'PAN Card - Back' },
        ],
    },
    {
        title: 'Other Documents',
        fields: [
            { key: 'additional', field: 'additionalDocumentPath', label: 'Additional Documents' },
        ],
    },
]

type ErrorsState = Partial<Record<DocKey, string>>

/* ---------- Page ---------- */

const Page = () => {
    const { data, updateSection } = useOnboarding()
    const step = useOnboardingStep('documents', 'documents')
    const documents = data.documents
    const [errors, setErrors] = useState<ErrorsState>({})

    // Only the fields the layout includes; groups left with none are dropped.
    const sections = DOCUMENT_SECTIONS
        .map((section) => ({ ...section, fields: section.fields.filter((f) => step.show(f.field)) }))
        .filter((section) => section.fields.length > 0)

    if (!step.stepVisible) return null

    const handleFileChange = (key: DocKey, file: File | null) => {
        updateSection("documents", { ...documents, [key]: file })
        if (file) setErrors((prev) => ({ ...prev, [key]: undefined }))
    }

    const validate = () => {
        const newErrors: ErrorsState = {}
        sections.forEach((section) =>
            section.fields.forEach(({ key, field, label }) => {
                if (step.required(field) && !documents[key]) newErrors[key] = `Upload your ${label}.`
            })
        )
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    // Files are kept in context and sent together on the final step.
    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!validate()) {
            document.querySelector('[role="alert"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            return
        }
        step.goNext()
    }

    return (
        <div className="relative  flex w-full min-h-screen px-4 lg:px-15 pt-20 lg:pt-22 pb-5 lg:pb-8">
            <div className=' absolute top-7.5 left-4 lg:left-15  '>
                <img className='h-4 w-22 lg:h-5 lg:w-28' src="/logos/gitgi-hr-logo.svg" alt="" />
            </div >

            <div className="flex w-full max-w-[880px] flex-col gap-7 lg:gap-13">
                <div className="flex flex-col gap-2">
                    <h2 className="text-[20px] lg:text-[24px] text-(--neutral-normal) font-semibold">Upload your documents</h2>
                    <p className="text-[16px] text-(--gray-dark)">
                        Upload the required documents to complete your HR record.
                    </p>
                </div>

                <form className="flex flex-col gap-5 lg:gap-8" onSubmit={handleSubmit} noValidate>
                    <div className=' flex flex-col gap-5 lg:gap-6'>
                        {sections.map((section) => (
                            <section key={section.title} className=" flex flex-col gap-5">
                                <h3 className="text-[16px] lg:text-[18px] font-medium text-(--neutral-normal)">{section.title}</h3>

                                <div className="flex flex-wrap gap-5 lg:justify-between">
                                    {section.fields.map(({ key, field, label }) => (
                                        <FileUpload
                                            key={key}
                                            name={key}
                                            label={label}
                                            required={step.required(field)}
                                            optional={!step.required(field)}
                                            value={documents[key]}
                                            multiple={false}
                                            onChange={(file) => handleFileChange(key, Array.isArray(file) ? file[0] ?? null : file)}
                                            error={errors[key]}
                                        />
                                    ))}
                                </div>
                            </section>

                        ))}
                    </div>

                    <div className="flex justify-between">
                        <Button
                            className="outline text-(--blue-sky-hover)!"
                            variant="text"
                            size="small"
                            type='button'
                            onClick={step.goBack}
                        >
                            Back
                        </Button>
                        <Button type="submit" size="small">
                            Next Page
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default Page