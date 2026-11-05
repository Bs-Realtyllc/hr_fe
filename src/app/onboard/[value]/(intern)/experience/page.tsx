"use client";

import Button from "@/components/Button/Button";
import FileUpload from "@/components/FileUpload/FileUpload";
import InputField from "@/components/InputField/InputField";
import { BSRealtyDropdown } from "@bsrealtyllc/design-system";
import { useParams, useRouter } from "next/navigation";
import React, { useState } from "react";
import { useOnboarding, type ExperienceItem } from "../../OnboardingContext";

const EMPLOYMENT_TYPE_OPTIONS = [
    { label: "Full-time", value: "full_time" },
    { label: "Part-time", value: "part_time" },
];

const WORK_TYPE_OPTIONS = [
    { label: "Onsite", value: "onsite" },
    { label: "Remote", value: "remote" },
    { label: "Hybrid", value: "hybrid" },
];

type Errors = Record<number, Partial<Record<keyof ExperienceItem, string>>>;

const labelClass = "text-[14px] font-medium text-(--gray-dark-active)";
const errorClass = "text-[12px] text-(--error-normal)";

const ExperiencePage = () => {
    const router = useRouter();
    const { value } = useParams<{ value: string }>();
    const { data, updateSection } = useOnboarding();
    const experiences = data.experiences;

    const [errors, setErrors] = useState<Errors>({});
    const [submitting, setSubmitting] = useState(false);

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
        updateSection("experiences", [
            ...experiences,
            {
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
            },
        ]);
    }

    function removeExperience(index: number) {
        if (experiences.length === 1) return;
        updateSection("experiences", experiences.filter((_, i) => i !== index));
        setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[index];
            return newErrors;
        });
    }

    function getDropdownValue(selected: string | { value: string } | null): string {
        if (!selected) return "";
        if (typeof selected === "string") return selected;
        return selected.value;
    }

    function validate(): boolean {
        const newErrors: Errors = {};
        let isValid = true;

        experiences.forEach((exp, index) => {
            const itemErrors: Partial<Record<keyof ExperienceItem, string>> = {};
            if (!exp.company.trim()) itemErrors.company = "Enter your institution / company name.";
            if (!exp.role.trim()) itemErrors.role = "Enter your role.";
            if (!exp.startDate) itemErrors.startDate = "Select your start date.";

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
            const payload = experiences.map((exp) => ({
                ...exp,
                company: exp.company.trim(),
                role: exp.role.trim(),
                description: exp.description.trim(),
                endDate: exp.currentWorking ? "" : exp.endDate,
            }));

            console.log("Experiences payload:", payload);

            router.push(`/onboard/${value}/emergency-contact`);
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
                <div className="flex justify-between items-center w-full">
                    <h2 className="text-[18px] lg:text-[20px] text-(--neutral-normal) font-semibold">
                        Previous Work / Internship Experience
                    </h2>
                    <Button
                        type="button"
                        variant="primary"
                        size="small"
                        onClick={addExperience}
                    >
                        + Add Experience
                    </Button>
                </div>

                <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
                    {experiences.map((exp, index) => {
                        const itemError = errors[index] || {};

                        return (
                            <div
                                key={exp.id}
                                className="flex flex-col gap-5 p-6 bg-white border border-gray-200 rounded-xl shadow-xs relative"
                            >
                                {/* Row 1: Company & Role */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="flex flex-col gap-2">
                                        <label htmlFor={`company-${index}`} className={labelClass}>
                                            Company
                                        </label>
                                        <InputField
                                            id={`company-${index}`}
                                            placeholder="e.g. Google"
                                            value={exp.company}
                                            onChange={(e) => updateField(index, "company", e.target.value)}
                                        />
                                        {itemError.company && <p className={errorClass}>{itemError.company}</p>}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label htmlFor={`role-${index}`} className={labelClass}>
                                            Role
                                        </label>
                                        <InputField
                                            id={`role-${index}`}
                                            placeholder="e.g. Software Engineer"
                                            value={exp.role}
                                            onChange={(e) => updateField(index, "role", e.target.value)}
                                        />
                                        {itemError.role && <p className={errorClass}>{itemError.role}</p>}
                                    </div>
                                </div>

                                {/* Row 2: Start Date & End Date */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="flex flex-col gap-2">
                                        <label htmlFor={`start-date-${index}`} className={labelClass}>
                                            Start date
                                        </label>
                                        <InputField
                                            id={`start-date-${index}`}
                                            type="date"
                                            value={exp.startDate}
                                            onChange={(e) => updateField(index, "startDate", e.target.value)}
                                        />
                                        {itemError.startDate && <p className={errorClass}>{itemError.startDate}</p>}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label htmlFor={`end-date-${index}`} className={labelClass}>
                                            End date
                                        </label>
                                        <InputField
                                            id={`end-date-${index}`}
                                            type="date"
                                            disabled={exp.currentWorking}
                                            value={exp.currentWorking ? "" : exp.endDate}
                                            onChange={(e) => updateField(index, "endDate", e.target.value)}
                                        />
                                        <div className="flex gap-2 items-center mt-1">
                                            <input
                                                type="checkbox"
                                                id={`current-working-${index}`}
                                                checked={exp.currentWorking}
                                                onChange={(e) => updateField(index, "currentWorking", e.target.checked)}
                                                className="cursor-pointer"
                                            />
                                            <label htmlFor={`current-working-${index}`} className="text-[13px] text-(--gray-dark-active) cursor-pointer">
                                                Current working
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Row 3: Employment Type & Work Type */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                                    <div className="flex flex-col gap-2">
                                        <label htmlFor={`employment-type-${index}`} className={labelClass}>Employment Type</label>
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

                                    <div className="flex flex-col gap-2">
                                        <label htmlFor={`work-type-${index}`} className={labelClass}>Work Type</label>
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
                                </div>

                                {/* Row 4: Description */}
                                <div className="flex flex-col gap-2">
                                    <label htmlFor={`description-${index}`} className={labelClass}>
                                        Description <span className="text-(--gray-normal) font-normal">(optional)</span>
                                    </label>
                                    <textarea
                                        id={`description-${index}`}
                                        className="border border-(--gray-normal) p-3 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-(--blue-sky-dark-hover) resize-y"
                                        rows={3}
                                        placeholder="Key responsibilities or achievements..."
                                        value={exp.description}
                                        onChange={(e) => updateField(index, "description", e.target.value)}
                                    />
                                </div>

                                {/* Row 5: Upload Documents (Hidden if Current Working) */}
                                {!exp.currentWorking && (
                                    <div>
                                        <FileUpload
                                            label="Experience Letter"
                                            optional={true}
                                            value={exp.document}
                                            onChange={(file) =>
                                                updateField(index, "document", Array.isArray(file) ? file[0] ?? null : file)
                                            }
                                        />
                                    </div>
                                )}

                                {/* Remove Experience link */}
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

                    {/* Navigation Buttons */}
                    <div className="flex justify-between mt-4">
                        <Button
                            className="outline text-(--blue-sky-hover)!"
                            variant="text"
                            size="small"
                            type="button"
                            onClick={() => router.push(`/onboard/${value}/educational-information`)}
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

export default ExperiencePage;