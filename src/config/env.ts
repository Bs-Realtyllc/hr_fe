// Single source of truth for public (browser-visible) configuration.
// Nothing outside src/config should read process.env directly.
//
// NEXT_PUBLIC_* values are inlined at build time, and only when accessed
// literally as `process.env.NEXT_PUBLIC_X` — keep these reads literal.

const DEFAULT_API_URL = 'http://localhost:6002/api';

/** Backend REST base, including the `/api` suffix, e.g. https://hr.example.com/api */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');

/**
 * Backend origin without the `/api` suffix, e.g. https://hr.example.com.
 * Used for uploaded-file URLs (/uploads/...) and the inbox websocket.
 * Only a trailing `/api` is stripped, so hosts like api.example.com are safe.
 */
export const BACKEND_URL = API_URL.replace(/\/api$/, '');

/** External learning-platform link shown in the sidebar; empty hides it. */
export const LEARNING_URL = process.env.NEXT_PUBLIC_LEARNING_URL ?? '';
