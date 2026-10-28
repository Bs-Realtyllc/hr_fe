"use client";

import Button from "@/components/Button/Button";
import InputField from "@/components/InputField/InputField";
import { BSRealtyDropdown } from "@bsrealtyllc/design-system";
import { useParams, useRouter } from "next/navigation";
import React, { useState } from "react";

type EmergencyContact = {
    fullName: string;
    relationship: string;
    phone: string;
    email: string;
    address: string;
};

type Errors = Partial<Record<keyof EmergencyContact, string>>;

const INITIAL_STATE: EmergencyContact = {
    fullName: "",
    relationship: "",
    phone: "",
    email: "",
    address: "",
};

const RELATIONSHIP_OPTIONS = [

    { label: "Parent", value: "parent" },
    { label: "Cousin", value: "cousin" },
    { label: "Patner", value: "patner" },
    { label: "Neighbour", value: "neighbour" },
    { label: "Nephew", value: "nephew" },

];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s-]{7,15}$/;

const labelClass = "text-[14px] font-medium text-(--gray-dark-active)";
const optionalClass = "text-[14px] font-medium text-(--soft-white-dark-hover)";
const errorClass = "text-[12px] text-(--error-normal)";

// Dropdown may return a plain string or an { value } object
const getDropdownValue = (selected: string | { value: string } | null) =>
    typeof selected === "string" ? selected : selected?.value ?? "";

function validate(values: EmergencyContact): Errors {
    const errors: Errors = {};

    if (!values.fullName.trim()) errors.fullName = "Enter your contact's full name.";
    if (!values.relationship) errors.relationship = "Select your relationship to this contact.";

    if (!values.phone.trim()) {
        errors.phone = "Enter your contact's phone number.";
    } else if (!PHONE_REGEX.test(values.phone.trim())) {
        errors.phone = "Enter a valid phone number.";
    }

    // Email is optional, but must be valid if provided
    if (values.email.trim() && !EMAIL_REGEX.test(values.email.trim())) {
        errors.email = "Enter a valid email, like name@example.com.";
    }

    // Address is optional

    return errors;
}

const EmergencyContactPage = () => {
    const router = useRouter();
    const { value } = useParams<{ value: string }>();

    const [form, setForm] = useState<EmergencyContact>(INITIAL_STATE);
    const [errors, setErrors] = useState<Errors>({});
    const [submitting, setSubmitting] = useState(false);


    function updateField<K extends keyof EmergencyContact>(key: K, value: EmergencyContact[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
        if (errors[key]) {
            setErrors((prev) => ({ ...prev, [key]: undefined }));
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const validationErrors = validate(form);
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;

        setSubmitting(true);
        try {
            const payload = {
                fullName: form.fullName.trim(),
                relationship: form.relationship,
                phone: form.phone.trim(),
                email: form.email.trim().toLowerCase() || null,
                address: form.address.trim() || null,
            };

            console.log("Emergency contact:", payload);

            router.push(`/onboard/${value}/documents`)
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="flex w-full justify-between items-center px-15 pt-22 pb-8">
            <div className="absolute top-9 left-15">
                <img width={111} height={20} src="/logos/gitgi-hr-logo.svg" alt="Gitgi HR" />
            </div>

            <div className="flex w-[534px] flex-col gap-13">
                <div className="flex flex-col gap-5">
                    <h2 className="text-[16px] text-(--neutral-normal) font-semibold">Emergency Contact</h2>

                    <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-2">
                                <label htmlFor="full-name" className={labelClass}>Full Name</label>
                                <InputField
                                    id="full-name"
                                    autoComplete="off"
                                    placeholder="Enter contact's full name"
                                    value={form.fullName}
                                    onChange={(e) => updateField("fullName", e.target.value)}
                                />
                                {errors.fullName && <p className={errorClass}>{errors.fullName}</p>}
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="relationship" className={labelClass}>Relationship</label>
                                <BSRealtyDropdown
                                    className="w-full!"
                                    // id="relationship"
                                    options={RELATIONSHIP_OPTIONS}
                                    placeholder="Select relationship"
                                    value={form.relationship}
                                    onChange={(selected: string | { value: string } | null) =>
                                        updateField("relationship", getDropdownValue(selected))
                                    }
                                />
                                {errors.relationship && <p className={errorClass}>{errors.relationship}</p>}
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="emergency-phone" className={labelClass}>Phone Number</label>
                                <InputField
                                    id="emergency-phone"
                                    type="tel"
                                    autoComplete="off"
                                    placeholder="Enter contact's phone number"
                                    value={form.phone}
                                    onChange={(e) => updateField("phone", e.target.value)}
                                />
                                {errors.phone && <p className={errorClass}>{errors.phone}</p>}
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="emergency-email" className={labelClass}>
                                    Email <span className={optionalClass}>(optional)</span>
                                </label>
                                <InputField
                                    id="emergency-email"
                                    type="email"
                                    autoComplete="off"
                                    placeholder="name@example.com"
                                    value={form.email}
                                    onChange={(e) => updateField("email", e.target.value)}
                                />
                                {errors.email && <p className={errorClass}>{errors.email}</p>}
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="emergency-address" className={labelClass}>
                                    Address <span className={optionalClass}>(optional)</span>
                                </label>
                                <InputField
                                    id="emergency-address"
                                    autoComplete="off"
                                    placeholder="Street no., City, Postal Code"
                                    value={form.address}
                                    onChange={(e) => updateField("address", e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex justify-between">
                            <Button
                                className="outline text-(--blue-sky-hover)!"
                                variant="text"
                                size="medium"
                                type="button"
                                onClick={() => router.push(`/onboard/${value}/employee-info`)}
                                disabled={submitting}
                            >
                                Back
                            </Button>
                            <Button variant="primary" size="medium" type="submit" disabled={submitting}>
                                {submitting ? "Saving…" : "Next Page"}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            <div>
                <img src="/images/intern-onboarding.png" alt="Onboarding illustration" width={489} height={721} />
            </div>
        </div>
    );
};

export default EmergencyContactPage;