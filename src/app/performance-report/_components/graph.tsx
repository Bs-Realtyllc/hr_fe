import { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
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
  labels:string[];
  state_name: string;
  state_group: string; // "backlog" | "unstarted" | "started" | "completed" | "cancelled"
  created_by_name: string;
  updated_by_name:string;
  assignee_names: string[];
  label_names: string[];
}
interface PlaneWorkItemsType {
  items: PlaneWorkItem[];
}

const Graph = ({ items }: PlaneWorkItemsType) => {
  function buildCreatedVsResolved(items: PlaneWorkItem[]) {
    if (items.length === 0) return [];

    const dayKey = (d: Date) => d.toISOString().slice(0, 10); // YYYY-MM-DD

    const createdDates = items.map((i) => new Date(i.created_at));
    const completedDates = items
      .filter((i) => i.completed_at)
      .map((i) => new Date(i.completed_at as string));

    const allDates = [...createdDates, ...completedDates];
    const minTime = Math.min(...allDates.map((d) => d.getTime()));
    const maxTime = Math.max(...allDates.map((d) => d.getTime()));

    const start = new Date(minTime);
    start.setHours(0, 0, 0, 0);
    const end = new Date(maxTime);
    end.setHours(0, 0, 0, 0);

    // Pre-bucket exact counts per day
    const createdPerDay = new Map<string, number>();
    for (const d of createdDates) {
      const key = dayKey(d);
      createdPerDay.set(key, (createdPerDay.get(key) ?? 0) + 1);
    }
    const completedPerDay = new Map<string, number>();
    for (const d of completedDates) {
      const key = dayKey(d);
      completedPerDay.set(key, (completedPerDay.get(key) ?? 0) + 1);
    }

    // Only keep a point when the cumulative created/resolved count actually
    // changes from the previous day — flat/unchanged days are skipped so the
    // x-axis only shows dates where something happened.
    const series: { date: string; created: number; resolved: number }[] = [];
    let cumulativeCreated = 0;
    let cumulativeResolved = 0;
    let lastCreated: number | null = null;
    let lastResolved: number | null = null;

    for (
      let cur = new Date(start);
      cur.getTime() <= end.getTime();
      cur.setDate(cur.getDate() + 1)
    ) {
      const key = dayKey(cur);
      cumulativeCreated += createdPerDay.get(key) ?? 0;
      cumulativeResolved += completedPerDay.get(key) ?? 0;

      const changed =
        cumulativeCreated !== lastCreated || cumulativeResolved !== lastResolved;

      if (changed) {
        series.push({
          date: cur.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          created: cumulativeCreated,
          resolved: cumulativeResolved,
        });
        lastCreated = cumulativeCreated;
        lastResolved = cumulativeResolved;
      }
    }

    return series;
  }

  const createdVsResolved = useMemo(() => buildCreatedVsResolved(items), [items]);

  return (
    <div>
      <p className="text-sm font-semibold text-gray-800 mb-4">
        Created vs Resolved
      </p>

      {createdVsResolved.length === 0 ? (
        <p className="text-xs text-gray-400">No data available</p>
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

export default Graph;