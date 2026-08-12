'use client';
import { useState, InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

/**
 * Text input matching the Figma "Text Field" component (Job Portal design,
 * node 38:874): idle / hover / focus / disabled / filled / error states,
 * with a password visibility toggle and an error indicator icon.
 */
export default function Input({ error, type = 'text', className, ...rest }: InputProps) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && revealed ? 'text' : type;

  return (
    <div>
      <div className={`form-field ${error ? 'form-field-error' : ''}`}>
        <input
          {...rest}
          type={inputType}
          className={`form-input ${error ? 'form-input-error' : ''} ${className ?? ''}`}
        />
        {(isPassword || error) && (
          <div className="form-field-icons">
            {isPassword && (
              <button
                type="button"
                onClick={() => setRevealed(v => !v)}
                aria-label={revealed ? 'Hide password' : 'Show password'}
              >
                <span
                  className="icon-mask"
                  style={{
                    WebkitMaskImage: `url(/icons/${revealed ? 'eye-off.svg' : 'eye.svg'})`,
                    maskImage: `url(/icons/${revealed ? 'eye-off.svg' : 'eye.svg'})`,
                  }}
                />
              </button>
            )}
            {error && (
              <span
                className="icon-mask"
                style={{ WebkitMaskImage: 'url(/icons/alert-circle.svg)', maskImage: 'url(/icons/alert-circle.svg)' }}
              />
            )}
          </div>
        )}
      </div>
      {error && <p className="form-error-text">{error}</p>}
    </div>
  );
}
