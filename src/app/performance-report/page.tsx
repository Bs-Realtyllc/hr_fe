"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Circle,
  CircleDashed,
  CircleDot,
  CheckCircle2,
  X,
  ArrowUpDown,
  BarChart as BarChartIcon,
} from "lucide-react";
import { FcCancel } from "react-icons/fc";
import Stats from "./_components/stats";
import CustomInsights from "./_components/customInsight";
import TaskCard from "./_components/taskCard";
import Graph from "./_components/graph";

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

interface PlaneWorkItemsResponse {
  results: PlaneWorkItem[];
  error?: string;
}

const COLUMNS: {
  key: string;
  label: string;
  icon: React.ReactNode;
  headerColor: string;
}[] = [
  {
    key: "backlog",
    label: "Backlog",
    icon: <CircleDashed size={15} className="text-gray-400" />,
    headerColor: "border-gray-300",
  },
  {
    key: "unstarted",
    label: "Todo",
    icon: <Circle size={15} className="text-slate-400" />,
    headerColor: "border-slate-400",
  },
  {
    key: "started",
    label: "In Progress",
    icon: <CircleDot size={15} className="text-yellow-500" />,
    headerColor: "border-yellow-400",
  },
  {
    key: "completed",
    label: "Done",
    icon: <CheckCircle2 size={15} className="text-green-500" />,
    headerColor: "border-green-400",
  },
  {
    key: "cancelled",
    label: "Cancelled",
    icon: <FcCancel size={15} className="text-red-500" />,
    headerColor: "border-green-400",
  },
];


function AnalyticsPanel({
  items,
  open,
  onClose,
}: {
  items: PlaneWorkItem[];
  open: boolean;
  onClose: () => void;
}) {
  const stats = useMemo(() => {
    const total = items.length;
    const byState: Record<string, number> = {};
    for (const item of items) {
      byState[item.state_group] = (byState[item.state_group] ?? 0) + 1;
    }
    return {
      total,
      started: byState.started ?? 0,
      backlog: byState.backlog ?? 0,
      unstarted: byState.unstarted ?? 0,
      completed: byState.completed ?? 0,
    };
  }, [items]);


  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Slide-over panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[52vw] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <BarChartIcon size={18} />
            Analytics
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Summary cards */}
          <Stats stats={stats} />

          {/* Custom Insight chart */}
          <CustomInsights items={items} />

          {/* Created vs Resolved */}
          <Graph items={items} />


        </div>
      </div>
    </>
  );
}

export default function PerformanceReportPage() {
  const [items, setItems] = useState<PlaneWorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortByPriority, setSortByPriority] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/apis/plane", { method: "GET" });
        const data: PlaneWorkItemsResponse = await response.json();
        if (!response.ok) {
          throw new Error(data.error || `Request failed: ${response.status}`);
        }
        setItems(data.results);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const grouped = useMemo(() => {
    const map: Record<string, PlaneWorkItem[]> = {
      backlog: [],
      unstarted: [],
      started: [],
      completed: [],
      cancelled: [],
    };

    for (const item of items) {
      if (map[item.state_group]) {
        map[item.state_group].push(item);
      }
    }

    if (sortByPriority) {
      const order: Record<string, number> = {
        urgent: 0,
        high: 1,
        medium: 2,
        low: 3,
        none: 4,
      };
      for (const key of Object.keys(map)) {
        map[key] = [...map[key]].sort(
          (a, b) => (order[a.priority] ?? 5) - (order[b.priority] ?? 5),
        );
      }
    }

    return map;
  }, [items, sortByPriority]);

  if (loading) {
    return <p className="text-gray-500 p-4">Loading board...</p>;
  }

  if (error) {
    return <p className="text-red-500 p-4">Error: {error}</p>;
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-gray-800">
          Performance Report
        </h2>

        <div className="flex gap-2">
          <button
            onClick={() => setSortByPriority((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border transition ${
              sortByPriority
                ? "bg-gray-800 text-white border-gray-800"
                : "bg-white text-gray-700 border-gray-300"
            }`}
          >
            <ArrowUpDown size={14} />
            Sort by Priority
          </button>

          <button
            onClick={() => setShowAnalytics(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border transition bg-gray-800 text-white border-gray-800"
          >
            <BarChartIcon size={14} />
            Analytics
          </button>
        </div>
      </div>

      <AnalyticsPanel
        items={items}
        open={showAnalytics}
        onClose={() => setShowAnalytics(false)}
      />

      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <div key={col.key} className="flex-1 min-w-[260px]">
            <div
              className={`flex items-center gap-2 px-1 pb-2 mb-2 border-b-2 ${col.headerColor}`}
            >
              {col.icon}
              <span className="text-sm font-medium text-gray-700">
                {col.label}
              </span>
              <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">
                {grouped[col.key]?.length ?? 0}
              </span>
            </div>

            <div className="space-y-2">
              {grouped[col.key]?.map((item) => (
                <TaskCard key={item.id} item={item} COLUMNS={COLUMNS} />
              ))}
              {grouped[col.key]?.length === 0 && (
                <p className="text-xs text-gray-400 px-1">No tasks</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}