import React from 'react';

type MaskIconProps = {
    /** Path or URL to the SVG, e.g. "/icons/dots-menu.svg" */
    src: string;
    /** Width in px (number) or any CSS size ("1.5rem", "100%") */
    width?: number | string;
    /** Height in px (number) or any CSS size */
    height?: number | string;
    /** Shorthand to set width and height together */
    size?: number | string;
    /** Any CSS color: "red", "#333", "var(--gray-normal)" */
    color?: string;
    /** Extra Tailwind/CSS classes */
    className?: string;
    /** Extra inline styles (merged last, so they win) */
    style?: React.CSSProperties;
    /** Mask options */
    maskSize?: 'contain' | 'cover' | 'auto' | string;
    maskPosition?: string;
    maskRepeat?: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
    /** Accessibility: provide a label if the icon is meaningful */
    label?: string;
    /** Optional click handler */
    onClick?: React.MouseEventHandler<HTMLSpanElement>;
} & Omit<React.HTMLAttributes<HTMLSpanElement>, 'style' | 'className' | 'onClick'>;

const toCssSize = (v?: number | string) =>
    typeof v === 'number' ? `${v}px` : v;

export default function MaskIcon({
    src,
    width,
    height,
    size = 24,
    color = 'currentColor',
    className = '',
    style,
    maskSize = 'contain',
    maskPosition = 'center',
    maskRepeat = 'no-repeat',
    label,
    onClick,
    ...rest
}: MaskIconProps) {
    const maskUrl = `url(${src})`;

    return (
        <span
            role={label ? 'img' : undefined}
            aria-label={label}
            aria-hidden={label ? undefined : true}
            onClick={onClick}
            className={`inline-block shrink-0 ${className}`}
            style={{
                width: toCssSize(width ?? size),
                height: toCssSize(height ?? size),
                backgroundColor: color,
                WebkitMaskImage: maskUrl,
                maskImage: maskUrl,
                WebkitMaskRepeat: maskRepeat,
                maskRepeat,
                WebkitMaskPosition: maskPosition,
                maskPosition,
                WebkitMaskSize: maskSize,
                maskSize,
                ...style,
            }}
            {...rest}
        />
    );
}

// UseCase
{/* 
    <MaskIcon
  src="/icons/dots-menu.svg"
  size={24} // width={20} height={12}
  color="var(--gray-normal)"
  label="Open menu"
  onClick={() => setOpen(true)}
  className="cursor-pointer hover:opacity-70 transition-opacity"
/>
 */}