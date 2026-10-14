'use client';

import React from 'react';
import './Button.css';


export type ButtonVariant = 'primary' | 'secondary' | 'text';

export type ButtonSize =
    | 'xs'
    | 'xs-medium'
    | 'small'
    | 'medium'
    | 'large'
    | 'xl'
    | '2xl';

const iconSizeMap: Record<ButtonSize, number> = {
    xs: 14,
    'xs-medium': 14,
    small: 16,
    medium: 18,
    large: 20,
    xl: 22,
    '2xl': 24,
};
export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /**BUtton variant */
    variant?: ButtonVariant;
    /**Button size */
    size?: ButtonSize;
    /**Left icon */
    leftIcon?: React.ReactNode | boolean;
    /**Right icon */
    rightIcon?: React.ReactNode | boolean;
}

export default function Button({
    children = 'Button',
    variant = 'primary',
    size = 'medium',
    disabled = false,
    className = '',
    leftIcon,
    rightIcon,
    type = 'button',
    ...buttonProps
}: ButtonProps) {
    const iconSize = iconSizeMap[size];

    const resolvedLeftIcon =
        leftIcon === true
            ? <span
                className="icon-mask"
                style={{
                    width: iconSize,
                    height: iconSize,
                    WebkitMaskImage: 'url(/icons/message-circle.svg)',
                    maskImage: 'url(/icons/message-circle.svg)',

                }} />
            : leftIcon;

    const resolvedRightIcon =
        rightIcon === true
            ? <span
                className="icon-mask"
                style={{
                    width: iconSize,
                    height: iconSize,
                    WebkitMaskImage: 'url(/icons/message-circle.svg)',
                    maskImage: 'url(/icons/arrow-right.svg)',

                }} />
            : rightIcon;

    return (
        <button
            {...buttonProps}
            type={type}
            className={`button button--${variant} button--${size} ${className} `}
            disabled={disabled}
        >
            {resolvedLeftIcon && (
                <span
                    className="button__icon"
                    aria-hidden="true"
                >
                    {resolvedLeftIcon}
                </span>
            )}

            <span className="button__label">
                {children}
            </span>

            {resolvedRightIcon && (
                <span
                    className="button__icon"
                    aria-hidden="true"
                >
                    {resolvedRightIcon}
                </span>
            )}
        </button>
    );
}