import { NextResponse } from "next/server";

const PLANE_BASE_URL = "https://plane.bsrealtyllc.com/api/v1";
const WORKSPACE_SLUG = "bsrealty";
const PROJECT_ID = "be04982d-a396-48a1-aed1-7b399da91cc9";

async function planeFetch(path: string, apiKey: string) {
  const res = await fetch(`${PLANE_BASE_URL}${path}`, {
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
    const [workItemsRes, statesRes, membersRes, labelsRes] = await Promise.all([
      planeFetch(
        `/workspaces/${WORKSPACE_SLUG}/projects/${PROJECT_ID}/work-items/`,
        apiKey,
      ),
      planeFetch(
        `/workspaces/${WORKSPACE_SLUG}/projects/${PROJECT_ID}/states/`,
        apiKey,
      ),
      planeFetch(`/workspaces/${WORKSPACE_SLUG}/members/`, apiKey),
      planeFetch(
        `/workspaces/${WORKSPACE_SLUG}/projects/${PROJECT_ID}/labels/`,
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
        m.display_name || `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || m.email;
      memberMap.set(m.id ?? m.member_id, name);
    }

    const labelMap = new Map<string, string>();
    const labelList = labelsRes.results ?? labelsRes;
    for (const l of labelList) {
      labelMap.set(l.id, l.name);
    }

    // Attach resolved names to each work item
    const enrichedItems = (workItemsRes.results ?? []).map((item: any) => ({
      ...item,
      state_name: stateMap.get(item.state)?.name ?? "Unknown",
      state_group: stateMap.get(item.state)?.group ?? "unknown",
      created_by_name: memberMap.get(item.created_by) ?? "Unknown",
      assignee_names: (item.assignees ?? []).map(
        (id: string) => memberMap.get(id) ?? "Unknown",
      ),
      label_names: (item.labels ?? []).map(
        (id: string) => labelMap.get(id) ?? "Unknown",
      ),
    }));

    return NextResponse.json({ results: enrichedItems });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}