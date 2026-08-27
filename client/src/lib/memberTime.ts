export type MemberNow = {
  hour: number;
  minute: number;
  dateStr: string;
};

export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function getNowInTimezone(timeZone: string, now: Date = new Date()): MemberNow {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value ?? "0";
  return {
    hour: Number(part("hour")),
    minute: Number(part("minute")),
    dateStr: `${part("year")}-${part("month")}-${part("day")}`,
  };
}

export function weekdayForLocalDate(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00Z`).getUTCDay();
}
