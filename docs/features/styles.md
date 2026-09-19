/* ── Button styles ── */
.btn-primary,
.btn-secondary,
.btn-text {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  border-radius: var(--radius-lg);
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.btn-primary,
.btn-secondary,
.btn-text {
  padding: var(--spacing-lg);
  height: var(--spacing-lg);
}

.btn-primary {
  background: var(--color-primary);
  color: #FEFEFE;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}
.btn-primary:focus-visible {
  background: var(--color-primary);
  border-color: var(--color-primary-focus-border);
  outline: none;
}
.btn-primary:disabled {
  background: var(--color-primary-disabled);
  cursor: not-allowed;
}

.btn-secondary {
  background: #FEFEFE;
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-primary-hover);
  border-color: transparent;
}
.btn-secondary:focus-visible {
  background: var(--color-primary);
  border-color: var(--color-primary-focus-border);
  outline: none;
}
.btn-secondary:disabled {
  background: var(--color-primary-disabled);
  border-color: transparent;
  cursor: not-allowed;
}

.btn-text {
  background: transparent;
  color: var(--color-primary);
  border-radius: var(--radius-md);
}

.btn-text.btn-sm {
  padding: var(--spacing-sm);
}

.btn-text:hover:not(:disabled),
.btn-text:focus-visible {
  background: #FEFEFE;
  border-color: var(--color-primary);
  border-radius: var(--radius-lg);
}

.btn-text.btn-xs:hover:not(:disabled),
.btn-text.btn-xs:focus-visible {
  border-radius: var(--radius-md);
}

.btn-text.btn-sm:hover:not(:disabled),
.btn-text.btn-sm:focus-visible {
  padding: var(--spacing-sm) var(--spacing-md);
}

.btn-text:focus-visible {
  border-color: var(--color-primary-focus-border);
  outline: none;
}

.btn-text:disabled {
  color: var(--color-primary-disabled);
  cursor: not-allowed;
}

.btn-text.btn-danger {
  color: var(--color-error);
}

.btn-text.btn-danger:hover:not(:disabled),
.btn-text.btn-danger:focus-visible {
  background: #FEFEFE;
  border-color: var(--color-error);
}

.btn-secondary.btn-danger {
  color: var(--color-error);
  border-color: var(--color-error);
}

.btn-secondary.btn-danger:hover:not(:disabled),
.btn-secondary.btn-danger:focus-visible {
  background: var(--color-error);
  border-color: var(--color-error);
}

/* ── Divider ── */
.divider {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 20px 0;
}
