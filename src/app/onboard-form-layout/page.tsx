"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";

type FieldType = "text" | "date" | "option" | "file";
type FieldSection = "personal" | "education" | "professional" | "additional";
type FormLayoutType = "intern" | "employee";

interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  section: FieldSection;
}

// Mirrors InternFormData — predefined so the admin never has to type a name or pick a type.
const FIELD_DEFINITIONS: FieldDefinition[] = [
  { key: "name", label: "Full Name", type: "text", section: "personal" },
  { key: "dob", label: "Date of Birth", type: "date", section: "personal" },
  { key: "gender", label: "Gender", type: "option", section: "personal" },
  { key: "phone", label: "Contact Number", type: "text", section: "personal" },
  { key: "email", label: "Email Address", type: "text", section: "personal" },
  {
    key: "current_address",
    label: "Current Address",
    type: "text",
    section: "personal",
  },
  {
    key: "permanent_address",
    label: "Permanent Address",
    type: "text",
    section: "personal",
  },
  {
    key: "emergency_contact",
    label: "Emergency Contact Number",
    type: "text",
    section: "personal",
  },

  {
    key: "education_level",
    label: "Education Level",
    type: "option",
    section: "education",
  },
  {
    key: "institution_name",
    label: "Institution / College Name",
    type: "text",
    section: "education",
  },
  {
    key: "field_of_study",
    label: "Field of Study",
    type: "text",
    section: "education",
  },
  {
    key: "graduation_date",
    label: "Graduation Date",
    type: "date",
    section: "education",
  },

  {
    key: "previous_experience",
    label: "Previous Work / Internship Experience",
    type: "text",
    section: "professional",
  },
  {
    key: "tech_stack",
    label: "Tech Stack",
    type: "text",
    section: "professional",
  },
  {
    key: "areas_of_interest",
    label: "Areas of Interest",
    type: "text",
    section: "professional",
  },
  {
    key: "linkedin_url",
    label: "LinkedIn Profile",
    type: "text",
    section: "professional",
  },
  {
    key: "github_url",
    label: "GitHub Profile",
    type: "text",
    section: "professional",
  },
  {
    key: "portfolio_url",
    label: "Portfolio / Website",
    type: "text",
    section: "professional",
  },

  {
    key: "additional_info",
    label: "Additional Info",
    type: "text",
    section: "additional",
  },
];

const SECTION_LABELS: Record<FieldSection, string> = {
  personal: "Personal Information",
  education: "Educational Information",
  professional: "Professional Information",
  additional: "Additional Information",
};

const SECTION_ORDER: FieldSection[] = [
  "personal",
  "education",
  "professional",
  "additional",
];

// key -> whether it's selected
type SelectedMap = Record<string, boolean>;
// key -> whether it's required (only meaningful if selected)
type RequiredMap = Record<string, boolean>;

const initialSelected = (): SelectedMap =>
  Object.fromEntries(FIELD_DEFINITIONS.map((f) => [f.key, true]));

const initialRequired = (): RequiredMap =>
  Object.fromEntries(FIELD_DEFINITIONS.map((f) => [f.key, true]));

interface ContractTemplateInfo {
  filename: string;
  originalName: string;
}

const Page = () => {
  const [layoutType, setLayoutType] = useState<FormLayoutType>("intern");
  const [selected, setSelected] = useState<SelectedMap>(initialSelected());
  const [required, setRequired] = useState<RequiredMap>(initialRequired());

  const [currentTemplate, setCurrentTemplate] =
    useState<ContractTemplateInfo | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [templateMsg, setTemplateMsg] = useState("");
  const templateInputRef = useRef<HTMLInputElement>(null);

  // Reflect whichever layout type is selected — the template is stored per type.
  useEffect(() => {
    let cancelled = false;
    setCurrentTemplate(null);
    setTemplateMsg("");

    (async () => {
      try {
        const res = await api.get<{ data: Record<string, unknown> | null }>(
          `/form-layout?type=${layoutType}`,
        );
        if (!cancelled) {
          setCurrentTemplate(
            (res.data?.contractTemplate as ContractTemplateInfo) ?? null,
          );
        }
      } catch {
        // Layout not configured yet, or fetch failed — no template to show.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [layoutType]);

  const handleUploadTemplate = async () => {
    if (!templateFile) return;
    setTemplateBusy(true);
    setTemplateMsg("");

    try {
      const body = new FormData();
      body.append("file", templateFile, templateFile.name);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/form-layout/template?type=${layoutType}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}` },
          body,
        },
      );
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);

      setCurrentTemplate({ filename: "", originalName: templateFile.name });
      setTemplateFile(null);
      if (templateInputRef.current) templateInputRef.current.value = "";
      setTemplateMsg("Template saved.");
    } catch (err) {
      setTemplateMsg(
        err instanceof Error ? err.message : "Could not upload template.",
      );
    } finally {
      setTemplateBusy(false);
    }
  };

  const handleRemoveTemplate = async () => {
    setTemplateBusy(true);
    setTemplateMsg("");

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/form-layout/template?type=${layoutType}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${getToken()}` },
        },
      );
      if (!res.ok) throw new Error(`Remove failed (${res.status})`);

      setCurrentTemplate(null);
      setTemplateMsg("Reverted to the default template.");
    } catch (err) {
      setTemplateMsg(
        err instanceof Error ? err.message : "Could not remove template.",
      );
    } finally {
      setTemplateBusy(false);
    }
  };

  const toggleSelected = (key: string) => {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleRequired = (key: string) => {
    setRequired((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSetForm = async () => {
    const flatFields = FIELD_DEFINITIONS.filter((f) => selected[f.key]).map(
      (f) => ({
        key: f.key,
        label: f.label,
        type: f.type,
        section: f.section,
        required: required[f.key],
      }),
    );

    // Grouped by section — mirrors InternForm's Personal/Education/Professional/Additional layout
    const grouped = SECTION_ORDER.reduce(
      (acc, section) => {
        acc[section] = flatFields.filter((f) => f.section === section);
        return acc;
      },
      {} as Record<FieldSection, typeof flatFields>,
    );

    console.log(JSON.stringify(grouped, null, 2));
    const response = await api.post<any>("/form-layout", {
      name: layoutType,
      data: JSON.stringify(grouped),
    });
  };

  return (
    <div className="">
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>Form Layout</h1>
            <p>
              Choose which fields appear on the intern onboarding form, and mark
              each as required or optional.
            </p>
          </div>
        </div>
      </div>
      <select
        value={layoutType}
        onChange={(e) => setLayoutType(e.target.value as FormLayoutType)}
        className="mt-1 w-1/3 md:w-1/4 rounded-md border border-slate-300 bg-white px-1 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 mb-4"
      >
        <option value="intern">Intern</option>
        <option value="employee">Employee</option>
      </select>

      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Default Contract Template
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Uploaded here, this file replaces the built-in default as the
          &quot;Download template&quot; option on the {layoutType} onboarding
          form.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={templateInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setTemplateFile(e.target.files?.[0] ?? null)}
            className="text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
          />
          <button
            type="button"
            onClick={handleUploadTemplate}
            disabled={!templateFile || templateBusy}
            className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {templateBusy ? "Saving…" : "Upload"}
          </button>
          {currentTemplate && (
            <button
              type="button"
              onClick={handleRemoveTemplate}
              disabled={templateBusy}
              className="text-sm font-medium text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Revert to default
            </button>
          )}
        </div>

        {currentTemplate ? (
          <p className="mt-3 text-sm text-slate-500">
            Current file:{" "}
            <span className="font-medium text-slate-700">
              {currentTemplate.originalName}
            </span>
          </p>
        ) : (
          <p className="mt-3 text-sm text-slate-400">
            No custom template set — the built-in default is used.
          </p>
        )}

        {templateMsg && (
          <p className="mt-2 text-sm text-amber-700">{templateMsg}</p>
        )}
      </section>

      <div className="space-y-8">
        {SECTION_ORDER.map((section) => (
          <div key={section}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              {SECTION_LABELS[section]}
            </h2>
            <div className="space-y-1 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
              {FIELD_DEFINITIONS.filter((f) => f.section === section).map(
                (field) => (
                  <div
                    key={field.key}
                    className="flex items-center justify-between gap-4 rounded-md px-3 py-2.5 hover:bg-slate-50"
                  >
                    <label className="flex flex-1 items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selected[field.key]}
                        onChange={() => toggleSelected(field.key)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      <span className="text-sm text-slate-800">
                        {field.label}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                        {field.type}
                      </span>
                    </label>

                    <label
                      className={`flex items-center gap-1.5 text-xs ${
                        selected[field.key]
                          ? "text-slate-600"
                          : "text-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={required[field.key]}
                        onChange={() => toggleRequired(field.key)}
                        disabled={!selected[field.key]}
                        className="h-3.5 w-3.5 rounded border-slate-300 disabled:cursor-not-allowed"
                      />
                      Required
                    </label>
                  </div>
                ),
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSetForm}
          className="rounded-md bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
        >
          Set form
        </button>
      </div>
    </div>
  );
};

export default Page;
