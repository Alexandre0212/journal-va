export type MeetingTiming = "upcoming" | "today" | "past";

export function meetingTiming(date: string, start: string | null, today: string, minutesNow: number): MeetingTiming {
  if (date > today) return "upcoming";
  if (date < today) return "past";
  if (!start || !/^\d{2}:\d{2}$/.test(start)) return "today";
  const [hour, minute] = start.split(":").map(Number);
  return hour * 60 + minute > minutesNow ? "upcoming" : "today";
}
