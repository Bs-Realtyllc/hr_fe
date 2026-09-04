import { NextRequest, NextResponse } from "next/server";

const planeBaseUrl = process.env.PLANE_BASE_URL;
const workspaceSlug = process.env.PLANE_WORKSPACE_SLUG;
// const projectId = process.env.PLANE_PROJECT_ID;

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  // console.log('planeID', projectId)

  const apiKey = process.env.PLANE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing PLANE_API_KEY on server" },
      { status: 500 },
    );
  }

  if (!projectId) {
    return NextResponse.json({ error: "Invalid Project-Id" }, { status: 400 });
  }

  try {
    // Fetch work items, project states, workspace members, and labels in parallel
    const [workItemsRes, statesRes, membersRes, labelsRes] = await Promise.all([
      planeFetch(
        `/workspaces/${workspaceSlug}/projects/${projectId}/work-items/`,
        apiKey,
      ),
      planeFetch(
        `/workspaces/${workspaceSlug}/projects/${projectId}/states/`,
        apiKey,
      ),
      planeFetch(`/workspaces/${workspaceSlug}/members/`, apiKey),
      planeFetch(
        `/workspaces/${workspaceSlug}/projects/${projectId}/labels/`,
        apiKey,
      ),
    ]);

    // Build lookup maps: id -> name
    const stateMap = new Map<string, { name: string; group: string }>();
    const stateList = statesRes.results ?? statesRes; // handle paginated or plain array
    for (const s of stateList) {
      stateMap.set(s.id, { name: s.name, group: s.group });
    }

    const memberMap = new Map<string, string>();
    const memberList = membersRes.results ?? membersRes;
    for (const m of memberList) {
      const name =
        m.display_name ||
        `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() ||
        m.email;
      memberMap.set(m.id ?? m.member_id, name);
    }

    const labelMap = new Map<string, string>();
    const labelList = labelsRes.results ?? labelsRes;
    for (const l of labelList) {
      labelMap.set(l.id, l.name);
    }

    // Attach resolved names to each work item
    const enrichedItems = (workItemsRes.results ?? []).map((item: any) => ({
      // ...item,
      id: item.id,
      name: item.name,
      description_html: item.description_html,
      priority: item.priority,
      target_date: item.target_date,
      start_date: item.start_date,
      created_at: item.created_at,
      completed_at:item.completed_at,
      sequence_id: item.sequence_id,
      state: item.state,
      assignees: item.assignees,
      labels: item.labels,
      state_name: stateMap.get(item.state)?.name ?? "Unknown",
      state_group: stateMap.get(item.state)?.group ?? "unknown",
      created_by_name: memberMap.get(item.created_by) ?? "Unknown",
      updated_by_name: memberMap.get(item.updated_by) ?? "Unknown",
      assignee_names: (item.assignees ?? []).map(
        (id: string) => memberMap.get(id) ?? "Unknown",
      ),
      label_names: (item.labels ?? []).map(
        (id: string) => labelMap.get(id) ?? "Unknown",
      ),
    }));

    // return NextResponse.json({membersRes})
    // Raw id/name lists — needed by the "Add work item" form dropdowns,
    // since the enriched work items above only carry resolved *names*,
    // not the id -> name pairs a <select> needs.
    return NextResponse.json({
      results: enrichedItems,
      states: stateList.map((s: any) => ({
        id: s.id,
        name: s.name,
        group: s.group,
      })),
      members: memberList.map((m: any) => ({
        id: m.id ?? m.member_id,
        name:
          m.display_name ||
          `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() ||
          m.email,
        role: m.role,
        email: m.email,
        avatar_url: m.avatar_url,
      })),
      labels: labelList.map((l: any) => ({
        id: l.id,
        created_at: l.created_at,
        created_by: l.created_by,
        created_by_name: memberMap.get(l.created_by) ?? "Unknown",
        name: l.name,
        description: l.description,
        color: l.color,
        updated_at: l.updated_at,
        updated_by_name: memberMap.get(l.updated_by) ?? "Unknown",
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

// Creates a new work item in Plane. Expects a JSON body with at minimum
// `name`; other fields (description_html, priority, state, assignees,
// labels, start_date, target_date) are optional and passed straight
// through to Plane's API.

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  const apiKey = process.env.PLANE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing PLANE_API_KEY on server" },
      { status: 500 },
    );
  }
  // return NextResponse.json({id: projectId})

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json(
      { error: "A work item name/title is required" },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(
      `${planeBaseUrl}/workspaces/${workspaceSlug}/projects/${projectId}/work-items/`,
      {
        method: "POST",
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

    const created = await res.json();
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
