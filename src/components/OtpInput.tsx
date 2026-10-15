'use client'
import { useRef } from 'react'

interface OtpInputProps {
    value: string
    onChange: (value: string) => void
    onComplete?: (value: string) => void
    length?: number
    disabled?: boolean
    error?: boolean
    autoFocus?: boolean
}

// One box per digit. Typing moves forward, Backspace moves back,
// arrow keys move between boxes, and pasting a full code fills every box.
export default function OtpInput({
    value,
    onChange,
    onComplete,
    length = 6,
    disabled = false,
    error = false,
    autoFocus = false,
}: OtpInputProps) {
    const refs = useRef<(HTMLInputElement | null)[]>([])
    const digits = Array.from({ length }, (_, i) => value[i] ?? '')

    function focusBox(i: number) {
        const el = refs.current[Math.max(0, Math.min(length - 1, i))]
        el?.focus()
        el?.select()
    }

    function update(next: string) {
        const clean = next.replace(/\D/g, '').slice(0, length)
        onChange(clean)
        if (clean.length === length) onComplete?.(clean)
    }

    function handleChange(i: number, raw: string) {
        const typed = raw.replace(/\D/g, '')
        if (!typed) return
        // Typing over a filled box, or autofill dropping several digits into one box.
        const chars = digits.slice()
        typed.split('').forEach((d, k) => { if (i + k < length) chars[i + k] = d })
        update(chars.join(''))
        focusBox(i + typed.length)
    }

    function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Backspace') {
            e.preventDefault()
            const chars = digits.slice()
            if (chars[i]) {
                chars[i] = ''
                update(chars.join(''))
            } else if (i > 0) {
                chars[i - 1] = ''
                update(chars.join(''))
                focusBox(i - 1)
            }
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            focusBox(i - 1)
        } else if (e.key === 'ArrowRight') {
            e.preventDefault()
            focusBox(i + 1)
        }
    }

    function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
        e.preventDefault()
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
        if (!pasted) return
        update(pasted)
        focusBox(pasted.length)
    }

    return (
        <div className="flex justify-center gap-3" role="group" aria-label="Verification code">
            {digits.map((digit, i) => (
                <input
                    key={i}
                    ref={el => { refs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    aria-label={`Digit ${i + 1}`}
                    maxLength={length}
                    value={digit}
                    disabled={disabled}
                    autoFocus={autoFocus && i === 0}
                    onChange={e => handleChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    onFocus={e => e.target.select()}
                    className={[
                        'h-14 w-14 rounded-lg border bg-(--soft-white-light) text-center text-[24px] font-semibold text-(--neutral-normal) outline-none transition-colors',
                        'focus:border-(--blue-dark-normal) focus:ring-2 focus:ring-(--blue-dark-normal)/20 disabled:opacity-50',
                        error ? 'border-(--error-normal)' : digit ? 'border-(--blue-dark-normal)' : 'border-(--soft-white-normal-hover)',
                    ].join(' ')}
                />
            ))}
        </div>
    )
}
