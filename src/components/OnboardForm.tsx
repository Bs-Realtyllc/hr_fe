"use client";

import { api } from "@/lib/api";
import {
  useState,
  useRef,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
} from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

interface InternFormData {
  name: string;
  dob: string;
  gender: string;
  email: string;
  current_address: string;
  education_level: string;
  institution_name: string;
  field_of_study: string;
  graduation_date: string;
  previous_experience: string;
  areas_of_interest: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  role: "intern" | "employee";
  additional_info: string;
  [key: string]: string; // allows unknown/extra keys returned by the API
}
interface InternFormProps {
  type: "intern" | "employee";
}

type FormKey = keyof InternFormData;

const initialState: InternFormData = {
  name: "",
  dob: "",
  gender: "",
  email: "",
  current_address: "",
  education_level: "",
  institution_name: "",
  field_of_study: "",
  graduation_date: "",
  previous_experience: "",
  areas_of_interest: "",
  linkedin_url: "",
  github_url: "",
  portfolio_url: "",
  role: "intern",
  additional_info: "",
};

// ---------- API response shape ----------
interface ApiField {
  key: string;
  type: string; // "text" | "date" | "option" | ...
  label: string;
  section: string;
  required: boolean;
}

type LayoutResponse = Record<string, ApiField[]>;

// ---------- Widget-level rendering hints ----------
// The API tells us the label/required/section for a field, but not which
// HTML control to use or what a "select" field's options are — that part
// stays defined on the frontend.
type RenderHint =
  | {
      kind: "input";
      inputType: "text" | "email" | "url" | "date";
      placeholder?: string;
    }
  | { kind: "textarea"; rows: number; placeholder?: string }
  | { kind: "select"; options: { value: string; label: string }[] };

const RENDER_HINTS: Record<string, RenderHint> = {
  name: { kind: "input", inputType: "text" },
  dob: { kind: "input", inputType: "date" },
  gender: {
    kind: "select",
    options: [
      { value: "female", label: "Female" },
      { value: "male", label: "Male" },
      { value: "other", label: "Other" },
      { value: "prefer_not_to_say", label: "Prefer not to say" },
    ],
  },
  email: { kind: "input", inputType: "email" },
  current_address: { kind: "textarea", rows: 2 },
  education_level: {
    kind: "select",
    options: [
      "High School",
      "Diploma",
      "Bachelor's",
      "Master's",
      "PhD",
      "Other",
    ].map((v) => ({
      value: v,
      label: v,
    })),
  },
  institution_name: { kind: "input", inputType: "text" },
  field_of_study: { kind: "input", inputType: "text" },
  graduation_date: { kind: "input", inputType: "date" },
  previous_experience: {
    kind: "textarea",
    rows: 3,
    placeholder: "Roles, companies, dates — or leave blank if none",
  },
  areas_of_interest: {
    kind: "textarea",
    rows: 2,
    placeholder: "What kind of work excites you?",
  },
  linkedin_url: {
    kind: "input",
    inputType: "url",
    placeholder: "https://linkedin.com/in/...",
  },
  github_url: {
    kind: "input",
    inputType: "url",
    placeholder: "https://github.com/...",
  },
  portfolio_url: {
    kind: "input",
    inputType: "url",
    placeholder: "https://...",
  },
  additional_info: {
    kind: "textarea",
    rows: 3,
    placeholder:
      "Accessibility needs, availability constraints, anything relevant",
  },
};

const DEFAULT_HINT: RenderHint = { kind: "input", inputType: "text" };

// ---------- Section layout (order + row groupings) ----------
// A "row" is an array of keys. Length 1 = full-width field, 2 or 3 = grid.
// This preserves the original visual grouping (e.g. dob+gender side by side)
// while still hiding a row entirely if none of its keys come back from the API.
interface SectionConfig {
  key: string;
  title: string;
  rows: string[][];
}

const SECTIONS_CONFIG: SectionConfig[] = [
  {
    key: "personal",
    title: "Personal Information",
    rows: [["name"], ["dob", "gender"], ["email"], ["current_address"]],
  },
  {
    key: "education",
    title: "Educational Information",
    rows: [
      ["education_level"],
      ["institution_name"],
      ["field_of_study", "graduation_date"],
    ],
  },
  {
    key: "professional",
    title: "Professional Information",
    rows: [
      ["previous_experience"],
      ["areas_of_interest"],
      ["linkedin_url", "github_url", "portfolio_url"],
    ],
  },
  {
    key: "additional",
    title: "Additional Information",
    rows: [["additional_info"]],
  },
];

const GRID_CLASS: Record<number, string> = {
  2: "grid grid-cols-2 gap-4",
  3: "grid grid-cols-3 gap-4",
};

export default function InternForm(type: InternFormProps) {
  const [form, setForm] = useState<InternFormData>(initialState);
  const [contract, setContract] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const [layout, setLayout] = useState<LayoutResponse | null>(null);
  const [layoutLoading, setLayoutLoading] = useState(true);
  const [layoutError, setLayoutError] = useState("");

  // console.log(type.type)
  useEffect(() => {
    const getForm = async () => {
      try {
        const { data } = await api.get<LayoutResponse>(
          `/form-layout?type=${type.type}`,
        );
        setLayout(data as unknown as LayoutResponse);
      } catch (err) {
        console.log("ERROR fetching form layout", err);
        setLayoutError(
          "Could not load form configuration. Showing the full form instead.",
        );
      } finally {
        setLayoutLoading(false);
      }
    };
    getForm();
  }, []);

  const update =
    (key: FormKey) =>
    (
      e: ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      const value =
        e.target instanceof HTMLInputElement && e.target.type === "checkbox"
          ? e.target.checked
          : e.target.value;

      setForm((prev) => ({ ...prev, [key]: value as string }));
    };

  const handleFile = (file: File | null | undefined) => {
    if (!file) return;
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowed.includes(file.type)) {
      setErrorMsg("Contract must be a PDF or Word document.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("File must be under 10MB.");
      return;
    }
    setErrorMsg("");
    setContract(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  // const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
  //   e.preventDefault();
  //   form.role = type.type;
  //   setLoading(true);

  //   // Only send fields that were actually rendered on the form except role field,
  //   // i.e. keys the API returned in the layout response.
  //   const payload = Object.fromEntries(
  //     Object.entries(form).filter(
  //       ([key]) => key in allFieldsByKey || key === "role",
  //     ),
  //   );

  //   console.log("formData:", JSON.stringify(payload), contract);

  //   try {
  //     const res: Response = await api.post("/onboard", {payload});
  //     window.location.href = "/login";
  //   } catch (err) {
  //     console.error("ERROR", err);
  //     window.alert("Failed to save data");
  //     // window.location.reload();
  //   }
  //   setLoading(false);
  // };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!contract) {
      setErrorMsg("Please attach your signed contract before submitting.");
      return;
    }

    setErrorMsg("");
    setLoading(true);

    // Only send fields that were actually rendered on the form, plus role.
    const payload = Object.fromEntries(
      Object.entries({ ...form, role: type.type }).filter(
        ([key]) => key in allFieldsByKey || key === "role",
      ),
    );

    const body = new FormData();
    body.append("payload", JSON.stringify(payload));
    body.append("contract", contract, contract.name);
    for (const [key, value] of body.entries()) {
      console.log(key, value);
    }
    try {
      const token = localStorage.getItem("hr_token");
      // await api.post("/onboard", body);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/onboard`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body,
      });
      if (!res.ok) {
        let message = `Request failed (${res.status})`;
        try {
          const errBody = await res.json();
          message = errBody.error || errBody.message || message;
          // console.log("error", errBody);
        } catch {
          // response wasn't JSON (e.g. an HTML error page) — fall back to status text
          message = res.statusText || message;
        }
        throw new Error(message);
      }

      window.location.href = "/login";
    } catch (err) {
      console.error("ERROR", err);
      window.alert(err);
    } finally {
      setLoading(false);
    }
  };

  // ---------- Build a lookup of every field the API returned, keyed by field key ----------
  const allFieldsByKey: Record<string, ApiField> = {};
  if (layout) {
    Object.values(layout).forEach((fields) => {
      fields.forEach((f) => {
        allFieldsByKey[f.key] = f;
      });
    });
  }

  const renderControl = (apiField: ApiField) => {
    const hint = RENDER_HINTS[apiField.key] ?? DEFAULT_HINT;
    const key = apiField.key as FormKey;

    if (hint.kind === "select") {
      return (
        <select
          required={apiField.required}
          value={form[key] ?? ""}
          onChange={update(key)}
          className={inputClass}
        >
          <option value="" disabled>
            Select
          </option>
          {hint.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    if (hint.kind === "textarea") {
      return (
        <textarea
          required={apiField.required}
          rows={hint.rows}
          value={form[key] ?? ""}
          onChange={update(key)}
          className={inputClass}
          placeholder={hint.placeholder}
        />
      );
    }

    return (
      <input
        required={apiField.required}
        type={hint.inputType}
        value={form[key] ?? ""}
        onChange={update(key)}
        className={inputClass}
        placeholder={hint.placeholder}
      />
    );
  };

  const renderField = (apiField: ApiField) => (
    <Field
      key={apiField.key}
      label={apiField.label}
      required={apiField.required}
      optional={!apiField.required}
    >
      {renderControl(apiField)}
    </Field>
  );

  // ---------- Figure out which sections/rows actually have data ----------
  const usingFallback = !layout; // fetch failed or hasn't resolved yet with no layout
  const effectiveFieldSource: LayoutResponse | null = layout;

  const renderedSections: { title: string; content: ReactNode }[] = [];

  if (effectiveFieldSource) {
    const consumedKeys = new Set<string>();

    SECTIONS_CONFIG.forEach((section) => {
      const sectionFields = effectiveFieldSource[section.key];
      if (!sectionFields || sectionFields.length === 0) return; // whole section absent

      const sectionKeys = new Set(sectionFields.map((f) => f.key));
      const rowNodes: ReactNode[] = [];

      section.rows.forEach((row, idx) => {
        const present = row.filter((k) => sectionKeys.has(k));
        present.forEach((k) => consumedKeys.add(k));
        if (present.length === 0) return;

        if (present.length === 1) {
          rowNodes.push(
            <div key={idx}>{renderField(allFieldsByKey[present[0]])}</div>,
          );
        } else {
          rowNodes.push(
            <div
              key={idx}
              className={GRID_CLASS[present.length] ?? "grid grid-cols-2 gap-4"}
            >
              {present.map((k) => renderField(allFieldsByKey[k]))}
            </div>,
          );
        }
      });

      // Any field the API added for this section that isn't part of a known
      // row grouping still gets rendered, full-width, in API order.
      sectionFields
        .filter((f) => !consumedKeys.has(f.key))
        .forEach((f) => {
          rowNodes.push(<div key={f.key}>{renderField(f)}</div>);
          consumedKeys.add(f.key);
        });

      if (rowNodes.length > 0) {
        renderedSections.push({ title: section.title, content: rowNodes });
      }
    });

    // Any entirely new section the API introduces that we have no config for.
    Object.keys(effectiveFieldSource)
      .filter(
        (sectionKey) => !SECTIONS_CONFIG.some((s) => s.key === sectionKey),
      )
      .forEach((sectionKey) => {
        const fields = effectiveFieldSource[sectionKey];
        if (!fields || fields.length === 0) return;
        renderedSections.push({
          title: sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1),
          content: fields.map((f) => <div key={f.key}>{renderField(f)}</div>),
        });
      });
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <header className="mb-10 border-b border-slate-200 pb-6">
        <p className="text-sm font-medium uppercase tracking-wide text-amber-700">
          Intern Onboarding
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-900">
          Tell us about yourself
        </h1>
        <p className="mt-2 text-slate-600">
          This information sets up your HR record. Fields marked optional can be
          skipped.
        </p>
      </header>

      {layoutLoading ? (
        <p className="text-sm text-slate-500">Loading form…</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-14">
          {layoutError && (
            <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {layoutError}
            </p>
          )}

          {renderedSections.map((section, idx) => (
            <Section
              key={section.title}
              title={section.title}
              note={String(idx + 1).padStart(2, "0")}
            >
              {section.content}
            </Section>
          ))}

          <Section
            title={
              <span>
                Contract File Upload <span className="text-red-500">*</span>
              </span>
            }
            note={String(renderedSections.length + 1).padStart(2, "0")}
          >
            <div className="flex gap-4 sm:flex-row">
              {/* <span>*</span> */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-1 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
                  dragActive
                    ? "border-amber-500 bg-amber-50"
                    : "border-slate-300 hover:border-slate-400"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  required
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                {contract ? (
                  <div className="text-sm">
                    <p className="font-medium text-slate-900">
                      {contract.name}
                    </p>
                    <p className="mt-1 text-slate-500">
                      {(contract.size / 1024).toFixed(0)} KB — click to replace
                    </p>
                  </div>
                ) : (
                  <div className="text-sm text-slate-600">
                    <p className="font-medium">
                      Drop your signed contract here, or click to browse
                    </p>
                    <p className="mt-1 text-slate-400">
                      PDF or Word document, up to 10MB
                    </p>
                  </div>
                )}
              </div>

              <a
                href="/templates/onboard_intern_template.pdf"
                download
                onClick={(e) => e.stopPropagation()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-6 py-10 text-center transition-colors hover:border-slate-300 hover:bg-slate-100 sm:w-56"
              >
                <svg
                  className="h-6 w-6 text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                  />
                </svg>
                <div className="text-sm">
                  <p className="font-medium text-slate-700">
                    Download template
                  </p>
                  <p className="mt-0.5 text-slate-400">
                    Don&apos;t have a contract yet? Get the standard format.
                  </p>
                </div>
              </a>
            </div>
          </Section>

          {errorMsg && (
            <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-6">
            <button
              type="submit"
              disabled={errorMsg || loading ? true : false}
              className="rounded-md bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit application
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Section({
  title,
  note,
  children,
}: {
  title: ReactNode;
  note: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-5 flex items-baseline gap-3">
        <span className="text-xs font-medium text-amber-700">{note}</span>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  optional,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
        {label}
        {optional && (
          <span className="text-xs font-normal text-slate-400">(optional)</span>
        )}
        {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";
