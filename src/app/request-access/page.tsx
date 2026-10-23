"use client";

import { api } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

type Role = "" | "admin";
type Gender = "" | "male" | "female" | "prefer_not_to_say" | "other";

interface FormState {
  name: string;
  email: string;
  gender: Gender;
  role: Role;
}

interface FormErrors {
  name?: string;
  email?: string;
  gender?: string;
  role?: string;
}

const GENDER_OPTIONS: { value: Exclude<Gender, "">; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
  { value: "other", label: "Other" },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validate = (values: FormState): FormErrors => {
  const errors: FormErrors = {};

  if (!values.name.trim()) {
    errors.name = "Enter your name.";
  }

  if (!values.email.trim()) {
    errors.email = "Enter your email address.";
  } else if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = "Enter a valid email address, like name@company.com.";
  }

  if (!values.gender) {
    errors.gender = "Select a gender option.";
  }

  if (!values.role) {
    errors.role = "Select a role.";
  }

  return errors;
};

export default function RequestAccessPage() {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    gender: "",
    role: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<keyof FormState, boolean>>({
    name: false,
    email: false,
    gender: false,
    role: false,
  });

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const next = { ...form, [name]: value } as FormState;
    setForm(next);
    if (touched[name as keyof FormState]) {
      setErrors(validate(next));
    }
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors(validate(form));
  };

  const handleSubmit = async(e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationErrors = validate(form);
    setErrors(validationErrors);
    setTouched({ name: true, email: true, gender: true, role: true });

    if (Object.keys(validationErrors).length > 0) return;

    // TODO: replace with your API call
    await api.post('/onboard/request-access', form).catch(() => {showToast('error','Failed to add data')});
  };

  const inputBase =
    "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:ring-2";
  const inputOk =
    "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/20";
  const inputError =
    "border-red-500 focus:border-red-500 focus:ring-red-500/20";

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-slate-100 px-4">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-2xl font-semibold text-slate-900">
          Request access
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Fill in your details and an admin will review your request.
        </p>

        <div className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Your full name"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "name-error" : undefined}
              className={`${inputBase} ${errors.name ? inputError : inputOk}`}
            />
            {errors.name && (
              <p id="name-error" className="mt-1.5 text-xs text-red-600">
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="name@company.com"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              className={`${inputBase} ${errors.email ? inputError : inputOk}`}
            />
            {errors.email && (
              <p id="email-error" className="mt-1.5 text-xs text-red-600">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="gender"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Gender
            </label>
            <select
              id="gender"
              name="gender"
              value={form.gender}
              onChange={handleChange}
              onBlur={handleBlur}
              aria-invalid={Boolean(errors.gender)}
              aria-describedby={errors.gender ? "gender-error" : undefined}
              className={`${inputBase} ${errors.gender ? inputError : inputOk}`}
            >
              <option value="" disabled>
                Select gender
              </option>
              {GENDER_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {errors.gender && (
              <p id="gender-error" className="mt-1.5 text-xs text-red-600">
                {errors.gender}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="role"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Role
            </label>
            <select
              id="role"
              name="role"
              value={form.role}
              onChange={handleChange}
              onBlur={handleBlur}
              aria-invalid={Boolean(errors.role)}
              aria-describedby={errors.role ? "role-error" : undefined}
              className={`${inputBase} ${errors.role ? inputError : inputOk}`}
            >
              <option value="" disabled>
                Select a role
              </option>
              <option value="admin">Admin</option>
            </select>
            {errors.role && (
              <p id="role-error" className="mt-1.5 text-xs text-red-600">
                {errors.role}
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          className="mt-8 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
        >
          Submit request
        </button>
      </form>
    </main>
  );
}