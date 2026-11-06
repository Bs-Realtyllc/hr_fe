import type { OnboardingData } from "./OnboardingContext";
import { sectionHelpers, type ResolvedLayout } from "./formLayout";

/**
 * Builds the multipart body for POST /onboard (hr_be onboard.routes.ts).
 *
 * - `payload`: one JSON string with every text field, in the backend's snake_case.
 * - Files: one part per upload field, except `otherDocument`, which repeats once per
 *   file (up to MAX_OTHER_DOCUMENTS). `educationCertificate_<i>` and
 *   `experienceLetter_<i>` belong to `education_info[i]` / `previous_experience_info[i]`,
 *   so the index must match the entry's position in the payload array.
 *
 * Fields the form layout hides are sent as null (files: not sent at all), so a value
 * typed before a layout change can't sneak through.
 *
 * File paths are never sent in the payload; the backend fills them from the uploads.
 */

/** Max education / experience entries the form allows (backend accepts up to 5). */
export const MAX_ENTRIES = 4;

/** Max "other documents" files (backend: MAX_OTHER_DOCUMENTS, multer maxCount). */
export const MAX_OTHER_DOCUMENTS = 4;

export type OnboardRole = "intern" | "employee";

export type EducationPayloadEntry = {
    education_level: string;
    institution_name: string;
    field_of_study: string;
    still_enrolled: boolean;
    graduation_date: string | null; // 'YYYY-MM-DD'
};

export type ExperiencePayloadEntry = {
    company: string;
    role: string;
    start_date: string; // 'YYYY-MM-DD'
    end_date: string | null;
    still_working: boolean;
    employment_type: "part-time" | "full-time" | null;
    work_location: "remote" | "physical" | "hybrid" | null;
    description: string | null;
};

export type OnboardPayload = {
    name: string;
    email: string;
    role: OnboardRole;
    dob: string | null;
    gender: "male" | "female" | "other" | "prefer_not_to_say" | null;
    nationality: string | null;
    phone: string | null;
    current_address: string | null;
    permanent_address: string | null;
    linkedin_url: string | null;
    github_url: string | null;
    portfolio_url: string | null;
    education_info: EducationPayloadEntry[] | null;
    previous_experience_info: ExperiencePayloadEntry[] | null;
    emergency_contact_name: string | null;
    emergency_contact_relation: string | null;
    emergency_contact_phone: string | null;
    emergency_contact_email: string | null;
    emergency_contact_address: string | null;
};

/** Trimmed string, or null when empty. */
const text = (value: string | null | undefined) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
};

const oneOf = <T extends string>(value: string, allowed: readonly T[]): T | null =>
    (allowed as readonly string[]).includes(value) ? (value as T) : null;

const GENDERS = ["male", "female", "other", "prefer_not_to_say"] as const;
const EMPLOYMENT_TYPES = ["part-time", "full-time"] as const;
const WORK_LOCATIONS = ["remote", "physical", "hybrid"] as const;

export function buildOnboardFormData(
    data: OnboardingData,
    role: OnboardRole,
    layout: ResolvedLayout,
): FormData {
    const { personalInfo: p, emergencyContact: ec, documents, contractDocuments } = data;
    const personal = sectionHelpers(layout.personal);
    const edu = sectionHelpers(layout.educational);
    const exp = sectionHelpers(layout.experience);
    const emergency = sectionHelpers(layout.emergency);
    const docs = sectionHelpers(layout.documents);
    const other = sectionHelpers(layout.other);

    /** value if `field` is in the section's layout, else null */
    const pick = <T,>(shown: boolean, value: T): T | null => (shown ? value : null);

    // Drop boxes the candidate left completely blank, then cap. Files are matched
    // to entries after this, so indexes stay aligned with the payload arrays.
    const educations = edu.visible
        ? data.educations
              .filter((e) => e.educationLevel || e.institution.trim() || e.degree.trim() || e.graduationYear || e.document)
              .slice(0, MAX_ENTRIES)
        : [];
    const experiences = exp.visible
        ? data.experiences
              .filter((e) => e.company.trim() || e.role.trim() || e.startDate || e.description.trim() || e.document)
              .slice(0, MAX_ENTRIES)
        : [];

    // "Still enrolled/working" only applies when that checkbox is in the layout.
    const enrolled = (e: (typeof educations)[number]) => edu.show("stillEnrolled") && e.currentEnrollment;
    const working = (e: (typeof experiences)[number]) => exp.show("stillWorking") && e.currentWorking;

    const permanentAddress =
        data.sameAsCurrent && personal.show("currentAddress") ? p.currentAddress : p.permanentAddress;

    const payload: OnboardPayload = {
        name: p.name.trim(),
        email: p.email.trim().toLowerCase(),
        role,
        dob: pick(personal.show("dob"), p.dob || null),
        gender: pick(personal.show("gender"), oneOf(p.gender, GENDERS)),
        nationality: pick(personal.show("nationality"), text(p.nationality)),
        phone: pick(personal.show("phone"), text(p.phone)),
        current_address: pick(personal.show("currentAddress"), text(p.currentAddress)),
        permanent_address: pick(personal.show("permanentAddress"), text(permanentAddress)),
        linkedin_url: pick(personal.show("linkedinUrl"), text(p.linkedin)),
        github_url: pick(personal.show("githubUrl"), text(p.github)),
        portfolio_url: pick(personal.show("portfolioUrl"), text(p.portfolio)),

        education_info: educations.length
            ? educations.map((e) => ({
                  education_level: edu.show("educationLevel") ? e.educationLevel : "",
                  institution_name: edu.show("institutionName") ? e.institution.trim() : "",
                  field_of_study: edu.show("fieldOfStudy") ? e.degree.trim() : "",
                  still_enrolled: enrolled(e),
                  graduation_date:
                      edu.show("graduationDate") && !enrolled(e) ? e.graduationYear || null : null,
              }))
            : null,

        previous_experience_info: experiences.length
            ? experiences.map((e) => ({
                  company: exp.show("company") ? e.company.trim() : "",
                  role: exp.show("role") ? e.role.trim() : "",
                  start_date: exp.show("startDate") ? e.startDate : "",
                  end_date: exp.show("endDate") && !working(e) ? e.endDate || null : null,
                  still_working: working(e),
                  employment_type: pick(exp.show("employmentType"), oneOf(e.employeeType, EMPLOYMENT_TYPES)),
                  work_location: pick(exp.show("workLocation"), oneOf(e.workType, WORK_LOCATIONS)),
                  description: pick(exp.show("description"), text(e.description)),
              }))
            : null,

        emergency_contact_name: pick(emergency.show("emergencyContactName"), text(ec.fullName)),
        emergency_contact_relation: pick(emergency.show("emergencyContactRelation"), text(ec.relationship)),
        emergency_contact_phone: pick(emergency.show("emergencyContactPhone"), text(ec.phone)),
        emergency_contact_email: pick(emergency.show("emergencyContactEmail"), text(ec.email)?.toLowerCase() ?? null),
        emergency_contact_address: pick(emergency.show("emergencyContactAddress"), text(ec.address)),
    };

    const formData = new FormData();
    formData.append("payload", JSON.stringify(payload));

    const addFile = (field: string, shown: boolean, file: File | null | undefined) => {
        if (shown && file) formData.append(field, file, file.name);
    };

    // Single-file fields (maxCount 1 each on the backend)
    addFile("passportPhoto", docs.show("photoPath"), documents.passportSizePhoto);
    addFile("idFront", docs.show("idFrontPath"), documents.citizenshipFront);
    addFile("idBack", docs.show("idBackPath"), documents.citizenshipBack);
    addFile("panFront", docs.show("panFrontPath"), documents.panFront);
    addFile("panBack", docs.show("panBackPath"), documents.panBack);
    addFile("additionalDocument", docs.show("additionalDocumentPath"), documents.additional);
    addFile("contract", other.show("contractPath"), contractDocuments.signedContract);
    // Same field name repeated; the backend stores them as other_document_paths[].
    contractDocuments.otherEmployment
        .slice(0, MAX_OTHER_DOCUMENTS)
        .forEach((file) => addFile("otherDocument", other.show("otherDocumentPath"), file));

    // Per-entry files. The upload box is hidden while still enrolled / still working,
    // so a file picked before ticking that box isn't sent.
    educations.forEach((e, i) =>
        addFile(`educationCertificate_${i}`, edu.show("certificate") && !enrolled(e), e.document),
    );
    experiences.forEach((e, i) =>
        addFile(`experienceLetter_${i}`, exp.show("experienceLetter") && !working(e), e.document),
    );

    return formData;
}
