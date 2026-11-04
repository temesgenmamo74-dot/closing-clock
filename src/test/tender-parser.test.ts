import { describe, it, expect } from "vitest";
import { parseDate, parseGetChereta, parseTelegram, getDetailLinks } from "@/lib/tender-parser";

const now = Date.parse("2026-10-20T05:04:00Z");
const html = `<div class="job-info-box"><h1>Laboratory reagents</h1><table><tr><td>Procuring Entity</td><td>University</td></tr><tr><td>Reference No</td><td>LAB-42</td></tr><tr><td>Submission Deadline</td><td>2026-11-02 10:59:17</td></tr><tr><td>Physical Address:</td><td>Room 104, Addis Ababa</td></tr><tr><td>Contact Details:</td><td>Tel: +251 115530423</td></tr></table></div><div class="widget_getintuch"><li><strong>Deadline</strong>02 Nov 2026, 10:59 AM</li></div>`;
describe("Source integrity", () => {
  it("keeps exact source dates, references and contact details", () => {
    const t = parseGetChereta(html,"https://www.getchereta.com/tender/42",now);
    expect(t?.deadline).toBe("2026-11-02"); expect(t?.phone).toBe("+251 115530423"); expect(t?.reference).toBe("LAB-42");
    expect(t?.category).toBe("ኬሚካል እና ላብራቶሪ ዕቃዎች");
  });
  it("rejects conflicting, missing and expired deadlines", () => {
    expect(parseGetChereta(html.replace("02 Nov 2026","03 Nov 2026"),"https://example.org",now)).toBeNull();
    expect(parseGetChereta(html,"https://example.org",Date.parse("2026-11-03"))).toBeNull();
    expect(parseGetChereta('<div class="job-info-box"><h1>Tender</h1></div>',"https://example.org",now)).toBeNull();
  });
  it("skips tenders closing in under 5 days", () => {
    expect(parseGetChereta(html,"https://example.org",Date.parse("2026-10-29T05:00:00Z"))).toBeNull();
    expect(parseGetChereta(html,"https://example.org",Date.parse("2026-10-27T05:00:00Z"))).not.toBeNull();
  });
  it("writes an Amharic overview before the original notice", () => {
    expect(parseGetChereta(html,"https://x",now)?.summary.startsWith("ጨረታ፦")).toBe(true);
  });
  it("does not invent ambiguous or invalid dates", () => {
    expect(parseDate("22/02/2019 ዓ.ም")).toBeNull(); expect(parseDate("2026-02-30")).toBeNull();
    expect(parseTelegram('<div class="tgme_widget_message"><div class="tgme_widget_message_text">ጨረታ በ15 ቀናት ይዘጋል</div></div>',"https://t.me/s/channel",now)).toEqual([]);
  });
  it("only follows detail URLs on the verified publisher", () => {
    expect(getDetailLinks('<a href="/tender/42">A</a><a href="https://localhost/tender/1">B</a><a href="/tender/42">C</a>',"https://www.getchereta.com")).toEqual(["https://www.getchereta.com/tender/42"]);
  });
});
import { amharicSummary as _as } from "@/lib/tender-parser";
describe("amharic key facts", () => {
  it("extracts stated document price and CPO only", () => {
    const s = _as("t", "Org", "2026-12-01", "Bid document price ETB 600. Bid security of 100,000.00 ETB required.", { phone: "0911", address: "Addis" });
    expect(s).toContain("የሰነድ መግዣ ዋጋ፦ ብር 600");
    expect(s).toContain("የጨረታ ማስከበሪያ (CPO)፦ 100,000.00 ብር");
    expect(s).toContain("ስልክ፦ 0911");
  });
  it("omits fee and CPO when not stated", () => {
    const s = _as("t", null, "2026-12-01", "Bid security 0 ETB");
    expect(s).not.toContain("CPO");
    expect(s).not.toContain("የሰነድ");
  });
});
import { parsePPS } from "@/lib/tender-parser";
describe("PPS government notices", () => {
  const pps = `<article><p>Abridged Tender Notice ${"x ".repeat(250)}</p><table><tr><td>Lot No.</td><td>Item Description</td><td>QTY</td><td>Lot Ref. No.</td><td>Bid Submission Deadline</td></tr><tr><td>Lot-6</td><td>Office Furniture</td><td>Assorted</td><td>PPS-ICB-G-0011</td><td>Nov. 9, 2026 at 10:00 AM</td></tr></table><p>Tel. 011-1-223722</p></article>`;
  it("reads the lot deadline exactly as published", () => {
    const t = parsePPS(pps, "https://pps.gov.et/procurement-tender-notice", Date.parse("2026-10-20"));
    expect(t).toHaveLength(1); expect(t[0]?.deadline).toBe("2026-11-09"); expect(t[0]?.reference).toBe("PPS-ICB-G-0011");
  });
  it("skips lots closing within 5 days", () => {
    expect(parsePPS(pps, "https://pps.gov.et/x", Date.parse("2026-11-06"))).toEqual([]);
  });
});
