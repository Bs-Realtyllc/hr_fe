// Types used only by the calendar feature.

/** One row of GET /holidays. Mirrors hr_be holiday.repository. */
export interface Holiday {
    id: number;
    name: string;
    message: string | null;
    /** "YYYY-MM-DD" (drizzle date column in string mode) */
    holiday_date: string;
    year: number;
}

/** One row of GET /employees, as the calendar uses it (attendees). */
export interface Employee {
    id: number;
    name: string;
    email: string;
    designation?: string;
    department?: string;
    profile_picture?: string | null;
}
