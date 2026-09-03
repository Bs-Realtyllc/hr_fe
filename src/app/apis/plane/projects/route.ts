import { NextResponse } from "next/server";

const planeBaseUrl = process.env.PLANE_BASE_URL;
const workspaceSlug = process.env.PLANE_WORKSPACE_SLUG;
// const projectId = process.env.PLANE_PROJECT_ID;

export async function GET() {
  const apiKey = process.env.PLANE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing PLANE_API_KEY on server" },
      { status: 500 },
    );
  }
  try {
    const projects = await (
      await fetch(`${planeBaseUrl}/workspaces/${workspaceSlug}/projects`, {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
        },
      })
    ).json();

    const cleanedProjects = projects.results.map((item: any) => ({
      id: String(item.id ?? ""),
      total_members: String(item.total_members ?? "0"),
      is_member: Boolean(item.is_member),
      member_role: Number(item.member_role ?? 0),
      is_deployed: Boolean(item.is_deployed),
      cover_image_url: String(item.cover_image_url ?? ""),
      created_at: new Date(item.created_at),
      updated_at: new Date(item.updated_at),
      name: String(item.name ?? ""),
      description: String(item.description ?? ""),
      identifier: String(item.identifier ?? ""),
      emoji: String(item.emoji ?? ""),
      created_by: String(item.created_by ?? ""),
      updated_by: String(item.updated_by ?? ""),
    }));

    return NextResponse.json({ projects: cleanedProjects });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
