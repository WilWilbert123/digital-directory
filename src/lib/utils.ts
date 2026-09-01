import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export const KIOSK_ID = process.env.NEXT_PUBLIC_KIOSK_ID ?? "kiosk-lobby-01";
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "BISPOS Digital Directory";
