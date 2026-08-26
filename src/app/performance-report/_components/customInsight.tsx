import { useState, useMemo } from "react";
import {
  Bar,
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";

type DimensionKey =
  | "state"
  | "label"
  | "assignee"
  | "start_date"
  | "priority"
  | "due_date"
  | "completion_date";

interface PlaneWorkItem {
  id: string;
  name: string;
  description_stripped: string | null;
  priority: string;
  target_date: string | null;
  start_date: string | null;
  created_at: string;
  completed_at: string | null;
  sequence_id: number;
  state_name: string;
  state_group: string; // "backlog" | "unstarted" | "started" | "completed" | "cancelled"
  created_by_name: string;
  assignee_names: string[];
  label_names: string[];
}
interface PlaneWorkItemsType{
    items: PlaneWorkItem[]
}

const CustomInsights = ({items}: PlaneWorkItemsType) => {
  const [dimension, setDimension] = useState<DimensionKey>("state");

  const DIMENSION_OPTIONS: { key: DimensionKey; label: string }[] = [
    { key: "state", label: "State" },
    { key: "label", label: "Label" },
    { key: "assignee", label: "Assignee" },
    { key: "start_date", label: "Start Date" },
    { key: "priority", label: "Priority" },
    { key: "due_date", label: "Due Date" },
    { key: "completion_date", label: "Completion Date" },
  ];

  const CHART_COLORS = [
    "#6366f1", // indigo
    "#f97316", // orange
    "#22c55e", // green
    "#eab308", // yellow
    "#ef4444", // red
    "#3b82f6", // blue
    "#a855f7", // purple
    "#14b8a6", // teal
    "#ec4899", // pink
    "#84cc16", // lime
  ];

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      for (const bucket of getBuckets(item, dimension)) {
        counts[bucket] = (counts[bucket] ?? 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [items, dimension]);

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  // Returns the bucket label(s) an item belongs to for a given dimension.
  // Most dimensions map to a single bucket; label/assignee can map to several.
  function getBuckets(item: PlaneWorkItem, dimension: DimensionKey): string[] {
    switch (dimension) {
      case "state":
        return [item.state_name || "Unknown"];
      case "label":
        return item.label_names.length ? item.label_names : ["No label"];
      case "assignee":
        return item.assignee_names.length
          ? item.assignee_names
          : ["Unassigned"];
      case "priority":
        return [item.priority || "none"];
      case "start_date":
        return [formatDate(item.start_date)];
      case "due_date":
        return [formatDate(item.target_date)];
      case "completion_date":
        return [formatDate(item.completed_at)];
      default:
        return ["Unknown"];
    }
  }

  return (
    <>
      {" "}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-gray-800">Custom Insight</p>
          <select
            value={dimension}
            onChange={(e) => setDimension(e.target.value as DimensionKey)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-700 bg-white"
          >
            {DIMENSION_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {chartData.length === 0 ? (
          <p className="text-xs text-gray-400">No data for this dimension</p>
        ) : (
          <ResponsiveContainer width="100%" height={420}>
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
              <Bar dataKey="count" barSize={100} radius={[4, 4, 0, 0]}>
                {chartData.map((_, index) => (
                  <Cell
                    key={index}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </>
  );
};

export default CustomInsights;