"use client";

import Button from "@/components/Button/Button";
import FileUpload from "@/components/FileUpload/FileUpload";
import InputField from "@/components/InputField/InputField";
import { BSRealtyDropdown } from "@bsrealtyllc/design-system";
import React, { useState } from "react";
import { MAX_ENTRIES } from "../../onboardSubmission";
import { useOnboarding, useOnboardingStep, type EducationItem } from "../../OnboardingContext";
import FieldLabel from "../../FieldLabel";

type Errors = Record<number, Partial<Record<keyof EducationItem, string>>>;

const EDUCATION_OPTIONS = [
    { label: "SEE", value: "see" },
    { label: "+2 / High School", value: "+2" },
    { label: "Bachelor's", value: "bachelor" },
    { label: "Master's", value: "master" },
];

const errorClass = "text-[12px] text-(--error-normal)";

const getDropdownValue = (selected: string | { value: string } | null) =>
    typeof selected === "string" ? selected : selected?.value ?? "";

const newEducation = (): EducationItem => ({
    id: crypto.randomUUID(),
    educationLevel: "",
    degree: "",
    institution: "",
    graduationYear: "",
    currentEnrollment: false,
    document: null,
});

const EducationalInfoPage = () => {
    const { data, updateSection } = useOnboarding();
    const step = useOnboardingStep("educational-information", "educational");
    const educations = data.educations;

    const [errors, setErrors] = useState<Errors>({});
    const canAdd = educations.length < MAX_ENTRIES;

    const show = {
        level: step.show("educationLevel"),
        institution: step.show("institutionName"),
        field: step.show("fieldOfStudy"),
        enrolled: step.show("stillEnrolled"),
        graduation: step.show("graduationDate"),
        certificate: step.show("certificate"),
    };
    const req = {
        level: step.required("educationLevel"),
        institution: step.required("institutionName"),
        field: step.required("fieldOfStudy"),
        graduation: step.required("graduationDate"),
        certificate: step.required("certificate"),
    };

    if (!step.stepVisible) return null;

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
        if (!canAdd) return;
        updateSection("educations", [...educations, newEducation()]);
    }

    function removeEducation(index: number) {
        if (educations.length === 1) return;
        updateSection("educations", educations.filter((_, i) => i !== index));
        setErrors({});
    }

    function validate(): boolean {
        const newErrors: Errors = {};

        educations.forEach((edu, index) => {
            const itemErrors: Partial<Record<keyof EducationItem, string>> = {};
            // "Still enrolled" only counts when that checkbox is part of the form.
            const enrolled = show.enrolled && edu.currentEnrollment;

            if (show.level && req.level && !edu.educationLevel) itemErrors.educationLevel = "Select your education level.";
            if (show.institution && req.institution && !edu.institution.trim()) itemErrors.institution = "Enter your institution name.";
            if (show.field && req.field && !edu.degree.trim()) itemErrors.degree = "Enter your field of study.";
            if (show.graduation && req.graduation && !enrolled && !edu.graduationYear) {
                itemErrors.graduationYear = "Select your graduation date.";
            }
            if (show.certificate && req.certificate && !enrolled && !edu.document) {
                itemErrors.document = "Upload your educational document.";
            }

            if (Object.keys(itemErrors).length > 0) newErrors[index] = itemErrors;
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!validate()) return;
        step.goNext();
    }

    return (
        <div className="flex min-h-screen w-full justify-between items-start px-4 lg:px-15 pt-20 lg:pt-22 pb-8">
            <div className="absolute top-7.5 left-4 lg:left-15">
                <img className="h-4 w-22 lg:h-5 lg:w-28" src="/logos/gitgi-hr-logo.svg" alt="Logo" />
            </div>

            <div className="flex w-full max-w-[800px] flex-col gap-7 mx-auto">
                <div className="flex justify-between items-center w-full">
                    <h2 className="text-[18px] lg:text-[20px] text-(--neutral-normal) font-semibold">
                        Educational Information
                    </h2>
                    <Button
                        type="button"
                        variant="primary"
                        size="small"
                        onClick={addEducation}
                        disabled={!canAdd}
                        title={canAdd ? undefined : `You can add up to ${MAX_ENTRIES} entries.`}
                    >
                        + Add Education ({educations.length}/{MAX_ENTRIES})
                    </Button>
                </div>

                <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
                    {educations.map((edu, index) => {
                        const itemError = errors[index] || {};
                        const enrolled = show.enrolled && edu.currentEnrollment;

                        return (
                            <div
                                key={edu.id}
                                className="flex flex-col gap-5 p-6 bg-white border border-gray-200 rounded-xl shadow-xs relative"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {show.level && (
                                        <div className="flex flex-col gap-2">
                                            <FieldLabel htmlFor={`education-level-${index}`} required={req.level}>
                                                Education Level
                                            </FieldLabel>
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
                                    )}

                                    {show.institution && (
                                        <div className="flex flex-col gap-2">
                                            <FieldLabel htmlFor={`institution-${index}`} required={req.institution}>
                                                Institution / College Name
                                            </FieldLabel>
                                            <InputField
                                                id={`institution-${index}`}
                                                required={req.institution}
                                                placeholder="Enter institution name"
                                                value={edu.institution}
                                                onChange={(e) => updateField(index, "institution", e.target.value)}
                                            />
                                            {itemError.institution && <p className={errorClass}>{itemError.institution}</p>}
                                        </div>
                                    )}

                                    {show.field && (
                                        <div className="flex flex-col gap-2">
                                            <FieldLabel htmlFor={`field-study-${index}`} required={req.field}>
                                                Field of Study
                                            </FieldLabel>
                                            <InputField
                                                id={`field-study-${index}`}
                                                required={req.field}
                                                placeholder="e.g. IT, Engineering"
                                                value={edu.degree}
                                                onChange={(e) => updateField(index, "degree", e.target.value)}
                                            />
                                            {itemError.degree && <p className={errorClass}>{itemError.degree}</p>}
                                        </div>
                                    )}

                                    {(show.graduation || show.enrolled) && (
                                        <div className="flex flex-col gap-2">
                                            {show.graduation && (
                                                <>
                                                    <FieldLabel htmlFor={`graduation-year-${index}`} required={req.graduation && !enrolled}>
                                                        Graduation Date
                                                    </FieldLabel>
                                                    <InputField
                                                        id={`graduation-year-${index}`}
                                                        type="date"
                                                        required={req.graduation && !enrolled}
                                                        disabled={enrolled}
                                                        value={enrolled ? "" : edu.graduationYear}
                                                        onChange={(e) => updateField(index, "graduationYear", e.target.value)}
                                                    />
                                                </>
                                            )}
                                            {show.enrolled && (
                                                <div className={`flex gap-2 items-center ${show.graduation ? "mt-1" : ""}`}>
                                                    <input
                                                        type="checkbox"
                                                        id={`current-enrollment-${index}`}
                                                        checked={edu.currentEnrollment}
                                                        onChange={(e) => updateField(index, "currentEnrollment", e.target.checked)}
                                                        className="cursor-pointer"
                                                    />
                                                    <label htmlFor={`current-enrollment-${index}`} className="text-[13px] text-(--gray-dark-active) cursor-pointer">
                                                        Currently enrolled
                                                    </label>
                                                </div>
                                            )}
                                            {itemError.graduationYear && <p className={errorClass}>{itemError.graduationYear}</p>}
                                        </div>
                                    )}
                                </div>

                                {/* Hidden while still enrolled: there's no certificate yet */}
                                {show.certificate && !enrolled && (
                                    <FileUpload
                                        label="Educational Document"
                                        required={req.certificate}
                                        optional={!req.certificate}
                                        value={edu.document}
                                        error={itemError.document}
                                        onChange={(file) =>
                                            updateField(index, "document", Array.isArray(file) ? file[0] ?? null : file)
                                        }
                                    />
                                )}

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

                    <div className="flex justify-between mt-4">
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
    );
};

export default EducationalInfoPage;
