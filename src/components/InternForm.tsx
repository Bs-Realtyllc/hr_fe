"use client";

import { api } from "@/lib/api";
import {
  useState,
  useRef,
  useEffect,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type ReactNode,
} from "react";

type FieldType = "text" | "date" | "option" | "file";
type FieldSection = "personal" | "education" | "professional" | "additional";

interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  section: FieldSection;
  required: boolean;
}

type GroupedSchema = Record<string, FieldDefinition[]>;

const SECTION_LABELS: Record<FieldSection, { title: string; note: string }> = {
  personal: { title: "Personal Information", note: "01" },
  education: { title: "Educational Information", note: "02" },
  professional: { title: "Professional Information", note: "03" },
  additional: { title: "Additional Information", note: "04" },
};

const SECTION_ORDER: FieldSection[] = [
  "personal",
  "education",
  "professional",
  "additional",
];

// Fixed option lists for known dropdown fields — the schema only says
// "this is a dropdown" (type: 'option'), the actual choices live here.
const OPTIONS_BY_KEY: Record<string, string[]> = {
  gender: ["Female", "Male", "Other", "Prefer not to say"],
  education_level: [
    "High School",
    "Diploma",
    "Bachelor's",
    "Master's",
    "PhD",
    "Other",
  ],
};

export default function InternForm() {
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [schemaError, setSchemaError] = useState("");

  const [contract, setContract] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch the field schema and flatten { personal: [...], education: [...], ... } into one array
  useEffect(() => {
    const fetchForm = async () => {
      try {
        const response = await api.get("/employees/get-form");

        console.log("API response:", response);

        // If your api.get() returns the JSON directly
        const grouped: any = response;

        // Convert:
        // {
        //   personal: [...],
        //   education: [...],
        //   professional: [...],
        //   additional: [...]
        // }
        //
        // into:
        // [
        //   { key: "name", ... },
        //   { key: "dob", ... },
        //   ...
        // ]
        const flat: FieldDefinition[] = SECTION_ORDER.flatMap(
          (section) => grouped[section] ?? [],
        );

        console.log("Flattened fields:", flat);

        if (flat.length === 0) {
          throw new Error("Form schema is empty");
        }

        setFields(flat);

        // Create initial form state
        setForm(Object.fromEntries(flat.map((field) => [field.key, ""])));
      } catch (err) {
        console.error("Failed to load form schema:", err);

        setSchemaError(
          "Couldn't load the application form. Please refresh the page.",
        );
      } finally {
        setSchemaLoading(false);
      }
    };

    fetchForm();
  }, []);
  console.log(fields);

  const update =
    (key: string) =>
    (
      e: ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    console.log("formData:", JSON.stringify(form));

    try {
      const response = await api.post<any>("/employees", {
        body: JSON.stringify(form),
      });
      console.log(response);
    } catch (err) {
      console.log("ERROR", err);
    }
    setLoading(false);
  };

  if (schemaLoading) {
    return (
      <div className="py-24 text-center text-slate-500">Loading form…</div>
    );
  }

  if (schemaError) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {schemaError}
        </p>
      </div>
    );
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

      <form onSubmit={handleSubmit} className="space-y-14">
        {SECTION_ORDER.map((section) => {
          const sectionFields = fields.filter(
            (field) => field.section === section,
          );

          if (sectionFields.length === 0) {
            return null;
          }

          return (
            <Section
              key={section}
              title={SECTION_LABELS[section].title}
              note={SECTION_LABELS[section].note}
            >
              {sectionFields.map((field) => (
                <Field
                  key={field.key}
                  label={field.label}
                  required={field.required}
                  optional={!field.required}
                >
                  {renderInput(field, form[field.key] ?? "", update(field.key))}
                </Field>
              ))}
            </Section>
          );
        })}

        {/* Contract Upload — fixed step, not part of the dynamic schema */}
        <Section title="Contract File Upload" note="05">
          <div className="flex gap-4 sm:flex-row">
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
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              {contract ? (
                <div className="text-sm">
                  <p className="font-medium text-slate-900">{contract.name}</p>
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
                <p className="font-medium text-slate-700">Download template</p>
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
            disabled={!!errorMsg || loading}
            className="rounded-md bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit application
          </button>
        </div>
      </form>
    </div>
  );
}

function renderInput(
  field: FieldDefinition,
  value: string,
  onChange: (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void,
) {
  if (field.type === "date") {
    return (
      <input
        required={field.required}
        type="date"
        value={value}
        onChange={onChange}
        className={inputClass}
      />
    );
  }

  if (field.type === "option") {
    const options = OPTIONS_BY_KEY[field.key] ?? [];
    return (
      <select
        required={field.required}
        value={value}
        onChange={onChange}
        className={inputClass}
      >
        <option value="" disabled>
          Select
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "file") {
    return (
      <input
        required={field.required}
        type="file"
        onChange={onChange as any}
        className={inputClass}
      />
    );
  }

  // text — long-form fields render as textarea, everything else as a single-line input
  const LONG_TEXT_KEYS = [
    "current_address",
    "permanent_address",
    "previous_experience",
    "tech_stack",
    "areas_of_interest",
    "additional_info",
  ];

  if (LONG_TEXT_KEYS.includes(field.key)) {
    return (
      <textarea
        required={field.required}
        rows={3}
        value={value}
        onChange={onChange}
        className={inputClass}
      />
    );
  }

  const inputType =
    field.key === "email"
      ? "email"
      : field.key === "phone" || field.key === "emergency_contact"
        ? "tel"
        : field.key.endsWith("_url")
          ? "url"
          : "text";

  return (
    <input
      required={field.required}
      type={inputType}
      value={value}
      onChange={onChange}
      className={inputClass}
    />
  );
}

function Section({
  title,
  note,
  children,
}: {
  title: string;
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
