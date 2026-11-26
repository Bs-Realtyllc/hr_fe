import { NextResponse } from "next/server";
import {
  PLANE_BASE_URL as planeBaseUrl,
  PLANE_WORKSPACE_SLUG as workspaceSlug,
  getPlaneApiKey,
} from "@/config/plane";

// GET /apis/plane/work-item/activities?id=<workItemId>&projectId=<projectId>
// Returns the change/activity history for a single work item — used to
// render the Activity section in TaskCard's detail popup.
export async function GET(request: Request) {
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

  try {
    const res = await fetch(
      `${planeBaseUrl}/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${id}/activities/`,
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

    return NextResponse.json(await res.json());
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
