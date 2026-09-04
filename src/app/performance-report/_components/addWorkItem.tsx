"use client";

import { useState } from "react";
import { Dispatch, SetStateAction } from "react";

interface LookupItem {
  id: string;
  name: string;
  group?: string;
}

const PRIORITY_OPTIONS = ["urgent", "high", "medium", "low", "none"];

interface AddWorkItemProps {
  p_id: string;
  states: LookupItem[];
  members: LookupItem[];
  labels: LookupItem[];
  onClose?: () => void;
  onCreated?: () => void;
}
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

const AddWorkItem = ({
  p_id,
  states,
  members,
  labels,
  onClose,
  onCreated,
}: AddWorkItemProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [state, setState] = useState(states[0]?.id ?? "");
  const [priority, setPriority] = useState("none");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleValue = (
    value: string,
    list: string[],
    setList: (v: string[]) => void,
  ) => {
    setList(
      list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(
        `/apis/plane/work-items?projectId=${encodeURIComponent(p_id)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: title.trim(),
            description_html: description ? `<p>${description}</p>` : "<p></p>",
            state: state || undefined,
            priority,
            assignees,
            labels: selectedLabels,
            start_date: startDate || null,
            target_date: dueDate || null,
          }),
        },
      );

      const data = await res.json();
      // console.log(data);

      if (!res.ok) {
        throw new Error(data.error || `Request failed: ${res.status}`);
      }

      onCreated?.();
      onClose?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="bg-white rounded-lg shadow-xl p-5 w-[90vw] sm:w-[480px] max-h-[85vh] overflow-y-auto">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Create a new work item
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more detail..."
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* State + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                State
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm bg-white"
              >
                {states.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm bg-white capitalize"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p} className="capitalize">
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignees */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Assignees
            </label>
            <div className="flex flex-wrap gap-1.5 border border-gray-200 rounded-md p-2 max-h-24 overflow-y-auto">
              {members.map((m) => {
                const active = assignees.includes(m.id);
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => toggleValue(m.id, assignees, setAssignees)}
                    className={`px-2 py-1 rounded-full text-xs border transition ${
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
                <p className="text-xs text-gray-400">No members found</p>
              )}
            </div>
          </div>

          {/* Labels */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Labels
            </label>
            <div className="flex flex-wrap gap-1.5 border border-gray-200 rounded-md p-2 max-h-24 overflow-y-auto">
              {labels.map((l) => {
                const active = selectedLabels.includes(l.id);
                return (
                  <button
                    type="button"
                    key={l.id}
                    onClick={() =>
                      toggleValue(l.id, selectedLabels, setSelectedLabels)
                    }
                    className={`px-2 py-1 rounded-full text-xs border transition ${
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
                <p className="text-xs text-gray-400">No labels found</p>
              )}
            </div>
          </div>

          {/* Start date + Due date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Start date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Due date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-600 bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-3 py-1.5 text-sm rounded-md bg-(--teal-normal) text-white disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create work item"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default AddWorkItem;
