export const NAIROBI_TZ = "Africa/Nairobi";

export function formatKes(n: number): string {
  return `KES ${Math.round(n).toLocaleString("en-KE")}`;
}

export function iso(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return String(value);
}

export function formatWhen(isoStr: string | null | undefined): string {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-KE", {
    timeZone: NAIROBI_TZ,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatClock(isoStr: string | null | undefined): string {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-KE", {
    timeZone: NAIROBI_TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDay(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleDateString("en-KE", {
    timeZone: NAIROBI_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function elapsed(fromIso: string | null | undefined): string {
  if (!fromIso) return "0:00";
  const start = new Date(fromIso).getTime();
  if (Number.isNaN(start)) return "0:00";
  const secs = Math.floor((Date.now() - start) / 1000);
  if (secs < 0) {
    const s = Math.abs(secs);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `-${m}:${rem.toString().padStart(2, "0")}`;
  }
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}


export function maskPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  let local = digits;
  if (local.startsWith("254") && local.length >= 12) local = "0" + local.slice(3);
  if (local.length < 7) return local;
  return `${local.slice(0, 4)}***${local.slice(-3)}`;
}

export function normalizeKePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12 && digits[3] === "7") {
    return "0" + digits.slice(3);
  }
  if (digits.startsWith("07") && digits.length === 10) return digits;
  if (digits.startsWith("011") && digits.length === 10) return digits;
  if (digits.startsWith("01") && digits.length === 10) return digits;
  return null;
}

export function randomRef(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "RHI";
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export function pad16(s: string): string {
  const t = s.slice(0, 16);
  return t + " ".repeat(16 - t.length);
}
