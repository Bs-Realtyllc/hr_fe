"use client";

import { useEffect, useState } from "react";

interface PlaneWorkItem {
  id: string;
  name: string;
  description_stripped: string | null;
  state: string;
  priority: string;
  target_date: string | null;
}

interface PlaneWorkItemsResponse {
  results: PlaneWorkItem[];
}

export default function PerformanceReportPage() {
  const [items, setItems] = useState<PlaneWorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/apis/plane", { method: "GET" });
        // console.log(response)

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        const data: PlaneWorkItemsResponse = await response.json();
        setItems(data.results ?? []);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <p className="text-gray-500 p-4">Loading to-dos...</p>;
  }

  if (error) {
    return <p className="text-red-500 p-4">Error: {error}</p>;
  }

  return (
    <div className="max-w-xl mx-auto p-4 space-y-3">
      <h2 className="text-xl font-semibold text-gray-800">
        Performance Report
      </h2>

      {items.length === 0 && (
        <p className="text-gray-500">No work items found.</p>
      )}

      {items.map((item) => (
        <div
          key={item.id}
          className="border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition"
        >
          <p className="font-medium text-gray-900">{item.name}</p>
          {item.description_stripped && (
            <p className="text-sm text-gray-500 mt-1">
              {item.description_stripped}
            </p>
          )}
          <div className="flex gap-2 mt-2 text-xs">
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
              {item.priority}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
