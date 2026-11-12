"use client";

import Button from "@/components/Button/Button";
import InputField from "@/components/InputField/InputField";
import { BSRealtyDropdown } from "@bsrealtyllc/design-system";
import React, { useState } from "react";
import { useOnboarding, useOnboardingStep, type EmergencyContact } from "../../OnboardingContext";
import FieldLabel from "../../FieldLabel";

type Errors = Partial<Record<keyof EmergencyContact, string>>;

const RELATIONSHIP_OPTIONS = [

    { label: "Parent", value: "parent" },
    { label: "Cousin", value: "cousin" },
    { label: "Partner", value: "partner" },
    { label: "Neighbour", value: "neighbour" },
    { label: "Nephew", value: "nephew" },

];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s-]{7,15}$/;

const errorClass = "text-[12px] text-(--error-normal)";

// Dropdown may return a plain string or an { value } object
const getDropdownValue = (selected: string | { value: string } | null) =>
    typeof selected === "string" ? selected : selected?.value ?? "";

/** EmergencyContact key -> layout field name */
const LAYOUT_NAME: Record<keyof EmergencyContact, string> = {
    fullName: "emergencyContactName",
    relationship: "emergencyContactRelation",
    phone: "emergencyContactPhone",
    email: "emergencyContactEmail",
    address: "emergencyContactAddress",
};

const REQUIRED_MESSAGES: Record<keyof EmergencyContact, string> = {
    fullName: "Enter your contact's full name.",
    relationship: "Select your relationship to this contact.",
    phone: "Enter your contact's phone number.",
    email: "Enter your contact's email.",
    address: "Enter your contact's address.",
};

function validate(
    values: EmergencyContact,
    isShown: (key: keyof EmergencyContact) => boolean,
    isRequired: (key: keyof EmergencyContact) => boolean,
): Errors {
    const errors: Errors = {};

    (Object.keys(REQUIRED_MESSAGES) as (keyof EmergencyContact)[]).forEach((key) => {
        if (isShown(key) && isRequired(key) && !values[key].trim()) errors[key] = REQUIRED_MESSAGES[key];
    });

    // Format checks apply whenever a shown field has a value.
    if (!errors.phone && isShown("phone") && values.phone.trim() && !PHONE_REGEX.test(values.phone.trim())) {
        errors.phone = "Enter a valid phone number.";
    }
    if (!errors.email && isShown("email") && values.email.trim() && !EMAIL_REGEX.test(values.email.trim())) {
        errors.email = "Enter a valid email, like name@example.com.";
    }

    return errors;
}

const EmergencyContactPage = () => {
    const { data, updateSection } = useOnboarding();
    const step = useOnboardingStep("emergency-contact", "emergency");
    const form = data.emergencyContact;

    const [errors, setErrors] = useState<Errors>({});

    const isShown = (key: keyof EmergencyContact) => step.show(LAYOUT_NAME[key]);
    const isRequired = (key: keyof EmergencyContact) => step.required(LAYOUT_NAME[key]);

    if (!step.stepVisible) return null;

    function updateField<K extends keyof EmergencyContact>(key: K, value: EmergencyContact[K]) {
        updateSection("emergencyContact", { ...form, [key]: value });
        if (errors[key]) {
            setErrors((prev) => ({ ...prev, [key]: undefined }));
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const validationErrors = validate(form, isShown, isRequired);
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;
        step.goNext();
    }

    return (
        <div className="flex min-h-screen w-full justify-between items-center px-4 lg:px-15 pt-20 lg:pt-22 lg:pb-8">
            <div className=' absolute top-7.5 left-4 lg:left-15  '>
                <img className='h-4 w-22 lg:h-5 lg:w-28' src="/logos/gitgi-hr-logo.svg" alt="" />
            </div >

            <div className="flex w-full pb-5 lg:pb-0  lg:w-[534px] flex-col">
                <div className="flex flex-col gap-5">
                    <h2 className="text-[16px] lg:text-[18px] text-(--neutral-normal) font-semibold">Emergency Contact</h2>

                    <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
                        <div className="flex flex-col gap-3">
                            {isShown("fullName") && (
                                <div className="flex flex-col gap-2">
                                    <FieldLabel htmlFor="full-name" required={isRequired("fullName")}>Full Name</FieldLabel>
                                    <InputField
                                        id="full-name"
                                        required={isRequired("fullName")}
                                        autoComplete="off"
                                        placeholder="Enter contact's full name"
                                        value={form.fullName}
                                        maxLength={150}
                                        onChange={(e) => updateField("fullName", e.target.value)}
                                    />
                                    {errors.fullName && <p className={errorClass}>{errors.fullName}</p>}
                                </div>
                            )}

                            {isShown("relationship") && (
                                <div className="flex flex-col gap-2">
                                    <FieldLabel htmlFor="relationship" required={isRequired("relationship")}>Relationship</FieldLabel>
                                    <BSRealtyDropdown
                                        className="w-full!"
                                        options={RELATIONSHIP_OPTIONS}
                                        placeholder="Select relationship"
                                        value={form.relationship}
                                        onChange={(selected: string | { value: string } | null) =>
                                            updateField("relationship", getDropdownValue(selected))
                                        }
                                    />
                                    {errors.relationship && <p className={errorClass}>{errors.relationship}</p>}
                                </div>
                            )}

                            {isShown("phone") && (
                                <div className="flex flex-col gap-2">
                                    <FieldLabel htmlFor="emergency-phone" required={isRequired("phone")}>Phone Number</FieldLabel>
                                    <InputField
                                        id="emergency-phone"
                                        type="tel"
                                        required={isRequired("phone")}
                                        autoComplete="off"
                                        placeholder="Enter contact's phone number"
                                        value={form.phone}
                                        maxLength={20}
                                        onChange={(e) => updateField("phone", e.target.value)}
                                    />
                                    {errors.phone && <p className={errorClass}>{errors.phone}</p>}
                                </div>
                            )}

                            {isShown("email") && (
                                <div className="flex flex-col gap-2">
                                    <FieldLabel htmlFor="emergency-email" required={isRequired("email")}>Email</FieldLabel>
                                    <InputField
                                        id="emergency-email"
                                        type="email"
                                        required={isRequired("email")}
                                        autoComplete="off"
                                        placeholder="name@example.com"
                                        value={form.email}
                                        maxLength={150}
                                        onChange={(e) => updateField("email", e.target.value)}
                                    />
                                    {errors.email && <p className={errorClass}>{errors.email}</p>}
                                </div>
                            )}

                            {isShown("address") && (
                                <div className="flex flex-col gap-2">
                                    <FieldLabel htmlFor="emergency-address" required={isRequired("address")}>Address</FieldLabel>
                                    <InputField
                                        id="emergency-address"
                                        required={isRequired("address")}
                                        autoComplete="off"
                                        placeholder="Street no., City, Postal Code"
                                        value={form.address}
                                        maxLength={60}
                                        onChange={(e) => updateField("address", e.target.value)}
                                    />
                                    {errors.address && <p className={errorClass}>{errors.address}</p>}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between">
                            <Button
                                className="outline text-(--blue-sky-hover)!"
                                variant="text"
                                size="small"
                                type="button"
                                onClick={step.goBack}
                            >
                                Back
                            </Button>
                            <Button variant="primary" size="small" type="submit">
                                Next Page
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            <div className="hidden lg:flex">
                <img
                    src="/images/intern-onboarding.png"
                    alt="Onboarding illustration"
                    width={489}
                    className="h-[500px]"
                />
            </div>
        </div>
    );
};

export default EmergencyContactPage;