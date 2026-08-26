import Popup from "reactjs-popup";
import {
  Calendar,
  Flame,
  SignalHigh,
  SignalMedium,
  SignalLow,
  Minus,
  User,
  X,
} from "lucide-react";

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
interface COLUMNSType {
  key: string;
  label: string;
  icon: React.ReactNode;
  headerColor: string;
}

interface taskCardProps {
  item: PlaneWorkItem;
  COLUMNS: COLUMNSType[];
}

function TaskCard({ item, COLUMNS }: taskCardProps) {
  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  function initials(name: string) {
    return name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  const PRIORITY_ICON: Record<string, React.ReactNode> = {
    urgent: <Flame size={13} className="text-red-500" />,
    high: <SignalHigh size={13} className="text-orange-500" />,
    medium: <SignalMedium size={13} className="text-yellow-500" />,
    low: <SignalLow size={13} className="text-blue-500" />,
    none: <Minus size={13} className="text-gray-400" />,
  };

  const PRIORITY_BORDER: Record<string, string> = {
    urgent: "border-l-red-500",
    high: "border-l-orange-500",
    medium: "border-l-yellow-500",
    low: "border-l-blue-500",
    none: "border-l-gray-300",
  };

  return (
    <Popup
      trigger={
        <div
          className={`bg-white rounded-md border border-gray-200 border-l-4 p-4 ${
            PRIORITY_BORDER[item.priority] ?? PRIORITY_BORDER.none
          } p-2.5 shadow-sm hover:shadow-md hover:border-gray-300 transition cursor-pointer`}
        >
          <p className="text-sm text-gray-800 font-medium leading-snug line-clamp-2">
            {item.name}
          </p>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              {PRIORITY_ICON[item.priority] ?? PRIORITY_ICON.none}
              <span className="flex items-center gap-1 text-[11px] text-gray-400">
                <Calendar size={11} />
                {formatDate(item.created_at)}
              </span>
            </div>
            {item.assignee_names[0] && (
              <span
                title={item.assignee_names.join(", ")}
                className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-semibold flex items-center justify-center"
              >
                {initials(item.assignee_names[0])}
              </span>
            )}
          </div>
        </div>
      }
      modal
      nested
      overlayStyle={{ background: "rgba(15, 15, 15, 0.5)" }}
      contentStyle={{
        background: "transparent",
        border: "none",
        width: "auto",
      }}
    >
      {/* @ts-expect-error reactjs-popup children-as-function typing */}
      {(close: () => void) => (
        <div className="bg-white rounded-lg shadow-xl p-5 max-w-md w-[90vw] sm:w-[420px] max-h-[85vh] overflow-y-auto">
          <div className="flex items-start justify-between gap-3 mb-1">
            <span className="text-xs text-gray-400 font-medium">
              Task #{item.sequence_id}
            </span>
            <button
              onClick={close}
              className="text-gray-400 hover:text-gray-700 transition"
            >
              <X size={18} />
            </button>
          </div>

          <h3 className="text-base font-semibold text-gray-900 mb-3">
            {item.name}
          </h3>

          <div className="grid grid-cols-2 gap-y-2.5 gap-x-3 text-sm">
            <div className="flex items-center gap-1.5 text-gray-500">
              {COLUMNS.find((c) => c.key === item.state_group)?.icon}
              <span>{item.state_name}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-500">
              {PRIORITY_ICON[item.priority] ?? PRIORITY_ICON.none}
              <span className="capitalize">{item.priority}</span>
            </div>

            <div className="flex items-center gap-1.5 text-gray-500 col-span-2">
              <User size={13} />
              <span>Created by {item.created_by_name}</span>
            </div>

            <div className="flex items-center gap-1.5 text-gray-500 col-span-2">
              <User size={13} />
              <span>
                {item.assignee_names.length
                  ? `Assigned to ${item.assignee_names.join(", ")}`
                  : "Unassigned"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-gray-500">
              <Calendar size={13} />
              <span>Start: {formatDate(item.start_date)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-500">
              <Calendar size={13} />
              <span>Target: {formatDate(item.target_date)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-500">
              <Calendar size={13} />
              <span>Created: {formatDate(item.created_at)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-500">
              <Calendar size={13} />
              <span>Completed: {formatDate(item.completed_at)}</span>
            </div>
          </div>

          {item.description_stripped && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-1">
                Description
              </p>
              <p className="text-sm text-gray-600">
                {item.description_stripped}
              </p>
            </div>
          )}
        </div>
      )}
    </Popup>
  );
}

export default TaskCard;