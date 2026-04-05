import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseDateTime(input?: string): { date: Date; formattedDate: string; formattedTime: string } {
  const now = new Date();

  let datePart = now;
  let timePart = { hours: 12, minutes: 0, seconds: 0 };

  if (input) {
    const parsed = new Date(input);

    if (!isNaN(parsed.getTime())) {
      datePart = parsed;

      const hasTime = input.includes("T") && /\d{2}:\d{2}/.test(input.split("T")[1]);
      if (hasTime) {
        timePart = { hours: parsed.getHours(), minutes: parsed.getMinutes(), seconds: parsed.getSeconds() };
      }
    }
  }

  const finalDate = new Date(
    datePart.getFullYear(),
    datePart.getMonth(),
    datePart.getDate(),
    timePart.hours,
    timePart.minutes,
    timePart.seconds
  );

  const formattedDate = finalDate.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  const formattedTime = finalDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return { date: finalDate, formattedDate, formattedTime };
}
