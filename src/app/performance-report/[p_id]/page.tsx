import ProjectpageClient from './ProjectpageClient';

export async function generateStaticParams() {
  const planeBaseUrl = process.env.PLANE_BASE_URL;
  const workspaceSlug = process.env.PLANE_WORKSPACE_SLUG;
  const apiKey = process.env.PLANE_API_KEY;

  if (!planeBaseUrl || !workspaceSlug || !apiKey) return [];

  try {
    const res = await fetch(`${planeBaseUrl}/workspaces/${workspaceSlug}/projects`, {
      headers: { 'x-api-key': apiKey },
    });
    if (!res.ok) return [{ p_id: '0' }];
    const data = await res.json();
    const results = data.results as { id: string }[];
    return results.length > 0 ? results.map(p => ({ p_id: p.id })) : [{ p_id: '0' }];
  } catch {
    return [{ p_id: '0' }];
  }
}

export default function Page() {
  return <ProjectpageClient />;
}
