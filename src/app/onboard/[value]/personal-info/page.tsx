'use client'

import Button from "@/components/Button/Button"
import InputField from "@/components/InputField/InputField"
import { BSRealtyDropdown } from "@bsrealtyllc/design-system"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"

type PersonalInfo = {
    name: string
    dob: string // "YYYY-MM-DD"
    gender: string
    nationality: string
    email: string
    phone: string
    currentAddress: string
    permanentAddress: string
}

type Errors = Partial<Record<keyof PersonalInfo, string>>

const INITIAL_STATE: PersonalInfo = {
    name: '',
    dob: '',
    gender: '',
    nationality: '',
    email: '',
    phone: '',
    currentAddress: '',
    permanentAddress: '',
}

const GENDER_OPTIONS = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' },
]

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^\+?[0-9\s-]{7,15}$/

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

    if (!values.currentAddress.trim()) errors.currentAddress = 'Enter your current address.'
    if (!values.permanentAddress.trim()) errors.permanentAddress = 'Enter your permanent address.'

    return errors
}

const PersonalInfoPage = () => {
    const router = useRouter()
    const { value } = useParams<{ value: string }>();

    const [form, setForm] = useState<PersonalInfo>(INITIAL_STATE)
    const [errors, setErrors] = useState<Errors>({})
    const [sameAsCurrent, setSameAsCurrent] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    function updateField<K extends keyof PersonalInfo>(key: K, value: PersonalInfo[K]) {
        setForm((prev) => {
            const next = { ...prev, [key]: value }
            // Keep permanent address in sync while the checkbox is ticked
            if (key === 'currentAddress' && sameAsCurrent) {
                next.permanentAddress = value
            }
            return next
        })
        // Clear the error for this field as the user fixes it
        if (errors[key]) {
            setErrors((prev) => ({ ...prev, [key]: undefined }))
        }
    }

    function handleSameAsCurrent(checked: boolean) {
        setSameAsCurrent(checked)
        if (checked) {
            setForm((prev) => ({ ...prev, permanentAddress: prev.currentAddress }))
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
            }

            console.log('Personal info:', payload)

            router.push(`/onboard/${value}/employee-info`)
        } catch (err) {
            console.error(err)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className=" flex w-full justify-between items-center px-15 pt-22 pb-8">
            <div className="absolute top-9 left-15">
                <img width={111} height={20} src="/logos/gitgi-hr-logo.svg" alt="Gitgi HR" />
            </div>

            <div className="flex w-[534px] flex-col gap-13">
                <div className="flex flex-col gap-2">
                    <h1 className="text-[24px] text-(--neutral-normal) font-medium">Finish setting up your HR profile</h1>
                    <p className="text-[16px] font-medium text-[#4B5768]">
                        Provide your personal, employment, and document details to complete your employee record. Fields marked optional can be skipped.
                    </p>
                </div>

                <div className="flex flex-col gap-5">
                    <h2 className="text-[18px] text-(--neutral-normal) font-medium">Personal Information</h2>

                    <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
                        <div className="flex flex-col gap-5">
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

                            <div className="flex flex-col gap-2">
                                <label htmlFor="dob" className={labelClass}>Date of Birth</label>
                                <InputField
                                    type="date"
                                    id="dob"
                                    value={form.dob}
                                    max={today()}
                                    onChange={(e) => updateField('dob', e.target.value)}

                                />
                                {errors.dob && <p className={errorClass}>{errors.dob}</p>}
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="gender" className={labelClass}>Gender</label>
                                <BSRealtyDropdown
                                    className="w-full!"
                                    // id="gender"
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

                            <div className="flex flex-col gap-2">
                                <label htmlFor="permanent-address" className={labelClass}>Permanent Address</label>
                                <InputField
                                    id="permanent-address"
                                    placeholder="Street no., City, Postal Code"
                                    value={form.permanentAddress}
                                    disabled={sameAsCurrent}
                                    onChange={(e) => updateField('permanentAddress', e.target.value)}
                                />
                                <label className="flex items-center gap-2 text-[12px] font-medium text-(--gray-dark) cursor-pointer">
                                    <input
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
                            <Button variant="primary" size="medium" type="submit" disabled={submitting}>
                                {submitting ? 'Saving…' : 'Next'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            <div>
                <img src="/images/intern-onboarding.png" alt="Onboarding illustration" width={489} height={721} />
            </div>
        </div>
    )
}

export default PersonalInfoPage