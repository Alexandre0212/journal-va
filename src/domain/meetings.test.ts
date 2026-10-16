import { describe, expect, it } from "vitest";
import { meetingTiming } from "@/domain/meetings";

describe("réunions", () => {
  it("distingue une réunion passée, du jour et à venir", () => {
    expect(meetingTiming("2026-10-13", "14:00", "2026-10-16", 12 * 60)).toBe("past");
    expect(meetingTiming("2026-10-20", "09:00", "2026-10-16", 12 * 60)).toBe("upcoming");
    expect(meetingTiming("2026-10-16", "18:00", "2026-10-16", 12 * 60)).toBe("upcoming");
    expect(meetingTiming("2026-10-16", "09:00", "2026-10-16", 12 * 60)).toBe("today");
    expect(meetingTiming("2026-10-16", null, "2026-10-16", 12 * 60)).toBe("today");
  });
});
