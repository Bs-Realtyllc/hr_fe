"use client";

import Button from "@/components/Button/Button";
import InputField from "@/components/InputField/InputField";
import { BSRealtyDropdown } from "@bsrealtyllc/design-system";
import { useParams, useRouter } from "next/navigation";
import React, { useState } from "react";

type EducationInfo = {
    educationLevel: string;
    degree: string;
    institution: string;
    graduationYear: string;
};

type Errors = Partial<Record<keyof EducationInfo, string>>;

const INITIAL_STATE: EducationInfo = {
    educationLevel: "",
    degree: "",
    institution: "",
    graduationYear: "",
};

const EDUCATION_OPTIONS = [
    { label: "SEE", value: "see" },
    { label: "+2 / High School", value: "+2" },
    { label: "Bachelor's", value: "bachelor" },
    { label: "Master's", value: "master" },
];

const labelClass = "text-[14px] font-medium text-(--gray-dark-active)";
const errorClass = "text-[12px] text-(--error-normal)";

// Dropdown may return a plain string or an { value } object
const getDropdownValue = (selected: string | { value: string } | null) =>
    typeof selected === "string" ? selected : selected?.value ?? "";

function validate(values: EducationInfo): Errors {
    const errors: Errors = {};

    if (!values.educationLevel) errors.educationLevel = "Select your education level.";
    if (!values.degree.trim()) errors.degree = "Enter your field of study.";
    if (!values.institution.trim()) errors.institution = "Enter your institution name.";
    if (!values.graduationYear) errors.graduationYear = "Select your graduation date.";

    return errors;
}

const EducationalInfoPage = () => {
    const router = useRouter();
    const { value } = useParams<{ value: string }>();

    const [form, setForm] = useState<EducationInfo>(INITIAL_STATE);
    const [errors, setErrors] = useState<Errors>({});
    const [submitting, setSubmitting] = useState(false);

    function updateField<K extends keyof EducationInfo>(key: K, value: EducationInfo[K]) {
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
                ...form,
                degree: form.degree.trim(),
                institution: form.institution.trim(),
            };

            console.log("Educational info payload:", payload);

            router.push(`/onboard/${value}/emergency-contact`);
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="flex min-h-screen w-full justify-between items-center px-4 lg:px-15 pt-20 lg:pt-22 pb-8">
            <div className="absolute top-7.5 left-4 lg:left-15">
                <img className="h-4 w-22 lg:h-5 lg:w-28" src="/logos/gitgi-hr-logo.svg" alt="Logo" />
            </div>

            <div className="flex w-full lg:w-[534px] flex-col lg:gap-13">
                <div className="flex flex-col gap-5">
                    <h2 className="text-[16px] lg:text-[18px] text-(--neutral-normal) font-semibold">
                        Educational Information
                    </h2>

                    <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
                        <div className="flex flex-col gap-5">
                            {/* Education Level Dropdown */}
                            <div className="flex flex-col gap-2">
                                <label htmlFor="education-level" className={labelClass}>
                                    Education Level
                                </label>
                                <BSRealtyDropdown
                                    className="w-full!"
                                    options={EDUCATION_OPTIONS}
                                    placeholder="Select Education Level"
                                    value={form.educationLevel}
                                    onChange={(selected: string | { value: string } | null) =>
                                        updateField("educationLevel", getDropdownValue(selected))
                                    }
                                />
                                {errors.educationLevel && <p className={errorClass}>{errors.educationLevel}</p>}
                            </div>

                            {/* Institution Input */}
                            <div className="flex flex-col gap-2">
                                <label htmlFor="institution" className={labelClass}>
                                    Institution / College Name
                                </label>
                                <InputField
                                    id="institution"
                                    placeholder="Enter institution name"
                                    value={form.institution}
                                    onChange={(e) => updateField("institution", e.target.value)}
                                />
                                {errors.institution && <p className={errorClass}>{errors.institution}</p>}
                            </div>

                            {/* Field of Study Input */}
                            <div className="flex flex-col gap-2">
                                <label htmlFor="field-study" className={labelClass}>
                                    Field of Study
                                </label>
                                <InputField
                                    id="field-study"
                                    placeholder="e.g. IT, Engennering"
                                    value={form.degree}
                                    onChange={(e) => updateField("degree", e.target.value)}
                                />
                                {errors.degree && <p className={errorClass}>{errors.degree}</p>}
                            </div>

                            {/* Graduation Date Input */}
                            <div className="flex flex-col gap-2">
                                <label htmlFor="graduation-year" className={labelClass}>
                                    Graduation Date
                                </label>
                                <InputField
                                    id="graduation-year"
                                    type="date"
                                    placeholder=""
                                    value={form.graduationYear}
                                    onChange={(e) => updateField("graduationYear", e.target.value)}
                                />
                                {errors.graduationYear && <p className={errorClass}>{errors.graduationYear}</p>}
                            </div>
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex justify-between mt-4">
                            <Button
                                className="outline text-(--blue-sky-hover)!"
                                variant="text"
                                size="small"
                                type="button"
                                onClick={() => router.push(`/onboard/${value}/personal-information`)}
                                disabled={submitting}
                            >
                                Back
                            </Button>
                            <Button variant="primary" size="small" type="submit" disabled={submitting}>
                                {submitting ? "Saving…" : "Next Page"}
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

export default EducationalInfoPage;