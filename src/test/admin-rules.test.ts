import { describe, expect, it } from "vitest";
import { ANNUAL_PAYMENT, paymentSchema, userEditSchema } from "@/lib/admin-rules";
const id = "00000000-0000-4000-8000-000000000001";
describe("Admin payment and phone rules", () => {
  it("defaults an annual payment to 2000 birr for 365 days", () => {
    expect(ANNUAL_PAYMENT).toEqual({ days: 365, amount: 2000 });
  });
  it("rejects payments without a positive collected amount", () => {
    expect(paymentSchema.safeParse({ id, userId: id, days: 365, amount: 0, note: "" }).success).toBe(false);
  });
  it("preserves the owner's phone as a valid login number", () => {
    expect(userEditSchema.parse({ id, name: "Temesgen", phone: "+251911992906" }).phone).toBe("0911992906");
  });
});