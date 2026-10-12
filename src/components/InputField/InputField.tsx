'use client';

import React, {
    forwardRef,
    useId,
    useState,
} from 'react';

import { EyeIcon, EyeOffIcon } from 'lucide-react';
import './InputField.css'
export type InputVariant =
    | 'default'
    | 'error'
    | 'success';

export interface InputFieldProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    /** Visual variant */
    variant?: InputVariant;

    /** Show password visibility toggle */
    showPasswordToggle?: boolean;
}

/* --------------------------------
   Error Icon
-------------------------------- */

const ErrorIcon = () => (
    <svg
        className="input-field__status-icon input-field__status-icon--error"
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden="true"
    >
        <circle
            cx="7"
            cy="7"
            r="6"
            fill="currentColor"
        />

        <path
            d="M7 3.5V7.5"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
        />

        <circle
            cx="7"
            cy="10"
            r="0.8"
            fill="white"
        />
    </svg>
);

/* --------------------------------
   Success Icon
-------------------------------- */

const SuccessIcon = () => (
    <svg
        className="input-field__status-icon input-field__status-icon--success"
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden="true"
    >
        <circle
            cx="7"
            cy="7"
            r="6"
            fill="currentColor"
        />

        <path
            d="M4.2 7L6.2 9L10 5"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

/* --------------------------------
   Input Field
-------------------------------- */

const InputField = forwardRef<
    HTMLInputElement,
    InputFieldProps
>(
    (
        {
            type = 'text',
            variant = 'default',
            showPasswordToggle = false,
            disabled = false,
            placeholder = 'Input placeholder',
            className = '',
            id,
            value,
            defaultValue,
            onChange,
            ...props
        },
        ref
    ) => {
        const generatedId = useId();

        const inputId =
            id || `input-field-${generatedId}`;

        const [internalValue, setInternalValue] =
            useState(
                defaultValue?.toString() || ''
            );

        const [showPassword, setShowPassword] =
            useState(false);

        const isControlled =
            value !== undefined;

        const inputValue = isControlled
            ? value
            : internalValue;

        const isPassword =
            type === 'password';

        const shouldShowPasswordToggle =
            isPassword && showPasswordToggle;

        const inputType =
            isPassword && showPassword
                ? 'text'
                : type;

        const handleChange = (
            event: React.ChangeEvent<HTMLInputElement>
        ) => {
            if (!isControlled) {
                setInternalValue(
                    event.target.value
                );
            }

            onChange?.(event);
        };

        const togglePasswordVisibility = () => {
            setShowPassword(
                previous => !previous
            );
        };

        return (
            <div
                className={[
                    'input-field',
                    className,
                ]
                    .filter(Boolean)
                    .join(' ')}
            >
                <div
                    className={[
                        'input-field__container',
                        `input-field__container--${variant}`,
                        disabled && 'input-field__container--disabled',
                        shouldShowPasswordToggle &&
                        'input-field__container--password',
                    ]
                        .filter(Boolean)
                        .join(' ')}
                >

                    <input
                        ref={ref}
                        id={inputId}
                        type={inputType}
                        value={inputValue}
                        disabled={disabled}
                        placeholder={placeholder}
                        className="input-field__input"
                        aria-invalid={
                            variant === 'error'
                                ? true
                                : undefined
                        }
                        onChange={handleChange}
                        {...props}
                    />

                    {/* Password icon */}

                    {shouldShowPasswordToggle && (
                        <button
                            type="button"
                            className="input-field__password-button"
                            onClick={
                                togglePasswordVisibility
                            }
                            disabled={disabled}
                            aria-label={
                                showPassword
                                    ? 'Hide password'
                                    : 'Show password'
                            }
                        >
                            {showPassword ? (
                                <EyeOffIcon
                                    size={16}
                                    aria-hidden="true"
                                />
                            ) : (
                                <EyeIcon
                                    size={16}
                                    aria-hidden="true"
                                />
                            )}
                        </button>
                    )}

                    {/* Error icon */}

                    {variant === 'error' &&
                        !shouldShowPasswordToggle && (
                            <ErrorIcon />
                        )}

                    {/* Success icon */}

                    {variant === 'success' &&
                        !shouldShowPasswordToggle && (
                            <SuccessIcon />
                        )}
                </div>
            </div>
        );
    }
);

InputField.displayName = 'InputField';

export default InputField;