import type { ReactNode } from "react";

/** Label for an onboarding field: red * when required, "(optional)" otherwise. */
export default function FieldLabel({
    htmlFor,
    required,
    children,
}: {
    htmlFor?: string;
    required: boolean;
    children: ReactNode;
}) {
    return (
        <label htmlFor={htmlFor} className="text-[14px] font-medium text-(--gray-dark-active)">
            {children}
            {required ? (
                <span className="text-(--error-normal-hover)" aria-hidden="true">
                    {" "}*
                </span>
            ) : (
                <span className="font-normal text-(--soft-white-dark-hover)"> (optional)</span>
            )}
        </label>
    );
}
