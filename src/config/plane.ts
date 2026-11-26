// Server-only Plane configuration — used by src/app/apis/plane/* route
// handlers and build-time generateStaticParams. These variables are NOT
// prefixed with NEXT_PUBLIC_, so they are never inlined into browser
// bundles; never import this file from a client component.

export const PLANE_BASE_URL = process.env.PLANE_BASE_URL;
export const PLANE_WORKSPACE_SLUG = process.env.PLANE_WORKSPACE_SLUG;

/** Read per request so a missing key is reported, not baked in. */
export function getPlaneApiKey(): string | undefined {
  return process.env.PLANE_API_KEY;
}
