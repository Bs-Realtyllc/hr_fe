"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type PausesType = {
  pause: string;
  resume: string;
  reason: string;
}

interface ClockUser {
  employeeId: number;
  name: string;
  email: string;
  phone: string | null;
  profilePicture: string | null;
  address: string | null;
  clockDate: string;
  clockId: number;
  clockIn: string;
  clockOut: string | null;
  status: Status;
  pauses: Array<PausesType>;
}

type Status = "running" | "paused" | "done";

// function getStatus(user: ClockUser): Status {
//   if (user.clockOut) return "offline";
//   if (user.pause) return "paused";
//   return "online";
// }

const statusStyles: Record<Status, string> = {
  running: "bg-green-100 text-green-700 border-green-300",
  paused: "bg-yellow-100 text-yellow-700 border-yellow-300",
  done: "bg-gray-100 text-gray-600 border-gray-300",
};

const statusDot: Record<Status, string> = {
  running: "bg-green-500",
  paused: "bg-yellow-500",
  done: "bg-gray-400",
};

export default function ActiveTab() {
  const [users, setUsers] = useState<ClockUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { result } = await api.get<any>("/clock/all").catch(() => {
          throw new Error("Failed to fetch clock data");
        });
        setUsers(result ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (users.length === 0)
    return (
      <div className="p-6 text-gray-500">No one has clocked in today.</div>
    );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ">
      {users.map((user) => {
        // const status = getStatus(user);
        return (
          <div
            key={user.employeeId}
            className=" rounded-xl p-4 shadow-sm bg-white flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">{user.name}</h3>
              </div>
              <span
                className={`flex items-center gap-1 text-xs font-medium border px-2 py-1 rounded-full capitalize ${statusStyles[user.status]}`}
              >
                <span className={`w-2 h-2 rounded-full ${statusDot[user.status]}`} />
                {status}
              </span>
            </div>

            <div className="text-sm text-gray-600">
              <p>
                Clock In:{" "}
                {new Date(user.clockIn).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              {user.clockOut && (
                <p>
                  Clock Out:{" "}
                  {new Date(user.clockOut).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>

            {user.status === "paused"  && (
              <div className="mt-1 text-xs bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md px-2 py-1">
                Paused: {user.pauses[user.pauses.length -1]?.reason}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
