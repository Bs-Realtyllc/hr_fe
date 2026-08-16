'use client';

import {
  useState,
  useRef,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type ReactNode,
} from 'react';

const EDUCATION_LEVELS = [
  'High School',
  'Diploma',
  "Bachelor's",
  "Master's",
  'PhD',
  'Other',
] as const;

interface InternFormData {
  name: string;
  dob: string;
  gender: string;
  phone: string;
  email: string;
  current_address: string;
  permanent_address: string;
  education_level: string;
  institution_name: string;
  field_of_study: string;
  graduation_date: string;
  previous_experience: string;
  tech_stack: string;
  areas_of_interest: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  emergency_contact_name: string;
  emergency_contact: string;
  role: 'intern' | 'employee' | 'owner',
  additional_info: string;
  is_active: true | false | null;

}

type FormKey = keyof InternFormData;

const initialState: InternFormData = {
  name: '',
  dob: '',
  gender: '',
  phone: '',
  email: '',
  current_address: '',
  permanent_address: '',
  education_level: '',
  institution_name: '',
  field_of_study: '',
  graduation_date: '',
  previous_experience: '',
  tech_stack: '',
  areas_of_interest: '',
  linkedin_url: '',
  github_url: '',
  portfolio_url: '',
  emergency_contact_name: '',
  emergency_contact: '',
  role: 'intern',
  additional_info: '',
  is_active: null,
};

export default function InternForm() {
  const [form, setForm] = useState<InternFormData>(initialState);
  const [contract, setContract] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const update =
    (key: FormKey) =>
      (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const value =
          e.target instanceof HTMLInputElement && e.target.type === 'checkbox'
            ? e.target.checked
            : e.target.value;

        setForm((prev) => ({ ...prev, [key]: value }));
      };

  const handleFile = (file: File | null | undefined) => {
    if (!file) return;
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowed.includes(file.type)) {
      setErrorMsg('Contract must be a PDF or Word document.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('File must be under 10MB.');
      return;
    }
    setErrorMsg('');
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
    console.log('formData:', JSON.stringify(form));

    // Submission is not wired up yet.
    // const payload = new FormData();
    // (Object.entries(form) as [FormKey, string][]).forEach(([key, value]) => {
    //   payload.append(key, value);
    // });
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const response = await res.json();
      console.log(response)
    } catch (err) {
      console.log("ERROR", err)
    }
    setLoading(false)
    // if (contract) payload.append('contract', contract);
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <header className="mb-10 border-b border-slate-200 pb-6">
        <p className="text-sm font-medium uppercase tracking-wide text-amber-700">Intern Onboarding</p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-900">Tell us about yourself</h1>
        <p className="mt-2 text-slate-600">
          This information sets up your HR record. Fields marked optional can be skipped.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-14">
        {/* Personal Information */}
        <Section title="Personal Information" note="01">
          <Field label="Full Name" required>
            <input required type="text" value={form.name} onChange={update('name')} className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date of Birth" required>
              <input required type="date" value={form.dob} onChange={update('dob')} className={inputClass} />
            </Field>
            <Field label="Gender" required>
              <select required value={form.gender} onChange={update('gender')} className={inputClass}>
                <option value="" disabled>Select</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Contact Number" required>
              <input required type="tel" value={form.phone} onChange={update('phone')} className={inputClass} />
            </Field>
            <Field label="Email Address" required>
              <input required type="email" value={form.email} onChange={update('email')} className={inputClass} />
            </Field>
          </div>
          <Field label="Current Address" required>
            <textarea required rows={2} value={form.current_address} onChange={update('current_address')} className={inputClass} />
          </Field>
          <Field label="Permanent Address" required>
            <textarea
              required
              rows={2}
              value={form.permanent_address}
              onChange={update('permanent_address')}
              className={inputClass}
            />
          </Field>
        </Section>

        {/* Educational Information */}
        <Section title="Educational Information" note="02">
          <Field label="Education Level" required>
            <select required value={form.education_level} onChange={update('education_level')} className={inputClass}>
              <option value="" disabled>Select</option>
              {EDUCATION_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>{lvl}</option>
              ))}
            </select>
          </Field>
          <Field label="Institution / College Name" required>
            <input required type="text" value={form.institution_name} onChange={update('institution_name')} className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Field of Study" required>
              <input required type="text" value={form.field_of_study} onChange={update('field_of_study')} className={inputClass} />
            </Field>
            <Field label="Graduation / Expected Graduation Date" required>
              <input required type="date" value={form.graduation_date} onChange={update('graduation_date')} className={inputClass} />
            </Field>
          </div>
        </Section>

        {/* Professional Information */}
        <Section title="Professional Information" note="03">
          <Field label="Previous Work / Internship Experience">
            <textarea
              rows={3}
              value={form.previous_experience}
              onChange={update('previous_experience')}
              className={inputClass}
              placeholder="Roles, companies, dates — or leave blank if none"
            />
          </Field>
          <Field label="Relevant Skills" required>
            <textarea
              required
              rows={2}
              value={form.tech_stack}
              onChange={update('tech_stack')}
              className={inputClass}
              placeholder="e.g. React, SQL, Figma"
            />
          </Field>
          <Field label="Areas of Interest" required>
            <textarea
              required
              rows={2}
              value={form.areas_of_interest}
              onChange={update('areas_of_interest')}
              className={inputClass}
              placeholder="What kind of work excites you?"
            />
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="LinkedIn Profile" optional>
              <input type="url" value={form.linkedin_url} onChange={update('linkedin_url')} className={inputClass} placeholder="https://linkedin.com/in/..." />
            </Field>
            <Field label="GitHub Profile" optional>
              <input type="url" value={form.github_url} onChange={update('github_url')} className={inputClass} placeholder="https://github.com/..." />
            </Field>
            <Field label="Portfolio / Website" optional>
              <input type="url" value={form.portfolio_url} onChange={update('portfolio_url')} className={inputClass} placeholder="https://..." />
            </Field>
          </div>
        </Section>

        {/* Additional Information */}
        <Section title="Additional Information" note="04">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Emergency Contact Name" required>
              <input required type="text" value={form.emergency_contact_name} onChange={update('emergency_contact_name')} className={inputClass} />
            </Field>
            <Field label="Emergency Contact Number" required>
              <input required type="tel" value={form.emergency_contact} onChange={update('emergency_contact')} className={inputClass} />
            </Field>
          </div>
          <Field label="Anything else HR should know" optional>
            <textarea
              rows={3}
              value={form.additional_info}
              onChange={update('additional_info')}
              className={inputClass}
              placeholder="Accessibility needs, availability constraints, anything relevant"
            />
          </Field>
        </Section>

        <Section title="Contract File Upload" note="05">
          <div className="flex gap-4 sm:flex-row">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-1 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${dragActive ? 'border-amber-500 bg-amber-50' : 'border-slate-300 hover:border-slate-400'
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
                  <p className="mt-1 text-slate-500">{(contract.size / 1024).toFixed(0)} KB — click to replace</p>
                </div>
              ) : (
                <div className="text-sm text-slate-600">
                  <p className="font-medium">Drop your signed contract here, or click to browse</p>
                  <p className="mt-1 text-slate-400">PDF or Word document, up to 10MB</p>
                </div>
              )}
            </div>

            <a
              href="/templates/onboard_intern_template.pdf"
              download
              onClick={(e) => e.stopPropagation()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-6 py-10 text-center transition-colors hover:border-slate-300 hover:bg-slate-100 sm:w-56"
            >
              <svg className="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              <div className="text-sm">
                <p className="font-medium text-slate-700">Download template</p>
                <p className="mt-0.5 text-slate-400">Don&apos;t have a contract yet? Get the standard format.</p>
              </div>
            </a>
          </div>
        </Section>

        {errorMsg && (
          <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{errorMsg}</p>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-6">
          <button
            type="submit"
            disabled={(errorMsg || loading) ? true : false}
            className="rounded-md bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit application
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, note, children }: { title: string; note: string; children: ReactNode }) {
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
        {optional && <span className="text-xs font-normal text-slate-400">(optional)</span>}
        {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500';