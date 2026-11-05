"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BSRealtyAvatar } from "@bsrealtyllc/design-system";
import { buildFillDetailsMailto } from "@/template/fillDetailsMailTemplate";
import { api } from "@/lib/api";
import { showToast } from "@/lib/toast";
import Button from "@/components/Button/Button";
import PillTabs from "@/components/PillTabs";

interface EducationInfoEntry {
  education_level: string;
  institution_name: string;
  field_of_study: string;
  still_enrolled: boolean;
  graduation_date: string | null;
  certificate: string | null;
}

interface PreviousExperienceEntry {
  company: string;
  role: string;
  start_date: string;
  end_date: string | null;
  employment_type: "part-time" | "full-time" | null;
  work_location: "remote" | "physical" | "hybrid" | null;
  description: string | null;
  experience_letter: string | null;
  still_working: boolean;
}

/** Row from GET /onboard — employee_onboarding_profile in snake_case. */
interface OnboardingProfile {
  id: number;
  name: string;
  dob: string | null;
  gender: "male" | "female" | "other" | "prefer_not_to_say" | null;
  nationality: string | null;
  email: string;
  phone: string | null;
  current_address: string | null;
  permanent_address: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  education_info: EducationInfoEntry[] | string | null;
  previous_experience_info: PreviousExperienceEntry[] | string | null;
  emergency_contact_name: string | null;
  emergency_contact_relation: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_email: string | null;
  emergency_contact_address: string | null;
  photo_path: string | null;
  id_front_path: string | null;
  id_back_path: string | null;
  pan_front_path: string | null;
  pan_back_path: string | null;
  additional_document_path: string | null;
  contract_path: string | null;
  other_document_path: string | null;
  confirmed: boolean | null;
  is_active: boolean | null;
  role: "intern" | "employee" | "admin";
  source: string;
  source_application_id: string | null;
}

type ActionState = "idle" | "loading";
type RoleFilter = "all" | "intern" | "employee";

/** Upload field names accepted by GET /onboard/:id/:type/url. */
const PROFILE_DOCUMENTS: {
  type: string;
  label: string;
  key: keyof OnboardingProfile;
}[] = [
  { type: "passportPhoto", label: "Passport Photo", key: "photo_path" },
  { type: "idFront", label: "ID (Front)", key: "id_front_path" },
  { type: "idBack", label: "ID (Back)", key: "id_back_path" },
  { type: "panFront", label: "PAN (Front)", key: "pan_front_path" },
  { type: "panBack", label: "PAN (Back)", key: "pan_back_path" },
  { type: "additionalDocument", label: "Additional Document", key: "additional_document_path" },
  { type: "contract", label: "Signed Contract", key: "contract_path" },
  { type: "otherDocument", label: "Other Document", key: "other_document_path" },
];

/** JSON columns may arrive already parsed or as a string, depending on the driver. */
function parseJsonArray<T>(value: T[] | string | null | undefined): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** 'YYYY-MM-DD' read as a local date, so it never shifts a day across timezones. */
function formatDate(value: string | null | undefined) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** "prefer_not_to_say" → "Prefer not to say", "part-time" → "Part-time" */
function humanize(value: string | null | undefined) {
  if (!value) return null;
  const text = value.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const Page = () => {
  const [users, setUsers] = useState<OnboardingProfile[]>([]);
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
      const data = await api.get<OnboardingProfile[]>("/onboard?type=all");
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading applications.",
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

  const countFor = (role: RoleFilter) =>
    role === "all" ? users.length : users.filter((u) => u.role === role).length;

  // The file route needs a signed ?token (a new window can't send the auth header),
  // so fetch the link first. The window is opened synchronously so popup blockers
  // still treat it as user-initiated.
  const openDocument = async (id: number, type: string) => {
    const win = window.open("", "_blank");
    try {
      const { url } = await api.get<{ url: string }>(
        `/onboard/${id}/${encodeURIComponent(type)}/url`,
      );
      if (win) {
        win.opener = null;
        win.location.href = url;
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch {
      win?.close();
      showToast("error", "Could not open the file.");
    }
  };

  const handleDecision = async (
    id: number,
    decision: "approve" | "reject",
  ) => {
    setActionState((prev) => ({ ...prev, [id]: "loading" }));
    try {
      await api.patch(`/onboard/${id}/${decision}`, {});
      showToast(
        "success",
        decision === "approve"
          ? "Onboarding approved successfully."
          : "Application rejected.",
      );
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch {
      showToast(
        "error",
        `Could not ${decision} this application. Please try again.`,
      );
      setActionState((prev) => ({ ...prev, [id]: "idle" }));
    }
  };

  const sendMail = (user: OnboardingProfile) => {
    const { mailtoLink } = buildFillDetailsMailto({
      to: user.email,
      name: user.name,
      onboardUrl: `https://portal.gitgi.com/onboard/${user.role}`,
    });
    window.open(mailtoLink, "_blank");
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>Onboarding</h1>
            <p>
              Review pending applications and approve or reject each one.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <PillTabs
          value={roleFilter}
          onChange={(v) => setRoleFilter(v as RoleFilter)}
          options={[
            { value: "all", label: `All (${countFor("all")})` },
            { value: "intern", label: `Intern (${countFor("intern")})` },
            { value: "employee", label: `Employee (${countFor("employee")})` },
          ]}
        />
      </div>

      {error && (
        <div className="card mb-4 flex items-center justify-between gap-4 text-sm text-(--color-error)">
          <span>{error}</span>
          <Button variant="text" size="small" onClick={fetchUsers}>
            Retry
          </Button>
        </div>
      )}

      {loading ? (
        <div className="card empty-state">Loading applications…</div>
      ) : filteredUsers.length === 0 ? (
        <div className="card empty-state">
          {users.length === 0
            ? "No pending applications to review."
            : `No pending ${roleFilter} applications.`}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map((user) => (
            <ApplicationCard
              key={user.id}
              user={user}
              busy={actionState[user.id] === "loading"}
              onApprove={() => handleDecision(user.id, "approve")}
              onReject={() => handleDecision(user.id, "reject")}
              onSendMail={() => sendMail(user)}
              onOpenDocument={(type) => openDocument(user.id, type)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

function ApplicationCard({
  user,
  busy,
  onApprove,
  onReject,
  onSendMail,
  onOpenDocument,
}: {
  user: OnboardingProfile;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onSendMail: () => void;
  onOpenDocument: (type: string) => void;
}) {
  const education = parseJsonArray(user.education_info);
  const experience = parseJsonArray(user.previous_experience_info);

  const documents = [
    ...PROFILE_DOCUMENTS.filter((d) => user[d.key]).map((d) => ({
      type: d.type,
      label: d.label,
    })),
    ...education.flatMap((e, i) =>
      e?.certificate
        ? [
            {
              type: `educationCertificate_${i}`,
              label: `Certificate — ${e.institution_name || `Education ${i + 1}`}`,
            },
          ]
        : [],
    ),
    ...experience.flatMap((e, i) =>
      e?.experience_letter
        ? [
            {
              type: `experienceLetter_${i}`,
              label: `Experience Letter — ${e.company || `Experience ${i + 1}`}`,
            },
          ]
        : [],
    ),
  ];

  return (
    <article className="card flex h-[calc(100vh-6rem)] min-h-[560px] flex-col p-0!">
      {/* Header — stays put while the details scroll */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-(--color-border) px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <BSRealtyAvatar size="md" name={initials(user.name)} />
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-(--color-text-h2)">
              {user.name}
            </h2>
            <p className="truncate text-sm text-(--color-text-muted)">
              {user.email}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="badge badge-accent">{user.role}</span>
            {user.source && user.source !== "manual" && (
              <span className="badge badge-info">
                via {humanize(user.source)}
              </span>
            )}
            {user.confirmed && (
              <span className="badge badge-success">Confirmed</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="small"
            onClick={onReject}
            disabled={busy}
          >
            Reject
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={onSendMail}
            disabled={busy}
          >
            Send mail
          </Button>
          <Button
            variant="primary"
            size="small"
            onClick={onApprove}
            disabled={busy}
          >
            {busy ? "Processing…" : "Approve"}
          </Button>
        </div>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <Section title="Personal Information">
          <DetailGrid>
            <Detail label="Date of Birth" value={formatDate(user.dob)} />
            <Detail label="Gender" value={humanize(user.gender)} />
            <Detail label="Nationality" value={user.nationality} />
            <Detail label="Phone" value={user.phone} />
            <Detail label="Current Address" value={user.current_address} />
            <Detail label="Permanent Address" value={user.permanent_address} />
            <Detail label="LinkedIn" value={user.linkedin_url} href={user.linkedin_url} />
            <Detail label="GitHub" value={user.github_url} href={user.github_url} />
            <Detail label="Portfolio" value={user.portfolio_url} href={user.portfolio_url} />
          </DetailGrid>
        </Section>

        <Section title="Educational Information" count={education.length}>
          {education.length === 0 ? (
            <EmptyNote>No education details provided.</EmptyNote>
          ) : (
            <div className="space-y-3">
              {education.map((e, i) => (
                <SubCard key={i}>
                  <DetailGrid>
                    <Detail label="Education Level" value={e.education_level} />
                    <Detail label="Institution" value={e.institution_name} />
                    <Detail label="Field of Study" value={e.field_of_study} />
                    <Detail
                      label="Graduation Date"
                      value={
                        e.still_enrolled
                          ? "Still enrolled"
                          : formatDate(e.graduation_date)
                      }
                    />
                  </DetailGrid>
                </SubCard>
              ))}
            </div>
          )}
        </Section>

        <Section title="Previous Experience" count={experience.length}>
          {experience.length === 0 ? (
            <EmptyNote>No previous experience provided.</EmptyNote>
          ) : (
            <div className="space-y-3">
              {experience.map((e, i) => (
                <SubCard key={i}>
                  <DetailGrid>
                    <Detail label="Company" value={e.company} />
                    <Detail label="Role" value={e.role} />
                    <Detail
                      label="Duration"
                      value={
                        e.start_date
                          ? `${formatDate(e.start_date)} – ${
                              e.still_working
                                ? "Present"
                                : formatDate(e.end_date) ?? "—"
                            }`
                          : null
                      }
                    />
                    <Detail
                      label="Employment Type"
                      value={humanize(e.employment_type)}
                    />
                    <Detail
                      label="Work Location"
                      value={humanize(e.work_location)}
                    />
                  </DetailGrid>
                  {e.description && (
                    <div className="mt-3">
                      <dt className="text-xs font-medium uppercase tracking-wide text-(--color-text-muted)">
                        Description
                      </dt>
                      <dd className="mt-0.5 whitespace-pre-line text-sm text-(--color-text-body)">
                        {e.description}
                      </dd>
                    </div>
                  )}
                </SubCard>
              ))}
            </div>
          )}
        </Section>

        <Section title="Emergency Contact">
          <DetailGrid>
            <Detail label="Name" value={user.emergency_contact_name} />
            <Detail label="Relation" value={user.emergency_contact_relation} />
            <Detail label="Phone" value={user.emergency_contact_phone} />
            <Detail label="Email" value={user.emergency_contact_email} />
            <Detail label="Address" value={user.emergency_contact_address} />
          </DetailGrid>
        </Section>

        <Section title="Documents" count={documents.length}>
          {documents.length === 0 ? (
            <EmptyNote>No documents uploaded.</EmptyNote>
          ) : (
            <div className="flex flex-wrap gap-2">
              {documents.map((doc) => (
                <button
                  key={doc.type}
                  type="button"
                  onClick={() => onOpenDocument(doc.type)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-(--color-border) px-3 py-1.5 text-sm font-medium text-(--color-primary) transition-colors hover:bg-(--color-primary-light)"
                >
                  <span
                    className="icon-mask"
                    style={{
                      width: 14,
                      height: 14,
                      WebkitMaskImage: "url(/icons/file-text.svg)",
                      maskImage: "url(/icons/file-text.svg)",
                    }}
                  />
                  {doc.label}
                </button>
              ))}
            </div>
          )}
        </Section>
      </div>
    </article>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-(--color-text-h3)">
        {title}
        {count !== undefined && count > 0 && (
          <span className="badge badge-neutral">{count}</span>
        )}
      </h3>
      {children}
    </section>
  );
}

function DetailGrid({ children }: { children: ReactNode }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </dl>
  );
}

function SubCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-(--color-border) bg-(--color-bg) p-4">
      {children}
    </div>
  );
}

function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="text-sm text-(--color-text-muted)">{children}</p>;
}

function Detail({
  label,
  value,
  href,
}: {
  label: string;
  value: string | null | undefined;
  href?: string | null;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-(--color-text-muted)">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-sm text-(--color-text-body)">
        {value && href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-(--color-primary) hover:underline"
          >
            {value}
          </a>
        ) : (
          value || "—"
        )}
      </dd>
    </div>
  );
}

export default Page;
