"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  Circle,
  CircleDashed,
  CircleDot,
  CheckCircle2,
  X,
  ArrowUpDown,
  BarChart as BarChartIcon,
  Search,
} from "lucide-react";
import { FcCancel } from "react-icons/fc";
import { CgAdd } from "react-icons/cg";
import Popup from "reactjs-popup";
import AddWorkItem from "../_components/addWorkItem";
import Stats from "../_components/stats";
import CustomInsights from "../_components/cutsomInsight";
import Graph from "../_components/graph";
import TaskCard from "../_components/taskCard";
import { BarComponent, AreaComponent } from "../_components/adminAnalytics";

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

interface PlaneWorkItemsResponse {
  members: any;
  states: any;
  labels: any;
  results: PlaneWorkItem[];
  error?: string;
}
// interface PlaneMeResponse {
//   me: UserType;
//   error?: string;
// }


interface StatesType {
  id: string;
  group: string;
  name: string;
}
interface MembersType {
  avatar_url: string;
  email: string;
  id: string;
  name: string;
  role: number;
}
interface LabelsType {
  id: string;
  created_at: Date;
  created_by: Date;
  created_by_name: string;
  name: string;
  description: string;
  color: string;
  updated_at: Date;
  updated_by_name: string;
}

interface UserType {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: number;
  avatar: string;
  display_name: string;
  avatar_url: string;
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

// 5 = Guest, 15 = Member, 20 = Admin (Plane's numeric role scale)
const ROLE_LABELS: Record<number, { label: string; className: string }> = {
  15: { label: "Admin", className: "bg-purple-100 text-purple-700" },
  20: { label: "Member", className: "bg-blue-100 text-blue-700" },
  5: { label: "Guest", className: "bg-gray-100 text-gray-600" },
};

function AnalyticsPanel({
  items,
  open,
  user,
  onClose,
}: {
  items: PlaneWorkItem[];
  open: boolean;
  user: UserType;
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
          <div className="flex items-center gap-4 my-4">
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Admin Analytics
            </span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>
          {ROLE_LABELS[user.role].label === "Admin" && (
            <>
              <BarComponent items={items} />
              <AreaComponent items={items} />
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function ProjectpageClient() {
  const { p_id } = useParams<{ p_id: string }>();

  const [items, setItems] = useState<PlaneWorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortByPriority, setSortByPriority] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [members, setMembers] = useState<MembersType[]>([]);
  const [states, setStates] = useState<StatesType[]>([]);
  const [labels, setLabels] = useState<LabelsType[]>([]);
  const [user, setUser] = useState<UserType>();

  const fetchData = async () => {
    try {
      const userRes = await fetch("/apis/plane/me", { method: "GET" });
      const { me } = await userRes.json();

      setUser(me);
      const response = await fetch(
        `/apis/plane/work-items?projectId=${encodeURIComponent(p_id)}`,
        { method: "GET" },
      );
      const data: PlaneWorkItemsResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Request failed: ${response.status}`);
      }
      setItems(data.results);
      setMembers(data.members);
      setStates(data.states);
      setLabels(data.labels);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
    <div className="">
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>Performance Report</h1>
            <p>View performance</p>
          </div>
          <div className="flex gap-2">
            {/* Sort By priority */}
            <button
              onClick={() => setSortByPriority((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border transition ${
                sortByPriority
                  ? "bg-(--teal-dark) text-white border-(--teal-dark)"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              <ArrowUpDown size={14} />
              Sort by Priority
            </button>
            {/* Analytics */}
            <button
              onClick={() => setShowAnalytics(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border transition bg-(--teal-normal) text-white"
            >
              <BarChartIcon size={14} />
              Analytics
            </button>
            {/* Add work item */}
            <Popup
              trigger={(open) => (
                <button
                  // onClick={() => setShowAnalytics(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border transition bg-(--teal-normal) text-white"
                >
                  <CgAdd size={14} />
                  Add work item
                </button>
              )}
              closeOnDocumentClick
              modal
              overlayStyle={{ background: "rgba(15, 15, 15, 0.5)" }}
              contentStyle={{
                background: "transparent",
                border: "none",
                width: "auto",
              }}
            >
              {
                // @ts-expect-error reactjs-popup children-as-function typing
                (close: () => void) => (
                  <AddWorkItem
                    p_id={p_id}
                    onClose={close}
                    members={members}
                    labels={labels}
                    states={states}
                    onCreated={fetchData}
                  />
                )
              }
            </Popup>
          </div>
          <div className="flex justify-between ml-2 items-center">
            <Popup
              trigger={
                <button className="focus:outline-none">
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.display_name ?? "User"}
                      className="w-9 h-9 rounded-full object-cover border border-gray-200 cursor-pointer hover:border-(--teal-normal) transition"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-(--teal-normal) text-white flex items-center justify-center font-semibold text-sm cursor-pointer">
                      {user?.first_name?.[0] || user?.display_name?.[0] || "U"}
                    </div>
                  )}
                </button>
              }
              position="bottom right"
              closeOnDocumentClick
              arrow={false}
              contentStyle={{
                background: "transparent",
                border: "none",
                padding: 0,
                marginTop: "8px",
                width: "auto",
              }}
            >
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-56">
                <div className="flex items-center gap-3 mb-3">
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.display_name ?? "User"}
                      className="w-10 h-10 rounded-full object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-(--teal-normal) text-white flex items-center justify-center font-semibold text-sm">
                      {user?.first_name?.[0] || user?.display_name?.[0] || "U"}
                    </div>
                  )}
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-sm font-medium text-gray-900 leading-tight truncate">
                      {user?.first_name} {user?.last_name}
                    </span>
                    <span className="text-xs text-gray-500 leading-tight truncate">
                      {user?.email}
                    </span>
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Role</span>
                  {user?.role != null ? (
                    <span
                      className={`text-xs font-medium p-2 rounded-xl ${ROLE_LABELS[user.role].className}`}
                    >
                      {ROLE_LABELS[user.role].label ?? "Unknown"}
                    </span>
                  ) : (
                    "-"
                  )}
                </div>
              </div>
            </Popup>
          </div>
        </div>
      </div>

      {user && (
        <AnalyticsPanel
          items={items}
          user={user}
          open={showAnalytics}
          onClose={() => setShowAnalytics(false)}
        />
      )}

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
                // <TaskCard key={item.id} item={item} COLUMNS={COLUMNS} />
                <TaskCard
                  p_id={p_id}
                  key={item.id}
                  item={item}
                  COLUMNS={COLUMNS}
                  states={states}
                  members={members}
                  labels={labels}
                  onUpdated={fetchData}
                />
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
