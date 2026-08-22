// "use client";

// import { api } from "@/lib/api";
// import { useState } from "react";

// type FieldType = "text" | "date" | "option" | "file" | "download";
// type FieldSection = "personal" | "education" | "professional" | "additional";

// interface FormFieldDefinition {
//   rowId: string; // internal key for React list rendering only — not sent anywhere
//   name: string;
//   type: FieldType;
//   section: FieldSection;
//   required: boolean;
//   maxLength?: number; // text only
//   options?: string; // option only — comma-separated while editing
//   downloadUrl?: string; // download only
// }

// const FIELD_TYPES: { value: FieldType; label: string }[] = [
//   { value: "text", label: "Text" },
//   { value: "date", label: "Date" },
//   { value: "option", label: "Option (dropdown)" },
//   { value: "file", label: "File upload" },
//   { value: "download", label: "Download (admin-provided file)" },
// ];

// const FIELD_SECTIONS: { value: FieldSection; label: string }[] = [
//   { value: "personal", label: "Personal Information" },
//   { value: "education", label: "Educational Information" },
//   { value: "professional", label: "Professional Information" },
//   { value: "additional", label: "Additional Information" },
// ];

// const emptyField = (): FormFieldDefinition => ({
//   rowId: crypto.randomUUID(),
//   name: "",
//   type: "text",
//   section: "personal",
//   required: true,
//   maxLength: undefined,
//   options: "",
//   downloadUrl: "",
// });

// // "Full Name" -> "full_name" — used as the field's programmatic key later on InternForm
// const slugify = (value: string) =>
//   value
//     .trim()
//     .toLowerCase()
//     .replace(/[^a-z0-9]+/g, "_")
//     .replace(/^_+|_+$/g, "");

// const Page = () => {
//   const [fields, setFields] = useState<FormFieldDefinition[]>([emptyField()]);

//   const updateField = (rowId: string, patch: Partial<FormFieldDefinition>) => {
//     setFields((prev) =>
//       prev.map((f) => (f.rowId === rowId ? { ...f, ...patch } : f)),
//     );
//   };

//   const addField = () => {
//     setFields((prev) => [...prev, emptyField()]);
//   };

//   const removeField = (rowId: string) => {
//     setFields((prev) => prev.filter((f) => f.rowId !== rowId));
//   };

//   const handleSetForm = async () => {
//     const flatFields = fields
//       .filter((f) => f.name.trim() !== "")
//       .map((f) => {
//         const base: Record<string, unknown> = {
//           key: slugify(f.name),
//           label: f.name.trim(),
//           type: f.type,
//           section: f.section,
//           required: f.required,
//         };

//         if (f.type === "text" && f.maxLength) {
//           base.maxLength = f.maxLength;
//         }

//         if (f.type === "option") {
//           base.options = (f.options || "")
//             .split(",")
//             .map((opt) => opt.trim())
//             .filter(Boolean);
//         }

//         if (f.type === "download") {
//           base.downloadUrl = f.downloadUrl || "";
//         }

//         return base;
//       });

//     // Grouped by section — mirrors InternForm's Personal/Education/Professional/Additional layout
//     const grouped = FIELD_SECTIONS.reduce(
//       (acc, s) => {
//         acc[s.value] = flatFields.filter((f) => f.section === s.value);
//         return acc;
//       },
//       {} as Record<FieldSection, typeof flatFields>,
//     );

//     console.log(JSON.stringify(grouped, null, 2));
//     const response = await api.post<any>("/employees/set-form", {
//       body: JSON.stringify(grouped),
//     });
//   };

//   return (
//     <div className="mx-auto max-w-4xl px-6 py-14">
//       <header className="mb-8 border-b border-slate-200 pb-6">
//         <p className="text-sm font-medium uppercase tracking-wide text-amber-700">
//           Admin
//         </p>
//         <h1 className="mt-1 text-3xl font-semibold text-slate-900">
//           Intern Form Builder
//         </h1>
//         <p className="mt-2 text-slate-600">
//           Define the fields interns will need to fill out. These will be mapped
//           onto the intern onboarding form.
//         </p>
//       </header>

//       <div className="space-y-4">
//         {fields.map((field, index) => (
//           <div
//             key={field.rowId}
//             className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
//           >
//             <div className="flex items-start justify-between gap-4">
//               <span className="mt-2 text-xs font-medium text-slate-400">
//                 #{index + 1}
//               </span>

//               <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
//                 <label className="block">
//                   <span className="mb-1.5 block text-sm font-medium text-slate-700">
//                     Field Name
//                   </span>
//                   <input
//                     type="text"
//                     value={field.name}
//                     onChange={(e) =>
//                       updateField(field.rowId, { name: e.target.value })
//                     }
//                     placeholder="e.g. Full Name"
//                     className={inputClass}
//                   />
//                 </label>

//                 <label className="block">
//                   <span className="mb-1.5 block text-sm font-medium text-slate-700">
//                     Type
//                   </span>
//                   <select
//                     value={field.type}
//                     onChange={(e) =>
//                       updateField(field.rowId, {
//                         type: e.target.value as FieldType,
//                       })
//                     }
//                     className={inputClass}
//                   >
//                     {FIELD_TYPES.map((t) => (
//                       <option key={t.value} value={t.value}>
//                         {t.label}
//                       </option>
//                     ))}
//                   </select>
//                 </label>

//                 <label className="block">
//                   <span className="mb-1.5 block text-sm font-medium text-slate-700">
//                     Section
//                   </span>
//                   <select
//                     value={field.section}
//                     onChange={(e) =>
//                       updateField(field.rowId, {
//                         section: e.target.value as FieldSection,
//                       })
//                     }
//                     className={inputClass}
//                   >
//                     {FIELD_SECTIONS.map((s) => (
//                       <option key={s.value} value={s.value}>
//                         {s.label}
//                       </option>
//                     ))}
//                   </select>
//                 </label>

//                 {field.type === "text" && (
//                   <label className="block">
//                     <span className="mb-1.5 block text-sm font-medium text-slate-700">
//                       Max Characters
//                     </span>
//                     <input
//                       type="number"
//                       min={1}
//                       value={field.maxLength ?? ""}
//                       onChange={(e) =>
//                         updateField(field.rowId, {
//                           maxLength: e.target.value
//                             ? Number(e.target.value)
//                             : undefined,
//                         })
//                       }
//                       placeholder="e.g. 150"
//                       className={inputClass}
//                     />
//                   </label>
//                 )}

//                 {field.type === "option" && (
//                   <label className="block">
//                     <span className="mb-1.5 block text-sm font-medium text-slate-700">
//                       Options{" "}
//                       <span className="font-normal text-slate-400">
//                         (comma-separated)
//                       </span>
//                     </span>
//                     <input
//                       type="text"
//                       value={field.options}
//                       onChange={(e) =>
//                         updateField(field.rowId, { options: e.target.value })
//                       }
//                       placeholder="e.g. Male, Female, Other"
//                       className={inputClass}
//                     />
//                   </label>
//                 )}

//                 {field.type === "download" && (
//                   <label className="block">
//                     <span className="mb-1.5 block text-sm font-medium text-slate-700">
//                       File URL
//                     </span>
//                     <input
//                       type="text"
//                       value={field.downloadUrl}
//                       onChange={(e) =>
//                         updateField(field.rowId, {
//                           downloadUrl: e.target.value,
//                         })
//                       }
//                       placeholder="/templates/contract-template.docx"
//                       className={inputClass}
//                     />
//                   </label>
//                 )}

//                 <label className="flex items-center gap-2 pt-1 sm:col-span-2">
//                   <input
//                     type="checkbox"
//                     checked={field.required}
//                     onChange={(e) =>
//                       updateField(field.rowId, { required: e.target.checked })
//                     }
//                     className="h-4 w-4 rounded border-slate-300"
//                   />
//                   <span className="text-sm text-slate-700">Required</span>
//                 </label>
//               </div>

//               <button
//                 onClick={() => removeField(field.rowId)}
//                 disabled={fields.length === 1}
//                 title={
//                   fields.length === 1
//                     ? "At least one field is required"
//                     : "Remove field"
//                 }
//                 className="mt-1 text-slate-400 transition-colors hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
//               >
//                 <svg
//                   className="h-5 w-5"
//                   fill="none"
//                   viewBox="0 0 24 24"
//                   stroke="currentColor"
//                   strokeWidth={2}
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     d="M6 18L18 6M6 6l12 12"
//                   />
//                 </svg>
//               </button>
//             </div>
//           </div>
//         ))}
//       </div>

//       <div className="mt-6 flex items-center justify-between">
//         <button
//           onClick={addField}
//           className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
//         >
//           + Add field
//         </button>

//         <button
//           onClick={handleSetForm}
//           className="rounded-md bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
//         >
//           Set form
//         </button>
//       </div>
//     </div>
//   );
// };

// const inputClass =
//   "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

// export default Page;
"use client";

import { useState } from "react";
import { api } from "@/lib/api";

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

const Page = () => {
  const [layoutType, setLayoutType] = useState<FormLayoutType>("intern");
  const [selected, setSelected] = useState<SelectedMap>(initialSelected());
  const [required, setRequired] = useState<RequiredMap>(initialRequired());

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
    <div className="mx-auto max-w-3xl px-6 py-14">
      <header className="mb-8 border-b border-slate-200 pb-6">
        <p className="text-sm font-medium uppercase tracking-wide text-amber-700">
          Admin
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-900">
          Form Builder
        </h1>
        <p className="mt-2 text-slate-600">
          Choose which fields appear on the intern onboarding form, and mark
          each as required or optional.
        </p>

        <div className="mt-4 max-w-xs">
          <label className="block text-sm font-medium text-slate-700">
            Form Type
          </label>
          <select
            value={layoutType}
            onChange={(e) => setLayoutType(e.target.value as FormLayoutType)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="intern">Intern</option>
            <option value="employee">Employee</option>
          </select>
        </div>
      </header>

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
