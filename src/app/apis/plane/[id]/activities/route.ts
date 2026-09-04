import { NextResponse } from "next/server";

const planeBaseUrl = process.env.PLANE_BASE_URL;
const workspaceSlug = process.env.PLANE_WORKSPACE_SLUG;
const projectId = process.env.PLANE_PROJECT_ID;

// Returns the change/activity history for a single work item — used to
// render the Activity section in TaskCard's detail popup.
export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const apiKey = process.env.PLANE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing PLANE_API_KEY on server" },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(
      `${planeBaseUrl}/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${params.id}/activities/`,
      {
        method: "GET",
        headers: { "X-API-Key": apiKey },
        cache: "no-store",
      },
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Plane API error: ${res.status}`, details: text },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}