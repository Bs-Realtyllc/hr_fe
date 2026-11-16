// Attendance "day" boundaries are always decided server-side in Nepal time
// (see hr_be/src/pkg/timezone.ts). Everyone sees times in Nepal time too,
// regardless of their own device's timezone, so there's one number to read.
export function formatTimeNepal(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: "Asia/Kathmandu",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Today's date in Nepal time, as YYYY-MM-DD — matches the `clockDate` the
// backend attributes attendance records to, so the UI can label "Today".
export function nepalTodayString(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kathmandu" });
}
