"use client";

import Button from "@/components/Button/Button";
import FileUpload from "@/components/FileUpload/FileUpload";
import InputField from "@/components/InputField/InputField";
import { BSRealtyDropdown } from "@bsrealtyllc/design-system";
import React, { useState } from "react";
import { MAX_ENTRIES } from "../../onboardSubmission";
import { useOnboarding, useOnboardingStep, type ExperienceItem } from "../../OnboardingContext";
import FieldLabel from "../../FieldLabel";

// Values match the backend's PreviousExperienceEntry enums.
const EMPLOYMENT_TYPE_OPTIONS = [
    { label: "Full-time", value: "full-time" },
    { label: "Part-time", value: "part-time" },
];

const WORK_TYPE_OPTIONS = [
    { label: "Onsite", value: "physical" },
    { label: "Remote", value: "remote" },
    { label: "Hybrid", value: "hybrid" },
];

type Errors = Record<number, Partial<Record<keyof ExperienceItem, string>>>;

const errorClass = "text-[12px] text-(--error-normal)";

const getDropdownValue = (selected: string | { value: string } | null) =>
    typeof selected === "string" ? selected : selected?.value ?? "";

const newExperience = (): ExperienceItem => ({
    id: crypto.randomUUID(),
    company: "",
    role: "",
    startDate: "",
    endDate: "",
    currentWorking: false,
    employeeType: "",
    workType: "",
    description: "",
    document: null,
});

const ExperiencePage = () => {
    const { data, updateSection } = useOnboarding();
    const step = useOnboardingStep("experience", "experience");
    const experiences = data.experiences;

    const [errors, setErrors] = useState<Errors>({});
    const canAdd = experiences.length < MAX_ENTRIES;

    const show = {
        company: step.show("company"),
        role: step.show("role"),
        start: step.show("startDate"),
        end: step.show("endDate"),
        working: step.show("stillWorking"),
        employmentType: step.show("employmentType"),
        workLocation: step.show("workLocation"),
        description: step.show("description"),
        letter: step.show("experienceLetter"),
    };
    const req = {
        company: step.required("company"),
        role: step.required("role"),
        start: step.required("startDate"),
        end: step.required("endDate"),
        employmentType: step.required("employmentType"),
        workLocation: step.required("workLocation"),
        description: step.required("description"),
        letter: step.required("experienceLetter"),
    };

    if (!step.stepVisible) return null;

    function updateField<K extends keyof ExperienceItem>(index: number, key: K, value: ExperienceItem[K]) {
        const updated = [...experiences];
        updated[index] = { ...updated[index], [key]: value };
        updateSection("experiences", updated);

        if (errors[index]?.[key]) {
            setErrors((prev) => ({
                ...prev,
                [index]: { ...prev[index], [key]: undefined },
            }));
        }
    }

    function addExperience() {
        if (!canAdd) return;
        updateSection("experiences", [...experiences, newExperience()]);
    }

    function removeExperience(index: number) {
        if (experiences.length === 1) return;
        updateSection("experiences", experiences.filter((_, i) => i !== index));
        setErrors({});
    }

    function validate(): boolean {
        const newErrors: Errors = {};

        experiences.forEach((exp, index) => {
            const itemErrors: Partial<Record<keyof ExperienceItem, string>> = {};
            const working = show.working && exp.currentWorking;

            if (show.company && req.company && !exp.company.trim()) itemErrors.company = "Enter your company name.";
            if (show.role && req.role && !exp.role.trim()) itemErrors.role = "Enter your role.";
            if (show.start && req.start && !exp.startDate) itemErrors.startDate = "Select your start date.";
            if (show.end && req.end && !working && !exp.endDate) itemErrors.endDate = "Select your end date.";
            if (show.start && show.end && !working && exp.startDate && exp.endDate && exp.endDate < exp.startDate) {
                itemErrors.endDate = "End date can’t be before the start date.";
            }
            if (show.employmentType && req.employmentType && !exp.employeeType) itemErrors.employeeType = "Select your employment type.";
            if (show.workLocation && req.workLocation && !exp.workType) itemErrors.workType = "Select your work type.";
            if (show.description && req.description && !exp.description.trim()) itemErrors.description = "Enter a short description.";
            if (show.letter && req.letter && !working && !exp.document) itemErrors.document = "Upload your experience letter.";

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
                <div className="flex justify-between items-center w-full gap-4">
                    <h2 className="text-[18px] lg:text-[20px] text-(--neutral-normal) font-semibold">
                        Previous Work / Internship Experience
                    </h2>
                    <Button
                        type="button"
                        variant="primary"
                        size="small"
                        onClick={addExperience}
                        disabled={!canAdd}
                        title={canAdd ? undefined : `You can add up to ${MAX_ENTRIES} entries.`}
                    >
                        + Add Experience ({experiences.length}/{MAX_ENTRIES})
                    </Button>
                </div>

                <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
                    {experiences.map((exp, index) => {
                        const itemError = errors[index] || {};
                        const working = show.working && exp.currentWorking;

                        return (
                            <div
                                key={exp.id}
                                className="flex flex-col gap-5 p-6 bg-white border border-gray-200 rounded-xl shadow-xs relative"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {show.company && (
                                        <div className="flex flex-col gap-2">
                                            <FieldLabel htmlFor={`company-${index}`} required={req.company}>Company</FieldLabel>
                                            <InputField
                                                id={`company-${index}`}
                                                required={req.company}
                                                placeholder="e.g. Google"
                                                value={exp.company}
                                                onChange={(e) => updateField(index, "company", e.target.value)}
                                            />
                                            {itemError.company && <p className={errorClass}>{itemError.company}</p>}
                                        </div>
                                    )}

                                    {show.role && (
                                        <div className="flex flex-col gap-2">
                                            <FieldLabel htmlFor={`role-${index}`} required={req.role}>Role</FieldLabel>
                                            <InputField
                                                id={`role-${index}`}
                                                required={req.role}
                                                placeholder="e.g. Software Engineer"
                                                value={exp.role}
                                                onChange={(e) => updateField(index, "role", e.target.value)}
                                            />
                                            {itemError.role && <p className={errorClass}>{itemError.role}</p>}
                                        </div>
                                    )}

                                    {show.start && (
                                        <div className="flex flex-col gap-2">
                                            <FieldLabel htmlFor={`start-date-${index}`} required={req.start}>Start date</FieldLabel>
                                            <InputField
                                                id={`start-date-${index}`}
                                                type="date"
                                                required={req.start}
                                                value={exp.startDate}
                                                onChange={(e) => updateField(index, "startDate", e.target.value)}
                                            />
                                            {itemError.startDate && <p className={errorClass}>{itemError.startDate}</p>}
                                        </div>
                                    )}

                                    {(show.end || show.working) && (
                                        <div className="flex flex-col gap-2">
                                            {show.end && (
                                                <>
                                                    <FieldLabel htmlFor={`end-date-${index}`} required={req.end && !working}>End date</FieldLabel>
                                                    <InputField
                                                        id={`end-date-${index}`}
                                                        type="date"
                                                        required={req.end && !working}
                                                        disabled={working}
                                                        min={exp.startDate || undefined}
                                                        value={working ? "" : exp.endDate}
                                                        onChange={(e) => updateField(index, "endDate", e.target.value)}
                                                    />
                                                </>
                                            )}
                                            {show.working && (
                                                <div className={`flex gap-2 items-center ${show.end ? "mt-1" : ""}`}>
                                                    <input
                                                        type="checkbox"
                                                        id={`current-working-${index}`}
                                                        checked={exp.currentWorking}
                                                        onChange={(e) => updateField(index, "currentWorking", e.target.checked)}
                                                        className="cursor-pointer"
                                                    />
                                                    <label htmlFor={`current-working-${index}`} className="text-[13px] text-(--gray-dark-active) cursor-pointer">
                                                        Currently working here
                                                    </label>
                                                </div>
                                            )}
                                            {itemError.endDate && <p className={errorClass}>{itemError.endDate}</p>}
                                        </div>
                                    )}

                                    {show.employmentType && (
                                        <div className="flex flex-col gap-2">
                                            <FieldLabel htmlFor={`employment-type-${index}`} required={req.employmentType}>Employment Type</FieldLabel>
                                            <BSRealtyDropdown
                                                className="w-full!"
                                                options={EMPLOYMENT_TYPE_OPTIONS}
                                                placeholder="Select employment type"
                                                value={exp.employeeType}
                                                onChange={(selected: string | { value: string } | null) =>
                                                    updateField(index, "employeeType", getDropdownValue(selected))
                                                }
                                            />
                                            {itemError.employeeType && <p className={errorClass}>{itemError.employeeType}</p>}
                                        </div>
                                    )}

                                    {show.workLocation && (
                                        <div className="flex flex-col gap-2">
                                            <FieldLabel htmlFor={`work-type-${index}`} required={req.workLocation}>Work Type</FieldLabel>
                                            <BSRealtyDropdown
                                                className="w-full!"
                                                options={WORK_TYPE_OPTIONS}
                                                placeholder="Select work type"
                                                value={exp.workType}
                                                onChange={(selected: string | { value: string } | null) =>
                                                    updateField(index, "workType", getDropdownValue(selected))
                                                }
                                            />
                                            {itemError.workType && <p className={errorClass}>{itemError.workType}</p>}
                                        </div>
                                    )}
                                </div>

                                {show.description && (
                                    <div className="flex flex-col gap-2">
                                        <FieldLabel htmlFor={`description-${index}`} required={req.description}>Description</FieldLabel>
                                        <textarea
                                            id={`description-${index}`}
                                            required={req.description}
                                            className="border border-(--gray-normal) p-3 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-(--blue-sky-dark-hover) resize-y"
                                            rows={3}
                                            placeholder="Key responsibilities or achievements..."
                                            value={exp.description}
                                            onChange={(e) => updateField(index, "description", e.target.value)}
                                        />
                                        {itemError.description && <p className={errorClass}>{itemError.description}</p>}
                                    </div>
                                )}

                                {/* Hidden while still working there: no experience letter yet */}
                                {show.letter && !working && (
                                    <FileUpload
                                        label="Experience Letter"
                                        required={req.letter}
                                        optional={!req.letter}
                                        value={exp.document}
                                        error={itemError.document}
                                        onChange={(file) =>
                                            updateField(index, "document", Array.isArray(file) ? file[0] ?? null : file)
                                        }
                                    />
                                )}

                                {experiences.length > 1 && (
                                    <div className="flex justify-end pt-2">
                                        <button
                                            type="button"
                                            onClick={() => removeExperience(index)}
                                            className="text-[13px] text-(--error-normal) font-medium hover:underline cursor-pointer"
                                        >
                                            Remove experience
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

export default ExperiencePage;
