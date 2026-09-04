"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Calendar, ShieldCheck, Layers } from "lucide-react";

interface Project {
  id: string;
  total_members: string;
  is_member: boolean;
  member_role: number;
  is_deployed: boolean;
  cover_image_url: string;
  created_at: Date;
  updated_at: Date;
  name: string;
  description: string;
  identifier: string;
  emoji: string;
  created_by: string;
  updated_by: string;
}

interface UserType {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: number;
  avatar: string;
  display_name:string;
  avatar_url: string;
}

// 5 = Guest, 15 = Member, 20 = Admin (Plane's numeric role scale)
const ROLE_LABELS: Record<number, { label: string; className: string }> = {
  15: { label: "Admin", className: "bg-purple-100 text-purple-700" },
  20: { label: "Member", className: "bg-blue-100 text-blue-700" },
  5: { label: "Guest", className: "bg-gray-100 text-gray-600" },
};

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const Projects = () => {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserType>();
  // const planeBaseURL = process.env.PLANE_BASE_URL;

  const fetchProjects = async () => {
    try {
      const res = await fetch("/apis/plane/projects", { method: "GET" });
      //also fetch user profile
      const { me } = await (
        await fetch("/apis/plane/me", { method: "GET" })
      ).json();
      // console.log(me);
      setUser(me);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Request failed: ${res.status}`);
      }

      setProjects(data.projects ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  if (loading) {
    return <p className="text-gray-500 p-6">Loading projects...</p>;
  }

  if (error) {
    return <p className="text-red-500 p-6">Error: {error}</p>;
  }

  return (
    <div className="">
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>Projects</h1>
            <p>
              {projects.length} {projects.length === 1 ? "project" : "projects"}{" "}
              across the workspace
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* User Profile Component */}
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.display_name ?? "User"}
                  className="w-9 h-9 rounded-full object-cover border border-gray-200"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-(--teal-normal) text-white flex items-center justify-center font-semibold text-sm">
                  {user?.first_name?.[0] || user?.display_name?.[0] || "U"}
                </div>
              )}

              <div className="flex flex-col text-left">
                <span className="text-sm font-medium text-gray-900 leading-tight">
                  {user?.first_name} {user?.last_name}
                </span>
                <span className="text-xs text-gray-500 leading-tight">
                  {user?.email}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {projects.map((project) => {
          const role = ROLE_LABELS[project.member_role];

          return (
            <div
              key={project.id}
              onClick={() => router.push(`/performance-report/${project.id}`)}
              className="group bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md hover:border-gray-300 transition cursor-pointer flex flex-col"
            >
              {/* Cover */}
              <div className="h-28 w-full relative bg-gradient-to-br from-indigo-100 via-slate-100 to-teal-100">
                {project.cover_image_url && (
                  <img
                    src={`https://plane.bsrealtyllc.com${project.cover_image_url}`}
                    alt={project.name}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute -bottom-5 left-4 w-11 h-11 rounded-lg bg-white border border-gray-200 shadow-sm flex items-center justify-center text-xl">
                  {project.emoji || "📁"}
                </div>
              </div>

              {/* Body */}
              <div className="pt-8 px-4 pb-4 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-md font-semibold text-gray-900 leading-snug group-hover:text-(--teal-dark) transition line-clamp-1">
                    {project.name}
                  </h3>
                  {role && (
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium ${role.className}`}
                    >
                      {role.label}
                    </span>
                  )}
                </div>

                <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 mt-1 uppercase tracking-wide">
                  <Layers size={11} />
                  {project.identifier}
                </span>

                {project.description && (
                  <p className="text-sm text-gray-500 mt-2 mb-2 line-clamp-2">
                    {project.description}
                  </p>
                )}

                <div className="mt-auto pt-4 flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 mt-3">
                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    {project.total_members}{" "}
                    {Number(project.total_members) === 1 ? "member" : "members"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {formatDate(project.created_at)}
                  </span>
                </div>

                {project.is_member && (
                  <span className="flex items-center gap-1 text-[11px] text-green-600 mt-2">
                    <ShieldCheck size={12} />
                    You're a member
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {projects.length === 0 && (
        <p className="text-sm text-gray-400 mt-6">No projects found.</p>
      )}
    </div>
  );
};

export default Projects;
