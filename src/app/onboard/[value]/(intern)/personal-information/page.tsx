'use client'

import Button from "@/components/Button/Button"
import InputField from "@/components/InputField/InputField"
import { BSRealtyDatePicker, BSRealtyDropdown } from "@bsrealtyllc/design-system"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { useOnboarding, type PersonalInfo } from "../../OnboardingContext"

type Errors = Partial<Record<keyof PersonalInfo, string>>

const GENDER_OPTIONS = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' },
]

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^\+?[0-9\s-]{7,15}$/
const URL_REGEX = /^(https?:\/\/)?([\w\-]+\.)+[\w\-]+(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/

const labelClass = "text-[14px] font-medium text-(--gray-dark-active)"
const errorClass = "text-[12px] text-(--error-normal)"

// Local date as YYYY-MM-DD ('en-CA' formats this way)
const today = () => new Date().toLocaleDateString('en-CA')

function validate(values: PersonalInfo): Errors {
    const errors: Errors = {}

    if (!values.name.trim()) errors.name = 'Enter your legal name.'

    if (!values.dob) {
        errors.dob = 'Select your date of birth.'
    } else if (values.dob > today()) {
        errors.dob = 'Date of birth can’t be in the future.'
    }

    if (!values.gender) errors.gender = 'Select a gender option.'
    if (!values.nationality.trim()) errors.nationality = 'Enter your nationality.'

    if (!values.email.trim()) {
        errors.email = 'Enter your email address.'
    } else if (!EMAIL_REGEX.test(values.email.trim())) {
        errors.email = 'Enter a valid email, like name@example.com.'
    }

    if (!values.phone.trim()) {
        errors.phone = 'Enter your phone number.'
    } else if (!PHONE_REGEX.test(values.phone.trim())) {
        errors.phone = 'Enter a valid phone number.'
    }

    if (values.linkedin.trim() && !URL_REGEX.test(values.linkedin.trim())) {
        errors.linkedin = 'Enter a valid URL.'
    }

    if (values.github.trim() && !URL_REGEX.test(values.github.trim())) {
        errors.github = 'Enter a valid URL.'
    }

    if (values.portfolio.trim() && !URL_REGEX.test(values.portfolio.trim())) {
        errors.portfolio = 'Enter a valid URL.'
    }

    if (!values.currentAddress.trim()) errors.currentAddress = 'Enter your current address.'
    if (!values.permanentAddress.trim()) errors.permanentAddress = 'Enter your permanent address.'

    return errors
}

const PersonalInfoPage = () => {
    const router = useRouter()
    const { value } = useParams<{ value: string }>();
    const { data, updateSection } = useOnboarding()
    const form = data.personalInfo

    const [errors, setErrors] = useState<Errors>({})
    const [submitting, setSubmitting] = useState(false)
    const sameAsCurrent = data.sameAsCurrent

    function updateField<K extends keyof PersonalInfo>(key: K, value: PersonalInfo[K]) {
        const next = { ...form, [key]: value }
        if (key === 'currentAddress' && sameAsCurrent) {
            next.permanentAddress = value as string
        }
        updateSection("personalInfo", next)
        // Clear the error for this field as the user fixes it
        if (errors[key]) {
            setErrors((prev) => ({ ...prev, [key]: undefined }))
        }
    }

    function handleSameAsCurrent(checked: boolean) {
        updateSection("sameAsCurrent", checked)
        if (checked) {
            updateSection("personalInfo", { ...form, permanentAddress: form.currentAddress })
            setErrors((prev) => ({ ...prev, permanentAddress: undefined }))
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        const validationErrors = validate(form)
        setErrors(validationErrors)
        if (Object.keys(validationErrors).length > 0) return

        setSubmitting(true)
        try {
            const payload = {
                ...form,
                name: form.name.trim(),
                email: form.email.trim().toLowerCase(),
                phone: form.phone.trim(),
                linkedin: form.linkedin.trim(),
                github: form.github.trim(),
                portfolio: form.portfolio.trim(),
            }

            console.log('Personal info:', payload)

            router.push(`/onboard/${value}/educational-information`)
        } catch (err) {
            console.error(err)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="flex w-full justify-between items-center px-4 lg:px-15 pt-22 p-5 lg:pb-8">
            <div className='absolute top-7.5 left-4 lg:left-15'>
                <img className='h-4 w-22 lg:h-5 lg:w-28' src="/logos/gitgi-hr-logo.svg" alt="" />
            </div>

            <div className="flex w-full lg:w-[534px] flex-col gap-7 lg:gap-13">
                <div className="flex flex-col gap-1 lg:gap-2 mr-12 lg:mr-0">
                    <h1 className="text-[20px] lg:text-[24px] leading-7 lg:leading-8 text-(--neutral-normal) font-semibold">Finish setting up your HR profile</h1>
                    <p className="text-[14px] lg:text-[16px] font-normal lg:font-medium text-(--gray-dark)">
                        Provide your personal, employment, and document details to complete your employee record. Fields marked optional can be skipped.
                    </p>
                </div>

                <div className="flex flex-col gap-4 lg:gap-5">
                    <h2 className="text-[16px] lg:text-[18px] text-(--neutral-normal) font-semibold">Personal Information</h2>

                    <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
                        <div className="flex flex-col gap-5">
                            {/* 1. Name */}
                            <div className="flex flex-col gap-2">
                                <label htmlFor="name" className={labelClass}>Legal Name</label>
                                <InputField
                                    id="name"
                                    placeholder="Enter Your Legal Name"
                                    value={form.name}
                                    onChange={(e) => updateField('name', e.target.value)}
                                />
                                {errors.name && <p className={errorClass}>{errors.name}</p>}
                            </div>

                            {/* 2. DOB */}
                            <div className="flex flex-col gap-2">
                                <label htmlFor="dob" className={labelClass}>Date of Birth</label>
                                <InputField
                                    type="date"
                                    value={form.dob}
                                    onChange={(e) => updateField('dob', e.target.value)}
                                />
                                {errors.dob && <p className={errorClass}>{errors.dob}</p>}
                            </div>

                            {/* 3. Gender */}
                            <div className="flex flex-col gap-2">
                                <label htmlFor="gender" className={labelClass}>Gender</label>
                                <BSRealtyDropdown
                                    className="w-full!"
                                    options={GENDER_OPTIONS}
                                    placeholder="Select gender"
                                    value={form.gender}
                                    onChange={(selected: string | { value: string } | null) =>
                                        updateField(
                                            'gender',
                                            typeof selected === 'string' ? selected : selected?.value ?? ''
                                        )
                                    }
                                />
                                {errors.gender && <p className={errorClass}>{errors.gender}</p>}
                            </div>

                            {/* 4. Nationality */}
                            <div className="flex flex-col gap-2">
                                <label htmlFor="nationality" className={labelClass}>Nationality</label>
                                <InputField
                                    id="nationality"
                                    placeholder="Enter Your Nationality"
                                    value={form.nationality}
                                    onChange={(e) => updateField('nationality', e.target.value)}
                                />
                                {errors.nationality && <p className={errorClass}>{errors.nationality}</p>}
                            </div>

                            {/* 5. Email */}
                            <div className="flex flex-col gap-2">
                                <label htmlFor="email" className={labelClass}>Email</label>
                                <InputField
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    placeholder="name@example.com"
                                    value={form.email}
                                    onChange={(e) => updateField('email', e.target.value)}
                                />
                                {errors.email && <p className={errorClass}>{errors.email}</p>}
                            </div>

                            {/* 6. Phone Number */}
                            <div className="flex flex-col gap-2">
                                <label htmlFor="phone" className={labelClass}>Phone Number</label>
                                <InputField
                                    id="phone"
                                    type="tel"
                                    autoComplete="tel"
                                    placeholder="Enter Your phone"
                                    value={form.phone}
                                    onChange={(e) => updateField('phone', e.target.value)}
                                />
                                {errors.phone && <p className={errorClass}>{errors.phone}</p>}
                            </div>

                            {/* 7. LinkedIn URL */}
                            <div className="flex flex-col gap-2">
                                <label htmlFor="linkedin" className={labelClass}>LinkedIn URL <span className="text-(--gray-normal) font-normal">(optional)</span></label>
                                <InputField
                                    id="linkedin"
                                    type="url"
                                    autoComplete="url"
                                    placeholder="e.g. https://linkedin.com" value={form.linkedin}
                                    onChange={(e) => updateField('linkedin', e.target.value)}
                                />
                                {errors.linkedin && <p className={errorClass}>{errors.linkedin}</p>}
                            </div>

                            {/* 8. GitHub URL */}
                            <div className="flex flex-col gap-2">
                                <label htmlFor="github" className={labelClass}>GitHub URL <span className="text-(--gray-normal) font-normal">(optional)</span></label>
                                <InputField
                                    id="github"
                                    type="url"
                                    autoComplete="url"
                                    placeholder="e.g. https://github.com" value={form.github}
                                    onChange={(e) => updateField('github', e.target.value)}
                                />
                                {errors.github && <p className={errorClass}>{errors.github}</p>}
                            </div>

                            {/* 9. Portfolio URL */}
                            <div className="flex flex-col gap-2">
                                <label htmlFor="portfolio" className={labelClass}>Portfolio/Website URL <span className="text-(--gray-normal) font-normal">(optional)</span></label>
                                <InputField
                                    id="portfolio"
                                    type="url"
                                    autoComplete="url"
                                    placeholder="e.g. https://example.com" value={form.portfolio}
                                    onChange={(e) => updateField('portfolio', e.target.value)}
                                />
                                {errors.portfolio && <p className={errorClass}>{errors.portfolio}</p>}
                            </div>

                            {/* 10. Current address */}
                            <div className="flex flex-col gap-2">
                                <label htmlFor="current-address" className={labelClass}>Current Address</label>
                                <InputField
                                    id="current-address"
                                    autoComplete="street-address"
                                    placeholder="Street no., City, Postal Code"
                                    value={form.currentAddress}
                                    onChange={(e) => updateField('currentAddress', e.target.value)}
                                />
                                {errors.currentAddress && <p className={errorClass}>{errors.currentAddress}</p>}
                            </div>

                            {/* 11. Permanent address */}
                            <div className="flex flex-col gap-2">
                                <label htmlFor="permanent-address" className={labelClass}>Permanent Address</label>
                                <InputField
                                    id="permanent-address"
                                    placeholder="Street no., City, Postal Code"
                                    value={form.permanentAddress}
                                    disabled={sameAsCurrent}
                                    onChange={(e) => updateField('permanentAddress', e.target.value)}
                                />
                                <label className="flex items-center gap-1 lg:gap-2 text-[12px] font-medium text-(--gray-dark) cursor-pointer">
                                    <input className='w-4 h-4'
                                        type="checkbox"
                                        checked={sameAsCurrent}
                                        onChange={(e) => handleSameAsCurrent(e.target.checked)}
                                    />
                                    Same as current address
                                </label>
                                {errors.permanentAddress && <p className={errorClass}>{errors.permanentAddress}</p>}
                            </div>
                        </div>

                        <div>
                            <Button variant="primary" size="small" type="submit" disabled={submitting}>
                                {submitting ? 'Saving…' : 'Next'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            <div className='hidden lg:flex'>
                <img src="/images/intern-onboarding.png" alt="Onboarding illustration" width={489} height={721} />
            </div>
        </div>
    )
}

export default PersonalInfoPage