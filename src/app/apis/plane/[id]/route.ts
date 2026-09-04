import { NextResponse } from "next/server";

const planeBaseUrl = process.env.PLANE_BASE_URL;
const workspaceSlug = process.env.PLANE_WORKSPACE_SLUG;
// const projectId = process.env.PLANE_PROJECT_ID;

// Updates a single work item's fields (state, priority, assignees, labels,
// start_date, target_date, etc.) — used for inline editing from TaskCard.
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  const apiKey = process.env.PLANE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing PLANE_API_KEY on server" },
      { status: 500 },
    );
  }


  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${planeBaseUrl}/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${params.id}/`,
      {
        method: "PATCH",
        headers: {
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Plane API error: ${res.status}`, details: text },
        { status: res.status },
      );
    }

    const updated = await res.json();
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
