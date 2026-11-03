"use client";

import Button from "@/components/Button/Button";
import InputField from "@/components/InputField/InputField";
import { BSRealtyDropdown } from "@bsrealtyllc/design-system";
import { useParams, useRouter } from "next/navigation";
import React, { useState } from "react";

type EmploymentInfo = {
    jobTitle: string;
    department: string;
    startDate: string; // "YYYY-MM-DD"
    reportingManager: string;
    employmentType: string;
    workLocation: string;
};

type Errors = Partial<Record<keyof EmploymentInfo, string>>;

const INITIAL_STATE: EmploymentInfo = {
    jobTitle: "",
    department: "",
    startDate: "",
    reportingManager: "",
    employmentType: "",
    workLocation: "",
};

const DEPARTMENT_OPTIONS = [
    { label: "Admin", value: "admin" },
    { label: "Design", value: "design" },
    { label: "Engineering", value: "engineering" },
    { label: "Finance", value: "finance" },
    { label: "HR", value: "hr" },
    { label: "IT", value: "it" },
    { label: "Marketing & Sales", value: "marketing" },
];

const EMPLOYMENT_TYPE_OPTIONS = [
    { label: "Full-time", value: "full_time" },
    { label: "Part-time", value: "part_time" },
    { label: "Contract", value: "contract" },
    { label: "Internship", value: "internship" },
];

const labelClass = "text-[14px] font-medium text-(--gray-dark-active)";
const errorClass = "text-[12px] text-(--error-normal)";

// Dropdown may return a plain string or an { value } object
const getDropdownValue = (selected: string | { value: string } | null) =>
    typeof selected === "string" ? selected : selected?.value ?? "";

function validate(values: EmploymentInfo): Errors {
    const errors: Errors = {};

    if (!values.jobTitle.trim()) errors.jobTitle = "Enter your job title.";
    if (!values.department) errors.department = "Select your department.";
    if (!values.startDate) errors.startDate = "Select your start date.";
    if (!values.employmentType) errors.employmentType = "Select your employment type.";
    if (!values.workLocation.trim()) errors.workLocation = "Enter your work location.";
    // Reporting manager is optional

    return errors;
}

const EmploymentInfoPage = () => {
    const router = useRouter();
    const { value } = useParams<{ value: string }>();

    const [form, setForm] = useState<EmploymentInfo>(INITIAL_STATE);
    const [errors, setErrors] = useState<Errors>({});
    const [submitting, setSubmitting] = useState(false);

    function updateField<K extends keyof EmploymentInfo>(key: K, value: EmploymentInfo[K]) {
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
                jobTitle: form.jobTitle.trim(),
                reportingManager: form.reportingManager.trim() || null,
                workLocation: form.workLocation.trim(),
            };

            console.log("Employment info:", payload);

            router.push(`/onboard/${value}/emergency-contact`)
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
                    <h2 className="text-[16px] text-(--neutral-normal) font-semibold">Employment Information</h2>

                    <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
                        <div className="flex flex-col gap-5">
                            <div className="flex flex-col gap-2">
                                <label htmlFor="job-title" className={labelClass}>Job Title</label>
                                <InputField
                                    id="job-title"
                                    placeholder="e.g. Product Designer"
                                    value={form.jobTitle}
                                    onChange={(e) => updateField("jobTitle", e.target.value)}
                                />
                                {errors.jobTitle && <p className={errorClass}>{errors.jobTitle}</p>}
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="department" className={labelClass}>Department</label>
                                <BSRealtyDropdown
                                    className="w-full!"
                                    // id="department"
                                    options={DEPARTMENT_OPTIONS}
                                    placeholder="Select department"
                                    value={form.department}
                                    onChange={(selected: string | { value: string } | null) =>
                                        updateField("department", getDropdownValue(selected))
                                    }
                                />
                                {errors.department && <p className={errorClass}>{errors.department}</p>}
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="start-date" className={labelClass}>Start Date</label>
                                <InputField
                                    id="start-date"
                                    type="date"
                                    value={form.startDate}
                                    onChange={(e) => updateField("startDate", e.target.value)}
                                />
                                {errors.startDate && <p className={errorClass}>{errors.startDate}</p>}
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="reporting-manager" className={labelClass}>
                                    Reporting Manager
                                </label>
                                <InputField
                                    id="reporting-manager"
                                    placeholder="Enter your manager's name"
                                    value={form.reportingManager}
                                    onChange={(e) => updateField("reportingManager", e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="employment-type" className={labelClass}>Employment Type</label>
                                <BSRealtyDropdown
                                    className="w-full!"
                                    // id="employment-type"
                                    options={EMPLOYMENT_TYPE_OPTIONS}
                                    placeholder="Select employment type"
                                    value={form.employmentType}
                                    onChange={(selected: string | { value: string } | null) =>
                                        updateField("employmentType", getDropdownValue(selected))
                                    }
                                />
                                {errors.employmentType && <p className={errorClass}>{errors.employmentType}</p>}
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="work-location" className={labelClass}>Work Location</label>
                                <InputField
                                    id="work-location"
                                    placeholder="Office or remote"
                                    value={form.workLocation}
                                    onChange={(e) => updateField("workLocation", e.target.value)}
                                />
                                {errors.workLocation && <p className={errorClass}>{errors.workLocation}</p>}
                            </div>
                            <div className="flex items-center gap-2 text-[12px] font-medium text-(--blue-dark-normal)">
                                <span
                                    aria-hidden="true"
                                    className="size-4 shrink-0 bg-current"
                                    style={{
                                        maskImage: "url('/icons/info-circle.svg')",
                                        maskSize: "contain",
                                        maskRepeat: "no-repeat",
                                        maskPosition: "center",
                                    }}
                                />
                                <p>Employee ID will be automatically generated after the form is submitted.</p>
                            </div>
                        </div>

                        <div className="flex justify-between">
                            <Button
                                className="outline text-(--blue-sky-hover)!"
                                variant="text"
                                size="medium"
                                type="button"
                                onClick={() => router.push(`/onboard/${value}/personal-info`)}
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

export default EmploymentInfoPage;