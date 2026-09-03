"use client";

import { useEffect, useState } from "react";
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
  Clock,
  Pen,
} from "lucide-react";

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
interface COLUMNSType {
  key: string;
  label: string;
  icon: React.ReactNode;
  headerColor: string;
}

interface LookupItem {
  id: string;
  name: string;
  group?: string;
}

// Shape of a single activity/change-log entry. The exact fields returned by
// Plane's /work-items/{id}/activities/ endpoint haven't been confirmed
// against a live self-hosted instance yet, so this is intentionally loose —
// the renderer below falls back gracefully if some fields are missing.
interface PlaneActivity {
  id: string;
  field?: string | null;
  verb?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  comment?: string | null;
  created_at: string;
  actor: string;
}

interface TaskCardProps {
  p_id:string;
  item: PlaneWorkItem;
  COLUMNS: COLUMNSType[];
  states: LookupItem[];
  members: LookupItem[];
  labels: LookupItem[];
  onUpdated?: () => void;
}

const PRIORITY_OPTIONS = ["urgent", "high", "medium", "low", "none"];

function TaskCard({
  p_id,
  item,
  COLUMNS,
  states,
  members,
  labels,
  onUpdated,
}: TaskCardProps) {
  const [stateId, setStateId] = useState(item.state);
  const [priority, setPriority] = useState(item.priority);
  const [assignees, setAssignees] = useState<string[]>(item.assignees ?? []);
  const [selectedLabels, setSelectedLabels] = useState<string[]>(
    item.labels ?? [],
  );
  const [startDate, setStartDate] = useState(item.start_date ?? "");
  const [dueDate, setDueDate] = useState(item.target_date ?? "");
  const [description, setDescription] = useState(item.description_html ?? "");
  const [editDescription, setEditDescription] = useState(false);

  // const [savingField, setSavingField] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [activities, setActivities] = useState<PlaneActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [activitiesLoaded, setActivitiesLoaded] = useState(false);

  const isDirty =
    stateId !== item.state ||
    priority !== item.priority ||
    startDate !== (item.start_date ?? "") ||
    dueDate !== (item.target_date ?? "") ||
    description !== (item.description_html ?? "") ||
    JSON.stringify([...assignees].sort()) !==
      JSON.stringify([...(item.assignees ?? [])].sort()) ||
    JSON.stringify([...selectedLabels].sort()) !==
      JSON.stringify([...(item.labels ?? [])].sort());

  function handleDiscard() {
    setStateId(item.state);
    setPriority(item.priority);
    setAssignees(item.assignees ?? []);
    setSelectedLabels(item.labels ?? []);
    setStartDate(item.start_date ?? "");
    setDueDate(item.target_date ?? "");
    setDescription(item.description_html ?? "");
    setSaveError(null);
  }


  async function handleUpdate() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/apis/plane/${item.id}?projectId=${encodeURIComponent(p_id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: stateId,
          priority,
          assignees,
          labels: selectedLabels,
          start_date: startDate || null,
          target_date: dueDate || null,
          description_html: description,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Request failed: ${res.status}`);
      }
      onUpdated?.();
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatDateTime(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
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
    urgent: <Flame size={15} className="text-red-500" />,
    high: <SignalHigh size={15} className="text-orange-500" />,
    medium: <SignalMedium size={15} className="text-yellow-500" />,
    low: <SignalLow size={15} className="text-blue-500" />,
    none: <Minus size={15} className="text-gray-400" />,
  };

  const PRIORITY_BORDER: Record<string, string> = {
    urgent: "border-l-red-500",
    high: "border-l-orange-500",
    medium: "border-l-yellow-500",
    low: "border-l-blue-500",
    none: "border-l-gray-300",
  };

  // PATCHes a single field to Plane via our proxy route, then notifies the
  // parent board to refetch so grouped columns / analytics stay in sync.
  function toggleMulti(
    value: string,
    list: string[],
    setList: (v: string[]) => void,
  ) {
    setList(
      list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
    );
  }

  async function loadActivities() {
    if (activitiesLoaded) return;
    setLoadingActivities(true);
    try {
      const res = await fetch(`/apis/plane/${item.id}/activities`, {
        method: "GET",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Request failed: ${res.status}`);
      }
      setActivities(data.results ?? data ?? []);
      setActivitiesLoaded(true);
    } catch {
      // Activity log is supplementary — fail quietly and just show
      // "No activity yet" rather than blocking the whole popup.
      setActivities([]);
      setActivitiesLoaded(true);
    } finally {
      setLoadingActivities(false);
    }
  }

  function describeActivity(a: PlaneActivity) {
    const actor = members.find((m) => m.id === a.actor)?.name;

    if (a.verb === "created") return `${actor} created the task.`;
    if (a.verb === "updated") {
      if (a.field === "description") {
        return (
          <>
            {actor} updated the description to:{" "}
            <span
              className="text-gray-700"
              dangerouslySetInnerHTML={{ __html: a.new_value ?? "" }}
            />
          </>
        );
      } else {
        return `${actor} updated ${a.field} from ${a.old_value} to ${a.new_value}.`;
      }
    }
    if (a.comment) return `${actor}: ${a.comment}`;

    return `${actor} updated this task`;
  }

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
      onOpen={loadActivities}
      onClose={()=> setEditDescription(false)}
      overlayStyle={{ background: "rgba(15, 15, 15, 0.5)" }}
      contentStyle={{
        background: "transparent",
        border: "none",
        width: "auto",
      }}
    >
      {/* @ts-expect-error reactjs-popup children-as-function typing */}
      {(close: () => void) => (
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-[92vw] sm:w-[650px] max-h-[88vh] overflow-y-auto">
          <div className="flex items-start justify-between gap-3 mb-2">
            <span className="text-sm text-gray-400 font-medium">
              Task #{item.sequence_id}
            </span>
            <button
              onClick={close}
              className="text-gray-400 hover:text-gray-700 transition"
            >
              <X size={22} />
            </button>
          </div>

          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            {item.name}
          </h3>

          {saveError && (
            <p className="text-sm text-red-500 mb-4">{saveError}</p>
          )}

          {/* Editable fields */}
          <div className="grid grid-cols-2 gap-5 text-base mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1.5">
                Status
              </label>
              <select
                value={stateId}
                onChange={(e) => setStateId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
              >
                {states.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white capitalize"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p} className="capitalize">
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1.5">
                Start date
              </label>
              <input
                type="date"
                value={startDate ?? ""}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1.5">
                Due date
              </label>
              <input
                type="date"
                value={dueDate ?? ""}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-500 mb-1.5">
                Assignees
              </label>
              <div className="flex flex-wrap gap-2 border border-gray-200 rounded-md p-2.5 max-h-28 overflow-y-auto">
                {members.map((m) => {
                  const active = assignees.includes(m.id);
                  return (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => toggleMulti(m.id, assignees, setAssignees)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition ${
                        active
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-gray-600 border-gray-300"
                      }`}
                    >
                      {m.name}
                    </button>
                  );
                })}
                {members.length === 0 && (
                  <p className="text-sm text-gray-400">No members found</p>
                )}
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-500 mb-1.5">
                Labels
              </label>
              <div className="flex flex-wrap gap-2 border border-gray-200 rounded-md p-2.5 max-h-28 overflow-y-auto">
                {labels.map((l) => {
                  const active = selectedLabels.includes(l.id);
                  return (
                    <button
                      type="button"
                      key={l.id}
                      onClick={() =>
                        toggleMulti(l.id, selectedLabels, setSelectedLabels)
                      }
                      className={`px-3 py-1.5 rounded-full text-sm border transition ${
                        active
                          ? "bg-teal-600 text-white border-teal-600"
                          : "bg-white text-gray-600 border-gray-300"
                      }`}
                    >
                      {l.name}
                    </button>
                  );
                })}
                {labels.length === 0 && (
                  <p className="text-sm text-gray-400">No labels found</p>
                )}
              </div>
            </div>
          </div>

          {/* Read-only metadata */}
          <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm text-gray-500 mb-8 pb-8 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <User size={14} />
              <span>Created by {item.created_by_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={14} />
              <span>Created: {formatDate(item.created_at)}</span>
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <Calendar size={14} />
              <span>Completed: {formatDate(item.completed_at)}</span>
            </div>
          </div>

          {/* Description */}
          <div className="mb-8 pb-8 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-500 mb-2">
              Description
            </p>
            <div className="flex justify-between items-start gap-2">
              {editDescription ? (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-11/12 p-2 text-base border border-(--teal-dark) rounded-xl resize-y"
                />
              ) : description ? (
                <div
                  className="w-11/12 text-base text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: description }}
                />
              ) : (
                <p className="w-11/12 text-base text-gray-400 italic">
                  No description
                </p>
              )}

              <button
                type="button"
                onClick={() => setEditDescription(!editDescription)}
                className="rounded-xl bg-amber-50 p-1 text-sm cursor-pointer shrink-0"
              >
                <Pen size={16} />
              </button>
            </div>
          </div>

          {/* Activity log */}
          <div>
            <p className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-1.5">
              <Clock size={14} />
              Activity
            </p>

            {loadingActivities ? (
              <p className="text-sm text-gray-400">Loading activity...</p>
            ) : activities.length === 0 ? (
              <p className="text-sm text-gray-400">No activity yet</p>
            ) : (
              <div className="space-y-3">
                {activities.map((a) => (
                  <div key={a.id} className="flex gap-3 text-sm">
                    <span className="text-gray-400 shrink-0 w-28">
                      {formatDateTime(a.created_at)}
                    </span>
                    <span className="text-gray-600">{describeActivity(a)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Discard / Update actions */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={!isDirty || saving}
              className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-600 bg-white disabled:opacity-50"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleUpdate}
              disabled={!isDirty || saving}
              className="px-4 py-2 text-sm rounded-md bg-(--teal-normal) text-white disabled:opacity-50"
            >
              {saving ? "Updating..." : "Update"}
            </button>
          </div>
        </div>
      )}
    </Popup>
  );
}

export default TaskCard;
