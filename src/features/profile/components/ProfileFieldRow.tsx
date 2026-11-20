import type { ReactNode } from 'react';

/**
 * One labelled field on the admin profile forms.
 * ≥768px: label left, control (input + optional Edit button) right.
 * <768px: label above, control full width (see .profile-text-field in text-field.css).
 */
export default function ProfileFieldRow({
  label,
  htmlFor,
  children,
}: {
  label: ReactNode;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex justify-between gap-[8px] md:items-center md:gap-[16px] max-md:flex-col">
      <label
        htmlFor={htmlFor}
        className="flex shrink-0 items-center gap-1 text-[14px] font-medium text-(--gray-darker)"
      >
        {label}
      </label>
      <div className="flex min-w-0 items-center gap-6 max-md:gap-3">{children}</div>
    </div>
  );
}
