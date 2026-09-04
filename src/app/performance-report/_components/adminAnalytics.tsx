"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from "recharts";

interface PlaneWorkItem {
  id: string;
  name: string;
  description_html: string | null;
  priority: string;
  target_date: string | null;
  start_date: string | null;
  created_at: string;
  completed_at: string | null;
  sequence_id: number;
  state: string;
  assignees: string[];
  labels: string[];
  state_name: string;
  state_group: string; // "backlog" | "unstarted" | "started" | "completed" | "cancelled"
  created_by_name: string;
  updated_by_name: string;
  assignee_names: string[];
  label_names: string[];
}
interface PlaneWorkItemsType {
  items: PlaneWorkItem[];
}

const BarComponent = ({ items }: PlaneWorkItemsType) => {
  const chartData = useMemo(() => {
    const counts: Record<string, { completed: number; nonCompleted: number }> =
      {};

    for (const item of items) {
      const isCompleted = item.state_group === "completed";
      const owners = item.assignee_names.length
        ? item.assignee_names
        : ["Unassigned"];

      for (const owner of owners) {
        if (!counts[owner]) {
          counts[owner] = { completed: 0, nonCompleted: 0 };
        }
        if (isCompleted) {
          counts[owner].completed += 1;
        } else {
          counts[owner].nonCompleted += 1;
        }
      }
    }

    return Object.entries(counts)
      .map(([name, { completed, nonCompleted }]) => ({
        name,
        completed,
        nonCompleted,
        total: completed + nonCompleted,
      }))
      .sort((a, b) => b.total - a.total);
  }, [items]);

  if (chartData.length === 0) {
    return <p className="text-sm text-gray-400">No work items to show</p>;
  }

  return (
    <>
      <p className="text-sm font-semibold text-gray-800 mb-4">
       Assignee vs no. of Tasks
      </p>
      <ResponsiveContainer width="100%" height={360}>
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 18, left: 18, bottom: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#f1f5f9"
          />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={70}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            label={{
              value: "No. of work items",
              angle: -90,
              position: "insideLeft",
              fontSize: 11,
              fill: "#6b7280",
            }}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            dataKey="completed"
            name="Completed"
            stackId="tasks"
            fill="#22c55e"
            radius={[0, 0, 0, 0]}
            barSize={32}
          />
          <Bar
            dataKey="nonCompleted"
            name="Not completed"
            stackId="tasks"
            fill="#f97316"
            radius={[4, 4, 0, 0]}
            barSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </>
  );
};

const ALL_USERS = "__all__";

// Format a date string down to a YYYY-MM-DD bucket key
function toDateKey(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

// Nicely formatted label for the x-axis / tooltip
function formatDateLabel(dateKey: string): string {
  return new Date(dateKey).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

const AreaComponent = ({items}: PlaneWorkItemsType) => {
  const [selectedUser, setSelectedUser] = useState<string>(ALL_USERS);

  // Build the list of selectable users from assignee names across all items
  const users = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      item.assignee_names?.forEach((name) => {
        if (name) set.add(name);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  // Items relevant to the selected user (or all items if "All users" is picked)
  const filteredItems = useMemo(() => {
    if (selectedUser === ALL_USERS) return items;
    return items.filter((item) => item.assignee_names?.includes(selectedUser));
  }, [items, selectedUser]);

  // Bucket into { date, created, resolved } rows, sorted chronologically
  // Bucket into { date, created, resolved } per-day counts, then convert
  // to running cumulative totals so each date shows the total created/
  // resolved up to and including that date.
  const createdVsResolved = useMemo(() => {
    const buckets = new Map<string, { created: number; resolved: number }>();

    filteredItems.forEach((item) => {
      if (item.created_at) {
        const key = toDateKey(item.created_at);
        const bucket = buckets.get(key) ?? { created: 0, resolved: 0 };
        bucket.created += 1;
        buckets.set(key, bucket);
      }

      if (item.completed_at) {
        const key = toDateKey(item.completed_at);
        const bucket = buckets.get(key) ?? { created: 0, resolved: 0 };
        bucket.resolved += 1;
        buckets.set(key, bucket);
      }
    });

    const sortedEntries = Array.from(buckets.entries()).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    );

    let runningCreated = 0;
    let runningResolved = 0;

    return sortedEntries.map(([dateKey, counts]) => {
      runningCreated += counts.created;
      runningResolved += counts.resolved;
      return {
        date: formatDateLabel(dateKey),
        created: runningCreated,
        resolved: runningResolved,
      };
    });
  }, [filteredItems]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Created vs Resolved
        </h2>

        <label className="flex items-center gap-2 text-sm">
          <span className="font-medium text-slate-600">User</span>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value={ALL_USERS}>All users</option>
            {users.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {createdVsResolved.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-slate-400">
          No work items to display.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={createdVsResolved}
            margin={{ top: 8, right: 18, left: 18, bottom: 8 }}
          >
            <defs>
              <linearGradient id="createdGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="resolvedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              interval="preserveStartEnd"
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              label={{
                value: "No. of work items",
                angle: -90,
                position: "insideLeft",
                fontSize: 11,
                fill: "#6b7280",
              }}
            />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="created"
              name="Created"
              stroke="#6366f1"
              fill="url(#createdGradient)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="resolved"
              name="Resolved"
              stroke="#22c55e"
              fill="url(#resolvedGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export { BarComponent, AreaComponent };
