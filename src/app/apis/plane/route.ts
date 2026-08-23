import { NextResponse } from "next/server";

const PLANE_BASE_URL = process.env.PLANE_API_URL;
const WORKSPACE_SLUG = "bsrealty";
const PROJECT_ID = process.env.PLANE_PROJECT_ID;

export async function GET() {
  const apiKey = process.env.PLANE_API_KEY; // server-only, no NEXT_PUBLIC_ prefix

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing PLANE_API_KEY on server" },
      { status: 500 },
    );
  }

  const url = `${PLANE_BASE_URL}/workspaces/${WORKSPACE_SLUG}/projects/${PROJECT_ID}/work-items/`;

  const planeRes = await fetch(url, {
    method: "GET",
    headers: {
      "X-API-Key": apiKey,
    },
    cache: "no-store",
  });

  if (!planeRes.ok) {
    const text = await planeRes.text();
    return NextResponse.json(
      { error: `Plane API error: ${planeRes.status}`, details: text },
      { status: planeRes.status },
    );
  }

  const data = await planeRes.json();
  return NextResponse.json(data);
}