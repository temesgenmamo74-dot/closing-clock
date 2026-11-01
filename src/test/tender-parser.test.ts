import { describe, it, expect } from "vitest";
import { parseDate, parseGetChereta, parseTelegram, getDetailLinks } from "@/lib/tender-parser";

const now = Date.parse("2026-11-01T05:04:00Z");
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
  it("does not invent ambiguous or invalid dates", () => {
    expect(parseDate("22/02/2019 ዓ.ም")).toBeNull(); expect(parseDate("2026-02-30")).toBeNull();
    expect(parseTelegram('<div class="tgme_widget_message"><div class="tgme_widget_message_text">ጨረታ በ15 ቀናት ይዘጋል</div></div>',"https://t.me/s/channel",now)).toEqual([]);
  });
  it("only follows detail URLs on the verified publisher", () => {
    expect(getDetailLinks('<a href="/tender/42">A</a><a href="https://localhost/tender/1">B</a><a href="/tender/42">C</a>',"https://www.getchereta.com")).toEqual(["https://www.getchereta.com/tender/42"]);
  });
});