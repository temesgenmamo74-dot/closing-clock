export const PRIORITY_CATEGORIES = ["ኬሚካል እና ላብራቶሪ ዕቃዎች", "የመኪና ኪራይ፣ ሽያጭ እና ሊዝ", "የመኪና መለዋወጫ", "ኮንስትራክሽን", "ጠቅላላ ግዥ"] as const;

export function classifyTender(text: string): string {
  if (/chemical|reagent|laborator|water\s*(test|kit)|ኬሚካል|ላብራ|ሬጀንት|የውሃ መፈተሻ/i.test(text)) return PRIORITY_CATEGORIES[0];
  if (/spare\s*part|መለዋወጫ/i.test(text)) return PRIORITY_CATEGORIES[2];
  if (/vehicle|car\s*(rental|sale)|lease|ተሽከርካሪ|መኪና|ሊዝ/i.test(text)) return PRIORITY_CATEGORIES[1];
  if (/construction|building|cement|ኮንስትራክሽን|ግንባታ|ሲሚንቶ/i.test(text)) return PRIORITY_CATEGORIES[3];
  if (/medical|ሕክምና|ህክምና/i.test(text)) return "ሕክምና";
  return PRIORITY_CATEGORIES[4];
}

export function tenderCategory(category: string | null, text = ""): string {
  if (category && PRIORITY_CATEGORIES.some(c => c === category)) return category;
  if (/ኬሚካል|ላብራ|መለዋወጫ|ተሽከርካሪ/.test(category ?? "")) return classifyTender(`${category} ${text}`);
  if (category === "ህክምና") return "ሕክምና";
  return category ?? classifyTender(text);
}

export function daysRemaining(deadline: string | null, now = Date.now()): number | null {
  if (!deadline || !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return null;
  // Calendar-day countdown in Ethiopia, not the browser's local timezone.
  const today = new Date(now + 3 * 3600000).toISOString().slice(0, 10);
  return Math.round((Date.parse(`${deadline}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
}

export function formatEthiopianDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T12:00:00+03:00` : value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("am-ET-u-ca-ethiopic", { year: "numeric", month: "long", day: "numeric", timeZone: "Africa/Addis_Ababa" }).format(date);
}

export function subscriptionStatus(profile: { paid_until: string | null; trial_ends_at: string }, now = Date.now()): "paid" | "trial" | "expired" {
  if (profile.paid_until && Date.parse(profile.paid_until) > now) return "paid";
  return Date.parse(profile.trial_ends_at) > now ? "trial" : "expired";
}