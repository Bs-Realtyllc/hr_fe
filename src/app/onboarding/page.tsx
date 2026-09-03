"use client";

import { useEffect, useState } from "react";
import Popup from "reactjs-popup";
// import 'reactjs-popup/dist/index.css';
//mail template
import { buildFillDetailsMailto } from "@/template/fillDetailsMailTemplate";
import { api } from "@/lib/api";

interface User {
  id: number;
  name: string;
  dob: string | null;
  gender: string | null;
  address: string | null;
  education_level: string | null;
  institution_name: string | null;
  field_of_study: string | null;
  graduation_date: string | null;
  previous_experience: string | null;
  areas_of_interest: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  email: string;
  secondary_email: string | null;
  discord_username: string | null;
  profile_picture: string | null;
  designation: string | null;
  department: string | null;
  manager_id: number | null;
  start_date: string | null;
  role: string;
  status: string | null;
  manager_name: string | null;
  nda_path: string;
  citizenship_front_path: string;
  citizenship_back_path: string;
  pan_path: string;
  passout_certificate_path: string;
  photo_path: string;
}

type ActionState = "idle" | "loading";

type RoleFilter = "all" | "intern" | "employee";

const Page = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [actionState, setActionState] = useState<Record<number, ActionState>>(
    {},
  );

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get<User[]>("/onboard?type=all");
      setUsers(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading users.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers =
    roleFilter === "all" ? users : users.filter((u) => u.role === roleFilter);

  interface SumbitButtonType {
    id: number;
    type: "nda" | "photo" | "citizenship" | "certificate" | "pan";
  }

  const handleViewContract = async ({ id, type }: SumbitButtonType) => {
    try {
      const token = localStorage.getItem("hr_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/onboard/${id}/${type}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!res.ok) {
        throw new Error(`Failed to load contract (${res.status})`);
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      // Opens in a new tab/window; browser's native PDF/doc viewer handles display
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      // release memory once the tab has had a chance to load it
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Could not open contract.",
      );
    }
  };

  const handleDecision = async (
    id: number,
    decision: "approve" | "disapprove",
  ) => {
    setActionState((prev) => ({ ...prev, [id]: "loading" }));
    try {
      if (decision === "approve") {
        await api.patch(`/onboard/${id}/approve`, {});
      } else {
        await api.delete(`/onboard/${id}`);
      }

      // Remove the user from the list once actioned
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Something went wrong trying to ${decision} this user.`,
      );
      setActionState((prev) => ({ ...prev, [id]: "idle" }));
    }
  };
  const sendMail = (user: User) => {
    const { subject, body, mailtoLink } = buildFillDetailsMailto({
      to: user.email,
      name: user.name,
      onboardUrl: "https://portal.gitgi.com/onboard/intern",
    });
    // Redirect the browser to the email client
    window.open(mailtoLink, "_blank");
  };

  const formatDate = (value: string | null) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString();
  };

  return (
    <div className="">
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>Team Directory</h1>
            <p>
              Review pending applications and approve or disapprove each one.
            </p>
          </div>
          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium text-slate-700">
              Filter by role
            </span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              <option value="all">All</option>
              <option value="intern">Intern</option>
              <option value="employee">Employee</option>
            </select>
          </label>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center justify-between rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button
            onClick={fetchUsers}
            className="font-medium underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center text-slate-500">Loading…</div>
      ) : users.length === 0 ? (
        <div className="py-24 text-center text-slate-500">
          No inactive users to review.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map((user) => {
            const state = actionState[user.id] ?? "idle";
            const isLoading = state === "loading";

            return (
              <div
                key={user.id}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {user.name}
                    </h2>
                    <p className="text-sm text-slate-500">{user.email}</p>
                    <span className="mt-1 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-600">
                      {user.role}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {!isLoading ? (
                      <>
                        <button
                          disabled={isLoading}
                          onClick={() => handleDecision(user.id, "disapprove")}
                          className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Disapprove
                        </button>
                        <button
                          onClick={() => sendMail(user)}
                          disabled={isLoading}
                          className="rounded-md border border-green-300 px-4 py-2 text-sm font-medium text-green-600 transition-colors hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Send mail
                        </button>
                        <button
                          onClick={() => handleDecision(user.id, "approve")}
                          disabled={isLoading}
                          className="rounded-md bg-(--teal-normal) px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-(--teal-dark) disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          Approve
                        </button>{" "}
                      </>
                    ) : (
                      "processing..."
                    )}
                  </div>
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-slate-100 pt-5 text-sm sm:grid-cols-3">
                  <Detail label="Date of Birth" value={formatDate(user.dob)} />
                  <Detail label="Gender" value={user.gender} />
                  <Detail label="Education" value={user.education_level} />
                  <Detail label="Institution" value={user.institution_name} />
                  <Detail label="Field of Study" value={user.field_of_study} />
                  <Detail
                    label="Graduation Date"
                    value={formatDate(user.graduation_date)}
                  />
                </dl>
                {(user.linkedin_url ||
                  user.github_url ||
                  user.portfolio_url) && (
                  <div className="mt-4 flex justify-between flex-wrap border-t border-slate-100 pt-4 text-sm">
                    <div className="flex flex-wrap gap-4">
                      {user.linkedin_url && (
                        <a
                          href={user.linkedin_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-amber-700 hover:underline"
                        >
                          LinkedIn
                        </a>
                      )}
                      {user.github_url && (
                        <a
                          href={user.github_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-amber-700 hover:underline"
                        >
                          GitHub
                        </a>
                      )}
                      {user.portfolio_url && (
                        <a
                          href={user.portfolio_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-amber-700 hover:underline"
                        >
                          Portfolio
                        </a>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4">
                      {user.nda_path && (
                        <button
                          onClick={() =>
                            handleViewContract({ id: user.id, type: "nda" })
                          }
                        >
                          contract
                        </button>
                      )}
                      {user.photo_path && (
                        <button
                          onClick={() =>
                            handleViewContract({ id: user.id, type: "photo" })
                          }
                        >
                          Photo
                        </button>
                      )}
                      {user.citizenship_front_path && (
                        <button
                          onClick={() =>
                            handleViewContract({
                              id: user.id,
                              type: "citizenship",
                            })
                          }
                        >
                          Citizenship
                        </button>
                      )}
                      {user.passout_certificate_path && (
                        <button
                          onClick={() =>
                            handleViewContract({
                              id: user.id,
                              type: "certificate",
                            })
                          }
                        >
                          Certificate
                        </button>
                      )}
                      {user.pan_path && (
                        <button
                          onClick={() =>
                            handleViewContract({ id: user.id, type: "pan" })
                          }
                        >
                          PAN card
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-slate-800">{value || "—"}</dd>
    </div>
  );
}

export default Page;
