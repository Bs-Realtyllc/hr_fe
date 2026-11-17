'use client'

import Button from "@/components/Button/Button"
import InputField from "@/components/InputField/InputField"
import { BSRealtyDropdown } from "@bsrealtyllc/design-system"
import { useState, type ReactNode } from "react"
import { useOnboarding, useOnboardingStep, type PersonalInfo } from "../../OnboardingContext"
import FieldLabel from "../../FieldLabel"

type Errors = Partial<Record<keyof PersonalInfo, string>>

const GENDER_OPTIONS = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' },
    { label: 'Prefer not to say', value: 'prefer_not_to_say' },
]

/** PersonalInfo key -> layout field name. name & email aren't in the layout: always shown + required. */
const LAYOUT_NAME: Partial<Record<keyof PersonalInfo, string>> = {
    dob: 'dob',
    gender: 'gender',
    nationality: 'nationality',
    phone: 'phone',
    currentAddress: 'currentAddress',
    permanentAddress: 'permanentAddress',
    linkedin: 'linkedinUrl',
    github: 'githubUrl',
    portfolio: 'portfolioUrl',
}

const REQUIRED_MESSAGES: Partial<Record<keyof PersonalInfo, string>> = {
    name: 'Enter your legal name.',
    dob: 'Select your date of birth.',
    gender: 'Select a gender option.',
    nationality: 'Enter your nationality.',
    email: 'Enter your email address.',
    phone: 'Enter your phone number.',
    currentAddress: 'Enter your current address.',
    permanentAddress: 'Enter your permanent address.',
    linkedin: 'Enter your LinkedIn URL.',
    github: 'Enter your GitHub URL.',
    portfolio: 'Enter your portfolio URL.',
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^\+?[0-9\s-]{7,15}$/
const URL_REGEX = /^(https?:\/\/)?([\w\-]+\.)+[\w\-]+(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/
/** employee_onboarding_profile.current_address / permanent_address are varchar(60). */
const ADDRESS_MAX = 60

const errorClass = "text-[12px] text-(--error-normal)"

// Local date as YYYY-MM-DD ('en-CA' formats this way)
const today = () => new Date().toLocaleDateString('en-CA')

const PersonalInfoPage = () => {
    const { data, updateSection } = useOnboarding()
    const step = useOnboardingStep('personal-information', 'personal')
    const form = data.personalInfo

    const [errors, setErrors] = useState<Errors>({})
    const sameAsCurrent = data.sameAsCurrent

    const isShown = (key: keyof PersonalInfo) => {
        const name = LAYOUT_NAME[key]
        return name ? step.show(name) : true
    }
    const isRequired = (key: keyof PersonalInfo) => {
        const name = LAYOUT_NAME[key]
        return name ? step.required(name) : true
    }
    const canCopyAddress = isShown('currentAddress') && isShown('permanentAddress')

    function validate(values: PersonalInfo): Errors {
        const errs: Errors = {}

        ;(Object.keys(REQUIRED_MESSAGES) as (keyof PersonalInfo)[]).forEach((key) => {
            if (isShown(key) && isRequired(key) && !values[key].trim()) {
                errs[key] = REQUIRED_MESSAGES[key]
            }
        })

        // Format checks apply whenever a shown field has a value.
        if (!errs.dob && isShown('dob') && values.dob && values.dob > today()) {
            errs.dob = 'Date of birth can’t be in the future.'
        }
        if (!errs.email && !EMAIL_REGEX.test(values.email.trim())) {
            errs.email = 'Enter a valid email, like name@example.com.'
        }
        if (!errs.phone && isShown('phone') && values.phone.trim() && !PHONE_REGEX.test(values.phone.trim())) {
            errs.phone = 'Enter a valid phone number.'
        }
        ;(['linkedin', 'github', 'portfolio'] as const).forEach((key) => {
            if (!errs[key] && isShown(key) && values[key].trim() && !URL_REGEX.test(values[key].trim())) {
                errs[key] = 'Enter a valid URL.'
            }
        })

        return errs
    }

    function updateField<K extends keyof PersonalInfo>(key: K, value: PersonalInfo[K]) {
        const next = { ...form, [key]: value }
        if (key === 'currentAddress' && sameAsCurrent && canCopyAddress) {
            next.permanentAddress = value as string
        }
        updateSection("personalInfo", next)
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

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const validationErrors = validate(form)
        setErrors(validationErrors)
        if (Object.keys(validationErrors).length > 0) return
        step.goNext()
    }

    /** One labelled field, rendered only if the layout includes it. */
    const field = (key: keyof PersonalInfo, id: string, label: string, input: ReactNode, extra?: ReactNode) =>
        isShown(key) && (
            <div className="flex flex-col gap-2">
                <FieldLabel htmlFor={id} required={isRequired(key)}>{label}</FieldLabel>
                {input}
                {extra}
                {errors[key] && <p className={errorClass}>{errors[key]}</p>}
            </div>
        )

    return (
        <div className="flex w-full justify-between items-center px-4 lg:px-15 pt-22 p-5 lg:pb-8">
            <div className='absolute top-7.5 left-4 lg:left-15'>
                <img className='h-4 w-22 lg:h-5 lg:w-28' src="/logos/gitgi-hr-logo.svg" alt="" />
            </div>

            <div className="flex w-full lg:w-[534px] flex-col gap-7 lg:gap-13">
                <div className="flex flex-col gap-1 lg:gap-2 mr-12 lg:mr-0">
                    <h1 className="text-[20px] lg:text-[24px] leading-7 lg:leading-8 text-(--neutral-normal) font-semibold">Finish setting up your HR profile</h1>
                    <p className="text-[14px] lg:text-[16px] font-normal lg:font-medium text-(--gray-dark)">
                        Provide your personal, employment, and document details to complete your employee record. Fields marked <span className="text-(--error-normal-hover)">*</span> are required.
                    </p>
                </div>

                <div className="flex flex-col gap-4 lg:gap-5">
                    <h2 className="text-[16px] lg:text-[18px] text-(--neutral-normal) font-semibold">Personal Information</h2>

                    <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
                        <div className="flex flex-col gap-5">
                            {field('name', 'name', 'Legal Name',
                                <InputField
                                    id="name"
                                    required
                                    placeholder="Enter Your Legal Name"
                                    value={form.name}
                                    maxLength={100}
                                    onChange={(e) => updateField('name', e.target.value)}
                                />
                            )}

                            {field('dob', 'dob', 'Date of Birth',
                                <InputField
                                    id="dob"
                                    type="date"
                                    required={isRequired('dob')}
                                    max={today()}
                                    value={form.dob}
                                    onChange={(e) => updateField('dob', e.target.value)}
                                />
                            )}

                            {field('gender', 'gender', 'Gender',
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
                            )}

                            {field('nationality', 'nationality', 'Nationality',
                                <InputField
                                    id="nationality"
                                    required={isRequired('nationality')}
                                    placeholder="Enter Your Nationality"
                                    value={form.nationality}
                                    maxLength={40}
                                    onChange={(e) => updateField('nationality', e.target.value)}
                                />
                            )}

                            {field('email', 'email', 'Email',
                                <InputField
                                    id="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    placeholder="name@example.com"
                                    value={form.email}
                                    maxLength={150}
                                    onChange={(e) => updateField('email', e.target.value)}
                                />
                            )}

                            {field('phone', 'phone', 'Phone Number',
                                <InputField
                                    id="phone"
                                    type="tel"
                                    required={isRequired('phone')}
                                    autoComplete="tel"
                                    placeholder="Enter Your phone"
                                    value={form.phone}
                                    maxLength={20}
                                    onChange={(e) => updateField('phone', e.target.value)}
                                />
                            )}

                            {field('linkedin', 'linkedin', 'LinkedIn URL',
                                <InputField
                                    id="linkedin"
                                    type="url"
                                    required={isRequired('linkedin')}
                                    autoComplete="url"
                                    placeholder="e.g. https://linkedin.com"
                                    value={form.linkedin}
                                    maxLength={255}
                                    onChange={(e) => updateField('linkedin', e.target.value)}
                                />
                            )}

                            {field('github', 'github', 'GitHub URL',
                                <InputField
                                    id="github"
                                    type="url"
                                    required={isRequired('github')}
                                    autoComplete="url"
                                    placeholder="e.g. https://github.com"
                                    value={form.github}
                                    maxLength={255}
                                    onChange={(e) => updateField('github', e.target.value)}
                                />
                            )}

                            {field('portfolio', 'portfolio', 'Portfolio/Website URL',
                                <InputField
                                    id="portfolio"
                                    type="url"
                                    required={isRequired('portfolio')}
                                    autoComplete="url"
                                    placeholder="e.g. https://example.com"
                                    value={form.portfolio}
                                    maxLength={255}
                                    onChange={(e) => updateField('portfolio', e.target.value)}
                                />
                            )}

                            {field('currentAddress', 'current-address', 'Current Address',
                                <InputField
                                    id="current-address"
                                    required={isRequired('currentAddress')}
                                    autoComplete="street-address"
                                    placeholder="Street no., City, Postal Code"
                                    value={form.currentAddress}
                                    maxLength={ADDRESS_MAX}
                                    onChange={(e) => updateField('currentAddress', e.target.value)}
                                />
                            )}

                            {field('permanentAddress', 'permanent-address', 'Permanent Address',
                                <InputField
                                    id="permanent-address"
                                    required={isRequired('permanentAddress')}
                                    placeholder="Street no., City, Postal Code"
                                    value={form.permanentAddress}
                                    maxLength={ADDRESS_MAX}
                                    disabled={sameAsCurrent && canCopyAddress}
                                    onChange={(e) => updateField('permanentAddress', e.target.value)}
                                />,
                                canCopyAddress && (
                                    <label className="flex items-center gap-1 lg:gap-2 text-[12px] font-medium text-(--gray-dark) cursor-pointer">
                                        <input className='w-4 h-4'
                                            type="checkbox"
                                            checked={sameAsCurrent}
                                            onChange={(e) => handleSameAsCurrent(e.target.checked)}
                                        />
                                        Same as current address
                                    </label>
                                )
                            )}
                        </div>

                        <div>
                            <Button variant="primary" size="small" type="submit">
                                Next
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
