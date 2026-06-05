import { eventTargetDate } from "@/lib/event-prep-countdown";

function formatIcsDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}00`
  );
}

/** Download a single .ics file for the school event. */
export function downloadEventCalendarIcs(opts: {
  eventId: string;
  eventName: string;
  nextDate: string;
  overview?: string;
}) {
  const start = eventTargetDate(opts.nextDate);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const uid = `event-prep-${opts.eventId}@amynest.in`;
  const desc = (opts.overview ?? "").replace(/\n/g, "\\n");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AmyNest//Event Prep//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${opts.eventName}`,
    desc ? `DESCRIPTION:${desc}` : "",
    "BEGIN:VALARM",
    "TRIGGER:-P3D",
    "ACTION:DISPLAY",
    "DESCRIPTION:Event Prep — 3 days to go!",
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    "DESCRIPTION:Event Prep — tomorrow!",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${opts.eventName.replace(/\s+/g, "-").toLowerCase()}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Google Calendar deep link (fallback on desktop). */
export function googleCalendarUrl(opts: {
  eventName: string;
  nextDate: string;
  overview?: string;
}): string {
  const start = eventTargetDate(opts.nextDate);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.eventName,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: opts.overview ?? "School event — prep with AmyNest Event Prep",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
