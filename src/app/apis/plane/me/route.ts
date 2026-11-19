import { NextResponse } from "next/server";

const planeBaseUrl = process.env.PLANE_BASE_URL;
const workspaceSlug = process.env.PLANE_WORKSPACE_SLUG;

async function planeFetch(path: string, apiKey: string) {
  const res = await fetch(`${planeBaseUrl}${path}`, {
    method: "GET",
    headers: { "X-API-Key": apiKey },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Plane API error on ${path}: ${res.status}`);
  }
  return res.json();
}

export async function GET() {
  const apiKey = process.env.PLANE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing PLANE_API_KEY on server" },
      { status: 500 },
    );
  }

  try {
    // Fetch work items, project states, workspace members, and labels in parallel
    const [me, members] = await Promise.all([
      planeFetch(`/users/me`, apiKey),
      planeFetch(`/workspaces/${workspaceSlug}/members/`, apiKey),
    ]);
    const memberList = members.results ?? members;
    const role = memberList.find((m: any) => (m.id ?? m.member_id) === me.id)?.role;

    return NextResponse.json({ me: { ...me, role } });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
