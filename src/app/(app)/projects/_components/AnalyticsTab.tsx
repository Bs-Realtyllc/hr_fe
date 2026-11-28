'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { api } from '@/lib/api';
import KpiCard from '@/components/ui/KpiCard';
import { Issue, PRIORITY_LABEL, STATUS_LABEL } from './types';

// This design system's own brand ramps (teal/sand/blue-*) are UI chrome —
// validated against the dataviz skill's palette checker, they fail the
// categorical chroma-floor and lightness-band checks (too dark/desaturated
// for data marks). Series colors below are the skill's pre-validated default
// categorical palette instead, re-checked against this app's own surface
// (#fefefe): all pass CVD separation and lightness/chroma; aqua/yellow sit
// below 3:1 contrast, which is why every chart here keeps its category names
// on the axis/legend rather than relying on color alone.
const SERIES_BLUE = '#2a78d6';
const SERIES_AQUA = '#1baf7a';
// Reserved status color (never reused for arbitrary series identity) — used
// here because "completed" is a genuine status, not a data category.
const STATUS_GOOD = '#0ca30c';

type DimensionKey = 'state' | 'label' | 'assignee' | 'priority' | 'due_date' | 'completion_date';

const DIMENSION_OPTIONS: { key: DimensionKey; label: string }[] = [
  { key: 'state', label: 'Status' },
  { key: 'label', label: 'Label' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'priority', label: 'Priority' },
  { key: 'due_date', label: 'Due Date' },
  { key: 'completion_date', label: 'Completion Date' },
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'No date';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getBuckets(issue: Issue, dimension: DimensionKey): string[] {
  switch (dimension) {
    case 'state': return [STATUS_LABEL[issue.status]];
    case 'label': return issue.labels.length ? issue.labels.map(l => l.name) : ['No label'];
    case 'assignee': return [issue.assignee_name ?? 'Unassigned'];
    case 'priority': return [PRIORITY_LABEL[issue.priority]];
    case 'due_date': return [formatDate(issue.due_date)];
    case 'completion_date': return [formatDate(issue.completed_at)];
    default: return ['Unknown'];
  }
}

const axisTick = { fontSize: 11, fill: 'var(--color-text-muted)' };
const tooltipStyle = { fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)' };

export default function AnalyticsTab({ projectId }: { projectId: number }) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [dimension, setDimension] = useState<DimensionKey>('state');

  useEffect(() => {
    setLoading(true);
    api.get<Issue[]>(`/projects/${projectId}/issues`)
      .then(setIssues)
      .catch(() => setIssues([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {};
    for (const i of issues) byStatus[i.status] = (byStatus[i.status] ?? 0) + 1;
    return {
      total: issues.length,
      backlog: byStatus.backlog ?? 0,
      todo: byStatus.todo ?? 0,
      in_progress: byStatus.in_progress ?? 0,
      done: byStatus.done ?? 0,
    };
  }, [issues]);

  const dimensionData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const issue of issues) {
      for (const bucket of getBuckets(issue, dimension)) {
        counts[bucket] = (counts[bucket] ?? 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [issues, dimension]);

  const createdVsResolved = useMemo(() => {
    if (issues.length === 0) return [];
    const dayKey = (iso: string) => iso.slice(0, 10);
    const createdPerDay = new Map<string, number>();
    const resolvedPerDay = new Map<string, number>();
    for (const i of issues) {
      const k = dayKey(i.created_at);
      createdPerDay.set(k, (createdPerDay.get(k) ?? 0) + 1);
      if (i.completed_at) {
        const rk = dayKey(i.completed_at);
        resolvedPerDay.set(rk, (resolvedPerDay.get(rk) ?? 0) + 1);
      }
    }
    const allDays = [...new Set([...createdPerDay.keys(), ...resolvedPerDay.keys()])].sort();
    let runningCreated = 0;
    let runningResolved = 0;
    return allDays.map((day) => {
      runningCreated += createdPerDay.get(day) ?? 0;
      runningResolved += resolvedPerDay.get(day) ?? 0;
      return { date: formatDate(day), created: runningCreated, resolved: runningResolved };
    });
  }, [issues]);

  const byAssignee = useMemo(() => {
    const counts: Record<string, { completed: number; notCompleted: number }> = {};
    for (const issue of issues) {
      const owner = issue.assignee_name ?? 'Unassigned';
      if (!counts[owner]) counts[owner] = { completed: 0, notCompleted: 0 };
      if (issue.status === 'done') counts[owner].completed += 1;
      else counts[owner].notCompleted += 1;
    }
    return Object.entries(counts)
      .map(([name, c]) => ({ name, ...c }))
      .sort((a, b) => (b.completed + b.notCompleted) - (a.completed + a.notCompleted));
  }, [issues]);

  if (loading) return <p className="text-muted text-sm">Loading analytics…</p>;

  if (issues.length === 0) {
    return (
      <div className="empty-state">
        <p>No issues yet. Analytics will appear once this project has some.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="grid-3">
        <KpiCard label="Total issues" value={stats.total} />
        <KpiCard label="Done" value={stats.done} />
        <KpiCard label="In progress" value={stats.in_progress} />
        <KpiCard label="Backlog" value={stats.backlog} />
        <KpiCard label="Todo" value={stats.todo} />
        <KpiCard label="Completion rate" value={`${stats.total ? Math.round((stats.done / stats.total) * 100) : 0}%`} />
      </div>

      <div className="card">
        <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Breakdown</div>
          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={dimension}
            onChange={(e) => setDimension(e.target.value as DimensionKey)}
          >
            {DIMENSION_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
        {dimensionData.length === 0 ? (
          <p className="text-muted text-sm">No data for this dimension</p>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={dimensionData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="name" tick={axisTick} interval={0} angle={-25} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tick={axisTick} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill={SERIES_BLUE} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <div className="card-title">Created vs Resolved</div>
        {createdVsResolved.length === 0 ? (
          <p className="text-muted text-sm">No data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={createdVsResolved} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={axisTick} />
              <YAxis allowDecimals={false} tick={axisTick} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="created" name="Created" stroke={SERIES_BLUE} fill={SERIES_BLUE} fillOpacity={0.15} strokeWidth={2} />
              <Area type="monotone" dataKey="resolved" name="Resolved" stroke={SERIES_AQUA} fill={SERIES_AQUA} fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <div className="card-title">Assignee workload</div>
        {byAssignee.length === 0 ? (
          <p className="text-muted text-sm">No work items to show</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={byAssignee} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="name" tick={axisTick} interval={0} angle={-25} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tick={axisTick} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="completed" name="Completed" stackId="a" fill={STATUS_GOOD} />
              <Bar dataKey="notCompleted" name="Not completed" stackId="a" fill={SERIES_BLUE} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
