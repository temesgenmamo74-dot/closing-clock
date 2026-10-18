import { z } from "zod";
import { normalizePhone } from "@/lib/phone";

export const ANNUAL_PAYMENT = { days: 365, amount: 2000 } as const;
export const paymentSchema = z.object({
  id: z.string().uuid(), userId: z.string().uuid(),
  days: z.number().int().min(1).max(3650),
  amount: z.number().finite().positive().max(10000000),
  note: z.string().trim().max(1000),
});
export const userEditSchema = z.object({
  id: z.string().uuid(), name: z.string().trim().min(1).max(100),
  phone: z.string().transform((v, ctx) => {
    const phone = normalizePhone(v);
    if (!phone) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: "ትክክለኛ ስልክ ቁጥር ያስገቡ" }); return z.NEVER; }
    return phone;
  }),
});