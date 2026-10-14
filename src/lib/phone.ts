export function normalizePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  let local = d;
  if (local.startsWith("251")) local = "0" + local.slice(3);
  if (local.length === 9 && /^[79]/.test(local)) local = "0" + local;
  return /^0[79]\d{8}$/.test(local) ? local : null;
}
export const phoneToEmail = (p: string) => `${p}@phone.tender-app.local`;
