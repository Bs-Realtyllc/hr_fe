"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";
import Button from "@/components/Button/Button";
import PillTabs from "@/components/PillTabs";
import { showToast } from "@/lib/toast";

/** One entry in a forms_layout row's `data` column. */
type FormFieldConfig = {
  name: string;
  required: boolean;
};

type FieldType = "text" | "date" | "option" | "boolean" | "url" | "file";
type FormLayoutType = "intern" | "employee";

type SectionKey =
  | "personal"
  | "educational"
  | "experience"
  | "emergency"
  | "documents"
  | "other";

interface FieldDefinition {
  /** Matches the employee_onboarding_profile column (or JSON entry key) in camelCase. */
  name: string;
  label: string;
  type: FieldType;
}

interface SectionDefinition {
  key: SectionKey;
  label: string;
  description: string;
  fields: FieldDefinition[];
}

// Mirrors employee_onboarding_profile. id, name, email and role are omitted on
// purpose: they're always collected (NOT NULL in the DB), so they can't be toggled.
// System columns (confirmed, isActive, source, sourceApplicationId) aren't form fields.
const SECTIONS: SectionDefinition[] = [
  {
    key: "personal",
    label: "Personal Information",
    description: "Basic details about the new joiner.",
    fields: [
      { name: "dob", label: "Date of Birth", type: "date" },
      { name: "gender", label: "Gender", type: "option" },
      { name: "nationality", label: "Nationality", type: "text" },
      { name: "phone", label: "Contact Number", type: "text" },
      { name: "currentAddress", label: "Current Address", type: "text" },
      { name: "permanentAddress", label: "Permanent Address", type: "text" },
      { name: "linkedinUrl", label: "LinkedIn Profile", type: "url" },
      { name: "githubUrl", label: "GitHub Profile", type: "url" },
      { name: "portfolioUrl", label: "Portfolio / Website", type: "url" },
    ],
  },
  {
    key: "educational",
    label: "Educational Information",
    description: "Applies to each education entry the joiner adds.",
    fields: [
      { name: "educationLevel", label: "Education Level", type: "option" },
      {
        name: "institutionName",
        label: "Institution / College Name",
        type: "text",
      },
      { name: "fieldOfStudy", label: "Field of Study", type: "text" },
      { name: "stillEnrolled", label: "Still Enrolled", type: "boolean" },
      { name: "graduationDate", label: "Graduation Date", type: "date" },
      { name: "certificate", label: "Certificate", type: "file" },
    ],
  },
  {
    key: "experience",
    label: "Previous Experience",
    description: "Applies to each previous job or internship entry.",
    fields: [
      { name: "company", label: "Company", type: "text" },
      { name: "role", label: "Role", type: "text" },
      { name: "startDate", label: "Start Date", type: "date" },
      { name: "endDate", label: "End Date", type: "date" },
      { name: "stillWorking", label: "Still Working", type: "boolean" },
      { name: "employmentType", label: "Employment Type", type: "option" },
      { name: "workLocation", label: "Work Location", type: "option" },
      { name: "description", label: "Description", type: "text" },
      { name: "experienceLetter", label: "Experience Letter", type: "file" },
    ],
  },
  {
    key: "emergency",
    label: "Emergency Contact",
    description: "Who to reach in case of an emergency.",
    fields: [
      { name: "emergencyContactName", label: "Contact Name", type: "text" },
      { name: "emergencyContactRelation", label: "Relation", type: "text" },
      { name: "emergencyContactPhone", label: "Phone", type: "text" },
      { name: "emergencyContactEmail", label: "Email", type: "text" },
      { name: "emergencyContactAddress", label: "Address", type: "text" },
    ],
  },
  {
    key: "documents",
    label: "Upload Documents",
    description: "Identity documents and photo.",
    fields: [
      { name: "photoPath", label: "Passport Photo", type: "file" },
      { name: "idFrontPath", label: "ID (Front)", type: "file" },
      { name: "idBackPath", label: "ID (Back)", type: "file" },
      { name: "panFrontPath", label: "PAN (Front)", type: "file" },
      { name: "panBackPath", label: "PAN (Back)", type: "file" },
      {
        name: "additionalDocumentPath",
        label: "Additional Document",
        type: "file",
      },
    ],
  },
  {
    key: "other",
    label: "Other Documents",
    description: "Signed contract and anything else.",
    fields: [
      { name: "contractPath", label: "Signed Contract", type: "file" },
      { name: "otherDocumentPath", label: "Other Document", type: "file" },
    ],
  },
];

const ALWAYS_INCLUDED = ["Full Name", "Email Address"];

const LAYOUT_TYPE_OPTIONS = [
  { value: "intern", label: "Intern" },
  { value: "employee", label: "Employee" },
];

/** forms_layout.name for a section, e.g. "intern_onboard_personal". */
const layoutName = (type: FormLayoutType, section: SectionKey) =>
  `${type}_onboard_${section}`;

type FieldState = { selected: boolean; required: boolean };
/** section key -> field name -> state */
type LayoutState = Record<SectionKey, Record<string, FieldState>>;

const emptyLayout = (): LayoutState =>
  Object.fromEntries(
    SECTIONS.map((s) => [
      s.key,
      Object.fromEntries(
        s.fields.map((f) => [f.name, { selected: false, required: false }]),
      ),
    ]),
  ) as LayoutState;

/**
 * Accepts the saved layout as either `{ intern_onboard_personal: [...] }` or an
 * array of forms_layout rows (`[{ name, data }]`), possibly wrapped in `{ data }`.
 */
const parseSavedLayout = (raw: unknown, type: FormLayoutType): LayoutState => {
  const layout = emptyLayout();
  let payload: unknown = raw;
  if (payload && typeof payload === "object" && "data" in payload) {
    payload = (payload as { data: unknown }).data;
  }

  const byName: Record<string, unknown> = {};
  if (Array.isArray(payload)) {
    payload.forEach((row) => {
      if (row && typeof row === "object" && "name" in row) {
        byName[(row as { name: string }).name] = (
          row as { data: unknown }
        ).data;
      }
    });
  } else if (payload && typeof payload === "object") {
    Object.assign(byName, payload);
  }

  SECTIONS.forEach((section) => {
    let entries = byName[layoutName(type, section.key)];
    if (typeof entries === "string") {
      try {
        entries = JSON.parse(entries);
      } catch {
        entries = null;
      }
    }
    if (!Array.isArray(entries)) return;
    entries.forEach((entry: Partial<FormFieldConfig>) => {
      if (entry?.name && layout[section.key][entry.name]) {
        layout[section.key][entry.name] = {
          selected: true,
          required: !!entry.required,
        };
      }
    });
  });

  return layout;
};

interface ContractTemplateInfo {
  filename: string;
  originalName: string;
}

const Page = () => {
  const [layoutType, setLayoutType] = useState<FormLayoutType>("intern");
  const [layout, setLayout] = useState<LayoutState>(emptyLayout);
  const [layoutLoading, setLayoutLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [currentTemplate, setCurrentTemplate] =
    useState<ContractTemplateInfo | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateBusy, setTemplateBusy] = useState(false);
  const templateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLayoutLoading(true);
    setCurrentTemplate(null);

    (async () => {
      try {
        const res = await api.get<{
          data?: unknown;
          contractTemplate?: ContractTemplateInfo;
        }>(`/form-layout?type=${layoutType}`);
        if (cancelled) return;
        setCurrentTemplate(res?.contractTemplate ?? null);
        setLayout(parseSavedLayout(res, layoutType));
      } catch {
        // Not configured yet, or the fetch failed — start from nothing selected
        // so a failed load can't silently overwrite a good layout on save.
        if (!cancelled) setLayout(emptyLayout());
      } finally {
        if (!cancelled) setLayoutLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [layoutType]);

  const updateField = (
    section: SectionKey,
    name: string,
    patch: Partial<FieldState>,
  ) => {
    setLayout((prev) => {
      const next = { ...prev[section][name], ...patch };
      // A field that isn't shown can't be required.
      if (!next.selected) next.required = false;
      return { ...prev, [section]: { ...prev[section], [name]: next } };
    });
  };

  const setSectionSelected = (section: SectionKey, selected: boolean) => {
    setLayout((prev) => ({
      ...prev,
      [section]: Object.fromEntries(
        Object.entries(prev[section]).map(([name, state]) => [
          name,
          { selected, required: selected ? state.required : false },
        ]),
      ),
    }));
  };

  const buildPayload = (): Record<string, FormFieldConfig[]> =>
    Object.fromEntries(
      SECTIONS.map((section) => [
        layoutName(layoutType, section.key),
        section.fields
          .filter((f) => layout[section.key][f.name].selected)
          .map((f) => ({
            name: f.name,
            required: layout[section.key][f.name].required,
          })),
      ]),
    );

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post("/form-layout", buildPayload());
      showToast("success", "Form layout submitted successfully.");
    } catch (err) {
      console.error("Failed to save form layout", err);
      showToast("error", "Failed to submit form layout. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadTemplate = async () => {
    if (!templateFile) return;
    setTemplateBusy(true);
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
      showToast("success", "Contract template saved.");
    } catch {
      showToast("error", "Could not upload the contract template.");
    } finally {
      setTemplateBusy(false);
    }
  };

  const handleRemoveTemplate = async () => {
    setTemplateBusy(true);
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
      showToast("success", "Reverted to the default template.");
    } catch {
      showToast("error", "Could not remove the contract template.");
    } finally {
      setTemplateBusy(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>Form Layout</h1>
            <p>
              Choose which fields appear on the onboarding form, and mark each
              as required or optional.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <PillTabs
          options={LAYOUT_TYPE_OPTIONS}
          value={layoutType}
          onChange={(v) => setLayoutType(v as FormLayoutType)}
        />
        <Button
          variant="primary"
          size="small"
          onClick={handleSave}
          disabled={layoutLoading || saving}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
      {/* 
      <div className="card mb-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-(--color-text-muted)">
          <span>Always included and required:</span>
          {ALWAYS_INCLUDED.map((label) => (
            <span key={label} className="badge badge-accent">
              {label}
            </span>
          ))}
        </div>
      </div> */}

      {layoutLoading ? (
        <div className="card text-sm text-(--color-text-muted)">
          Loading layout…
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {SECTIONS.map((section) => {
            const states = layout[section.key];
            const shownCount = section.fields.filter(
              (f) => states[f.name].selected,
            ).length;
            const allShown = shownCount === section.fields.length;

            return (
              <section key={section.key} className="card">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-(--color-text-h3)">
                      {section.label}
                    </h2>
                    <p className="mt-0.5 text-xs text-(--color-text-muted)">
                      {section.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSectionSelected(section.key, !allShown)}
                    className="shrink-0 text-xs font-medium text-(--color-primary) hover:underline"
                  >
                    {allShown ? "Clear all" : "Select all"}
                  </button>
                </div>

                <div className="mb-2 flex items-center justify-between border-b border-(--color-border) px-2 pb-2 text-xs font-medium uppercase tracking-wide text-(--color-text-muted)">
                  <span>
                    Field · {shownCount}/{section.fields.length} shown
                  </span>
                  <span>Required</span>
                </div>

                <ul className="space-y-0.5">
                  {/* For personal only -- always included and required field : Name and email */}
                  {section.key === "personal"
                    ? ALWAYS_INCLUDED.map((ai) => (
                        <li
                          key={ai}
                          className="flex items-center justify-between gap-4 rounded-md px-2 py-2 hover:bg-(--color-bg)"
                        >
                          <label className="flex flex-1 cursor-pointer items-center gap-3">
                            <input
                              type="checkbox"
                              checked={true}
                              className="h-4 w-4 cursor-pointer accent-(--color-primary)"
                            />
                            <span className="text-sm text-(--color-text-body)">
                              {ai}
                            </span>
                            <span className="badge badge-neutral">text</span>
                          </label>

                          <input
                            type="checkbox"
                            aria-label={`Name required`}
                            checked={true}
                            className="h-4 w-4 cursor-pointer accent-(--color-primary) disabled:cursor-not-allowed disabled:opacity-40"
                          />
                        </li>
                      ))
                    : null}

                  {section.fields.map((field) => {
                    const state = states[field.name];
                    return (
                      <li
                        key={field.name}
                        className="flex items-center justify-between gap-4 rounded-md px-2 py-2 hover:bg-(--color-bg)"
                      >
                        <label className="flex flex-1 cursor-pointer items-center gap-3">
                          <input
                            type="checkbox"
                            checked={state.selected}
                            onChange={(e) =>
                              updateField(section.key, field.name, {
                                selected: e.target.checked,
                              })
                            }
                            className="h-4 w-4 cursor-pointer accent-(--color-primary)"
                          />
                          <span
                            className={`text-sm ${
                              state.selected
                                ? "text-(--color-text-body)"
                                : "text-(--color-text-muted)"
                            }`}
                          >
                            {field.label}
                          </span>
                          <span className="badge badge-neutral">
                            {field.type}
                          </span>
                        </label>

                        <input
                          type="checkbox"
                          aria-label={`${field.label} required`}
                          checked={state.required}
                          disabled={!state.selected}
                          onChange={(e) =>
                            updateField(section.key, field.name, {
                              required: e.target.checked,
                            })
                          }
                          className="h-4 w-4 cursor-pointer accent-(--color-primary) disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <section className="card mt-4">
        <h2 className="text-sm font-semibold text-(--color-text-h3)">
          Default Contract Template
        </h2>
        <p className="mt-0.5 text-xs text-(--color-text-muted)">
          Replaces the built-in default as the &quot;Download template&quot;
          option on the {layoutType} onboarding form.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={templateInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setTemplateFile(e.target.files?.[0] ?? null)}
            className="text-sm text-(--color-text-body) file:mr-3 file:rounded-md file:border-0 file:bg-(--color-primary-light) file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-(--color-primary)"
          />
          <Button
            variant="secondary"
            size="small"
            onClick={handleUploadTemplate}
            disabled={!templateFile || templateBusy}
          >
            {templateBusy ? "Saving…" : "Upload"}
          </Button>
          {currentTemplate && (
            <Button
              variant="text"
              size="small"
              onClick={handleRemoveTemplate}
              disabled={templateBusy}
            >
              Revert to default
            </Button>
          )}
        </div>

        <p className="mt-3 text-sm text-(--color-text-muted)">
          {currentTemplate ? (
            <>
              Current file:{" "}
              <span className="font-medium text-(--color-text-body)">
                {currentTemplate.originalName}
              </span>
            </>
          ) : (
            "No custom template set — the built-in default is used."
          )}
        </p>
      </section>
    </div>
  );
};

export default Page;
