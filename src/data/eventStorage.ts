export interface CalendarEvent {
  id: number;
  title: string;
  description: string | null;
  start_datetime: string;
  end_datetime: string;
  location: string | null;
  creator_name: string;
  event_type?: "in-person" | "online";
  meet_link?: string | null;
  attendees?: string[];
}

const STORAGE_KEY = "calendar_events";

export const eventStorage = {
  getAll(): CalendarEvent[] {
    if (typeof window === "undefined") return [];

    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  },

  add(event: CalendarEvent) {
    const events = this.getAll();

    events.push(event);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  },

  delete(id: number) {
    const events = this.getAll().filter((event) => event.id !== id);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  },

  /** Replace the saved event that has the same id. */
  update(event: CalendarEvent) {
    const events = this.getAll().map((saved) => (saved.id === event.id ? event : saved));

    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  },
};
