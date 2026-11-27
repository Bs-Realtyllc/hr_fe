export interface MeetingEvent {
  id: number;
  title: string;
  description: string | null;
  start_datetime: string;
  end_datetime: string;
  attendees: string[] | null;
  meet_link: string | null;
  creator_name: string | null;
}

const STORAGE_KEY = "calendar_meetings";

export const meetingStorage = {
  getAll(): MeetingEvent[] {
    if (typeof window === "undefined") return [];

    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  save(meetings: MeetingEvent[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meetings));
  },

  add(meeting: MeetingEvent) {
    const meetings = this.getAll();
    meetings.push(meeting);
    this.save(meetings);
  },

  delete(id: number) {
    const meetings = this.getAll().filter((meeting) => meeting.id !== id);
    this.save(meetings);
  },

  /** Replace the saved meeting that has the same id. */
  update(meeting: MeetingEvent) {
    this.save(this.getAll().map((saved) => (saved.id === meeting.id ? meeting : saved)));
  },
};
