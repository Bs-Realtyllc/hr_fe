/**
 * Admin-configured onboarding form layout (GET /form-layout?type=<role>).
 *
 * The backend returns one forms_layout row per section, keyed
 * "<role>_onboard_<section>", each a list of { name, required }. A field is shown
 * only if it appears in its section's list. A section with no fields is skipped
 * entirely. name and email are never in the layout: they're always shown and
 * always required.
 */

export type SectionKey =
    | "personal"
    | "educational"
    | "experience"
    | "emergency"
    | "documents"
    | "other";

export type FormFieldConfig = { name: string; required: boolean };

/** field name -> required. A field missing from the map is hidden. */
export type SectionRules = Record<string, boolean>;
export type ResolvedLayout = Record<SectionKey, SectionRules>;

export const SECTION_KEYS: SectionKey[] = [
    "personal",
    "educational",
    "experience",
    "emergency",
    "documents",
    "other",
];

/**
 * Every field each section can show, with the required flag used when no layout
 * is configured yet (or it fails to load). Names match the backend's
 * SECTION_FIELDS in hr_be/src/dtos/formLayout.dto.ts.
 */
export const DEFAULT_LAYOUT: ResolvedLayout = {
    personal: {
        dob: true,
        gender: true,
        nationality: true,
        phone: true,
        currentAddress: true,
        permanentAddress: true,
        linkedinUrl: false,
        githubUrl: false,
        portfolioUrl: false,
    },
    educational: {
        educationLevel: true,
        institutionName: true,
        fieldOfStudy: true,
        stillEnrolled: false,
        graduationDate: true,
        certificate: false,
    },
    experience: {
        company: true,
        role: true,
        startDate: true,
        endDate: false,
        stillWorking: false,
        employmentType: false,
        workLocation: false,
        description: false,
        experienceLetter: false,
    },
    emergency: {
        emergencyContactName: true,
        emergencyContactRelation: true,
        emergencyContactPhone: true,
        emergencyContactEmail: false,
        emergencyContactAddress: false,
    },
    documents: {
        photoPath: true,
        idFrontPath: true,
        idBackPath: true,
        panFrontPath: true,
        panBackPath: true,
        additionalDocumentPath: false,
    },
    other: {
        contractPath: true,
        otherDocumentPath: false,
    },
};

export const layoutName = (role: string, section: SectionKey) =>
    `${role}_onboard_${section}`;

/**
 * Turns the GET /form-layout body into per-section rules.
 * - No section configured at all → DEFAULT_LAYOUT (full form).
 * - Otherwise, a section that's missing or empty is hidden, and unknown field
 *   names are ignored.
 */
export function resolveLayout(response: unknown, role: string): {
    layout: ResolvedLayout;
    configured: boolean;
} {
    const body = response as { data?: Record<string, unknown> } | null;
    const sections = body?.data && typeof body.data === "object" ? body.data : {};

    const configured = SECTION_KEYS.some((s) => Array.isArray(sections[layoutName(role, s)]));
    if (!configured) return { layout: DEFAULT_LAYOUT, configured: false };

    const layout = Object.fromEntries(
        SECTION_KEYS.map((section) => {
            const entries = sections[layoutName(role, section)];
            const rules: SectionRules = {};
            if (Array.isArray(entries)) {
                (entries as Partial<FormFieldConfig>[]).forEach((entry) => {
                    if (entry?.name && entry.name in DEFAULT_LAYOUT[section]) {
                        rules[entry.name] = !!entry.required;
                    }
                });
            }
            return [section, rules];
        }),
    ) as ResolvedLayout;

    return { layout, configured: true };
}

/** Helpers for one section's fields. */
export function sectionHelpers(rules: SectionRules) {
    return {
        /** At least one field is shown. */
        visible: Object.keys(rules).length > 0,
        show: (name: string) => name in rules,
        required: (name: string) => rules[name] === true,
    };
}

/* ---------- Step order ---------- */

export type StepPath =
    | "personal-information"
    | "educational-information"
    | "experience"
    | "emergency-contact"
    | "documents"
    | "contract-sign";

/**
 * Personal information always shows (name + email are mandatory). contract-sign
 * is always the last step, because it holds the confirmation and the submit
 * button. Its upload fields follow the "other" section.
 */
const STEPS: { path: StepPath; section: SectionKey | null }[] = [
    { path: "personal-information", section: null },
    { path: "educational-information", section: "educational" },
    { path: "experience", section: "experience" },
    { path: "emergency-contact", section: "emergency" },
    { path: "documents", section: "documents" },
    { path: "contract-sign", section: null },
];

export const isStepVisible = (layout: ResolvedLayout, path: StepPath) => {
    const step = STEPS.find((s) => s.path === path);
    return !step?.section || sectionHelpers(layout[step.section]).visible;
};

const visibleSteps = (layout: ResolvedLayout) =>
    STEPS.filter((s) => isStepVisible(layout, s.path)).map((s) => s.path);

/** Next visible step after `current` (even if `current` itself is hidden). */
export function nextStep(layout: ResolvedLayout, current: StepPath): StepPath {
    const order = STEPS.map((s) => s.path);
    const visible = visibleSteps(layout);
    return (
        order.slice(order.indexOf(current) + 1).find((p) => visible.includes(p)) ??
        "contract-sign"
    );
}

/** Previous visible step before `current`. */
export function prevStep(layout: ResolvedLayout, current: StepPath): StepPath {
    const order = STEPS.map((s) => s.path);
    const visible = visibleSteps(layout);
    return (
        order
            .slice(0, order.indexOf(current))
            .reverse()
            .find((p) => visible.includes(p)) ?? "personal-information"
    );
}
