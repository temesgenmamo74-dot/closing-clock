import { describe, expect, it } from "vitest";
import { classifyTender, daysRemaining, formatEthiopianDate, PRIORITY_CATEGORIES, subscriptionStatus } from "@/lib/tender-rules";

describe("Tender requirements", () => {
  it("bundles water kits with chemicals and laboratory equipment", () => {
    expect(classifyTender("Water testing kits and reagents")).toBe("ኬሚካል እና ላብራቶሪ ዕቃዎች");
    expect(PRIORITY_CATEGORIES).toHaveLength(5);
  });
  it("distinguishes spare parts from vehicle rental", () => {
    expect(classifyTender("Vehicle spare parts")).toBe("የመኪና መለዋወጫ");
    expect(classifyTender("Vehicle rental")).toBe("የመኪና ኪራይ፣ ሽያጭ እና ሊዝ");
  });
  it("counts Ethiopia calendar days and never treats an unknown deadline as open", () => {
    expect(daysRemaining("2026-11-02", Date.parse("2026-11-01T05:04:00Z"))).toBe(1);
    expect(daysRemaining("2026-11-01", Date.parse("2026-11-01T21:01:00Z"))).toBe(-1);
    expect(daysRemaining(null)).toBeNull();
  });
  it("converts to the Ethiopian year rather than Gregorian month transliteration", () => {
    expect(formatEthiopianDate("2026-11-01")).toContain("2019");
    expect(formatEthiopianDate("2026-11-01")).toContain("ጥቅምት");
  });
  it("prioritizes paid access and expires at the exact boundary", () => {
    const now = Date.parse("2026-11-01T05:00:00Z");
    expect(subscriptionStatus({ paid_until: "2026-11-02", trial_ends_at: "2026-11-03" }, now)).toBe("paid");
    expect(subscriptionStatus({ paid_until: null, trial_ends_at: "2026-11-03" }, now)).toBe("trial");
    expect(subscriptionStatus({ paid_until: null, trial_ends_at: "2026-11-01T05:00:00Z" }, now)).toBe("expired");
  });
});