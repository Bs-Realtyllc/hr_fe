import { NextResponse } from "next/server";
import {
  PLANE_BASE_URL as planeBaseUrl,
  PLANE_WORKSPACE_SLUG as workspaceSlug,
  getPlaneApiKey,
} from "@/config/plane";

// PATCH /apis/plane/work-item?id=<workItemId>&projectId=<projectId>
// Updates a single work item's fields (state, priority, assignees, labels,
// start_date, target_date, description_html) — used for inline editing
// from TaskCard.
export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const projectId = searchParams.get("projectId");

  const apiKey = getPlaneApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing PLANE_API_KEY on server" },
      { status: 500 },
    );
  }

  if (!id || !projectId) {
    return NextResponse.json(
      { error: "Both id and projectId are required" },
      { status: 400 },
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
      `${planeBaseUrl}/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${id}/`,
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

    return NextResponse.json(await res.json());
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
