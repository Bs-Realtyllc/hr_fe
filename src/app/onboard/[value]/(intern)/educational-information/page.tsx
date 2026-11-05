"use client";

import Button from "@/components/Button/Button";
import FileUpload from "@/components/FileUpload/FileUpload";
import InputField from "@/components/InputField/InputField";
import { BSRealtyDropdown } from "@bsrealtyllc/design-system";
import { useParams, useRouter } from "next/navigation";
import React, { useState } from "react";
import { useOnboarding, type EducationItem } from "../../OnboardingContext";

type Errors = Record<number, Partial<Record<keyof EducationItem, string>>>;

const EDUCATION_OPTIONS = [
    { label: "SEE", value: "see" },
    { label: "+2 / High School", value: "+2" },
    { label: "Bachelor's", value: "bachelor" },
    { label: "Master's", value: "master" },
];

const labelClass = "text-[14px] font-medium text-(--gray-dark-active)";
const errorClass = "text-[12px] text-(--error-normal)";

const getDropdownValue = (selected: string | { value: string } | null) =>
    typeof selected === "string" ? selected : selected?.value ?? "";

const EducationalInfoPage = () => {
    const router = useRouter();
    const { value } = useParams<{ value: string }>();
    const { data, updateSection } = useOnboarding();
    const educations = data.educations;

    const [errors, setErrors] = useState<Errors>({});
    const [submitting, setSubmitting] = useState(false);

    function updateField<K extends keyof EducationItem>(index: number, key: K, value: EducationItem[K]) {
        const updated = [...educations];
        updated[index] = { ...updated[index], [key]: value };
        updateSection("educations", updated);

        if (errors[index]?.[key]) {
            setErrors((prev) => ({
                ...prev,
                [index]: { ...prev[index], [key]: undefined },
            }));
        }
    }

    function addEducation() {
        updateSection("educations", [
            ...educations,
            {
                id: crypto.randomUUID(),
                educationLevel: "",
                degree: "",
                institution: "",
                graduationYear: "",
                currentEnrollment: false,
                document: null,
            },
        ]);
    }

    function removeEducation(index: number) {
        if (educations.length === 1) return;
        updateSection("educations", educations.filter((_, i) => i !== index));
        setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[index];
            return newErrors;
        });
    }

    function validate(): boolean {
        const newErrors: Errors = {};
        let isValid = true;

        educations.forEach((edu, index) => {
            const itemErrors: Partial<Record<keyof EducationItem, string>> = {};
            if (!edu.educationLevel) itemErrors.educationLevel = "Select your education level.";
            if (!edu.institution.trim()) itemErrors.institution = "Enter your institution name.";
            if (!edu.degree.trim()) itemErrors.degree = "Enter your field of study.";
            if (!edu.currentEnrollment && !edu.graduationYear) {
                itemErrors.graduationYear = "Select your graduation date.";
            }

            if (Object.keys(itemErrors).length > 0) {
                newErrors[index] = itemErrors;
                isValid = false;
            }
        });

        setErrors(newErrors);
        return isValid;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!validate()) return;

        setSubmitting(true);
        try {
            const payload = educations.map((edu) => ({
                ...edu,
                degree: edu.degree.trim(),
                institution: edu.institution.trim(),
                graduationYear: edu.currentEnrollment ? "" : edu.graduationYear,
            }));

            console.log("Educational info payload:", payload);

            router.push(`/onboard/${value}/experience`);
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="flex min-h-screen w-full justify-between items-start px-4 lg:px-15 pt-20 lg:pt-22 pb-8">
            <div className="absolute top-7.5 left-4 lg:left-15">
                <img className="h-4 w-22 lg:h-5 lg:w-28" src="/logos/gitgi-hr-logo.svg" alt="Logo" />
            </div>

            <div className="flex w-full max-w-[800px] flex-col gap-7 mx-auto">
                {/* Header with Add Button on Top Right */}
                <div className="flex justify-between items-center w-full">
                    <h2 className="text-[18px] lg:text-[20px] text-(--neutral-normal) font-semibold">
                        Educational Information
                    </h2>
                    <Button
                        type="button"
                        variant="primary"
                        size="small"
                        onClick={addEducation}
                    >
                        + Add Education
                    </Button>
                </div>

                <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
                    {educations.map((edu, index) => {
                        const itemError = errors[index] || {};

                        return (
                            <div
                                key={edu.id}
                                className="flex flex-col gap-5 p-6 bg-white border border-gray-200 rounded-xl shadow-xs relative"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {/* Education Level Dropdown */}
                                    <div className="flex flex-col gap-2">
                                        <label htmlFor={`education-level-${index}`} className={labelClass}>
                                            Education Level
                                        </label>
                                        <BSRealtyDropdown
                                            className="w-full!"
                                            options={EDUCATION_OPTIONS}
                                            placeholder="Select Education Level"
                                            value={edu.educationLevel}
                                            onChange={(selected: string | { value: string } | null) =>
                                                updateField(index, "educationLevel", getDropdownValue(selected))
                                            }
                                        />
                                        {itemError.educationLevel && <p className={errorClass}>{itemError.educationLevel}</p>}
                                    </div>

                                    {/* Institution Input */}
                                    <div className="flex flex-col gap-2">
                                        <label htmlFor={`institution-${index}`} className={labelClass}>
                                            Institution / College Name
                                        </label>
                                        <InputField
                                            id={`institution-${index}`}
                                            placeholder="Enter institution name"
                                            value={edu.institution}
                                            onChange={(e) => updateField(index, "institution", e.target.value)}
                                        />
                                        {itemError.institution && <p className={errorClass}>{itemError.institution}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {/* Field of Study Input */}
                                    <div className="flex flex-col gap-2">
                                        <label htmlFor={`field-study-${index}`} className={labelClass}>
                                            Field of Study
                                        </label>
                                        <InputField
                                            id={`field-study-${index}`}
                                            placeholder="e.g. IT, Engineering"
                                            value={edu.degree}
                                            onChange={(e) => updateField(index, "degree", e.target.value)}
                                        />
                                        {itemError.degree && <p className={errorClass}>{itemError.degree}</p>}
                                    </div>

                                    {/* Graduation Date Input */}
                                    <div className="flex flex-col gap-2">
                                        <label htmlFor={`graduation-year-${index}`} className={labelClass}>
                                            Graduation Date
                                        </label>
                                        <InputField
                                            id={`graduation-year-${index}`}
                                            type="date"
                                            disabled={edu.currentEnrollment}
                                            value={edu.currentEnrollment ? "" : edu.graduationYear}
                                            onChange={(e) => updateField(index, "graduationYear", e.target.value)}
                                        />
                                        <div className="flex gap-2 items-center mt-1">
                                            <input
                                                type="checkbox"
                                                id={`current-enrollment-${index}`}
                                                checked={edu.currentEnrollment}
                                                onChange={(e) => updateField(index, "currentEnrollment", e.target.checked)}
                                                className="cursor-pointer"
                                            />
                                            <label htmlFor={`current-enrollment-${index}`} className="text-[13px] text-(--gray-dark-active) cursor-pointer">
                                                Current Enrollment
                                            </label>
                                        </div>
                                        {itemError.graduationYear && <p className={errorClass}>{itemError.graduationYear}</p>}
                                    </div>
                                </div>

                                {/* Educational Document Upload (Hidden if Current Enrollment) */}
                                {!edu.currentEnrollment && (
                                    <div>
                                        <FileUpload
                                            label="Educational Document"
                                            optional={true}
                                            value={edu.document}
                                            onChange={(file) =>
                                                updateField(index, "document", Array.isArray(file) ? file[0] ?? null : file)
                                            }
                                        />
                                    </div>
                                )}

                                {/* Remove Education link (if more than 1 entry) */}
                                {educations.length > 1 && (
                                    <div className="flex justify-end pt-2">
                                        <button
                                            type="button"
                                            onClick={() => removeEducation(index)}
                                            className="text-[13px] text-(--error-normal) font-medium hover:underline cursor-pointer"
                                        >
                                            Remove education
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}

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
    );
};

export default EducationalInfoPage;