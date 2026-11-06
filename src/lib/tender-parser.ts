import { parseHTML } from "linkedom";
import { amharicTitle } from "@/lib/title-translate";
import { classifyTender, daysRemaining } from "@/lib/tender-rules";

export type ParsedTender = { title: string; organization: string | null; category: string; summary: string; posted_date: string | null; deadline: string; address: string | null; phone: string | null; email: string | null; link: string; reference: string | null };
export const MIN_DAYS_LEFT = 3;
// Short-notice proformas (under MIN_DAYS_LEFT) are skipped: bidders cannot prepare in time.
const tooSoon = (deadline: string, now: number) => (daysRemaining(deadline, now) ?? -1) < MIN_DAYS_LEFT;
const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

export function parseDate(text: string): string | null {
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  let value = iso?.[0] ?? null;
  if (!value) {
    const english = text.match(/\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(20\d{2})\b/i);
    if (english) {
      const month = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf((english[2] ?? "").toLowerCase()) + 1;
      value = `${english[3]}-${String(month).padStart(2,"0")}-${(english[1] ?? "").padStart(2,"0")}`;
    }
  }
  if (!value) {
    // Month-first English, e.g. "Nov. 9, 2026" (PPS notices).
    const mf = text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(20\d{2})\b/i);
    if (mf) {
      const month = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf((mf[1] ?? "").toLowerCase()) + 1;
      value = `${mf[3]}-${String(month).padStart(2,"0")}-${(mf[2] ?? "").padStart(2,"0")}`;
    }
  }
  if (!value) return null;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10) === value ? value : null;
}

export function getDetailLinks(html: string, base: string): string[] {
  const { document } = parseHTML(html);
  return [...new Set(Array.from(document.querySelectorAll("a[href]")).flatMap(a => {
    try {
      const url = new URL(a.getAttribute("href") ?? "", base);
      return url.hostname.replace(/^www\./,"") === "getchereta.com" && /^\/tender\/\d+$/.test(url.pathname) ? [url.href] : [];
    } catch { return []; }
  }))];
}

export function parseGetChereta(html: string, link: string, now = Date.now()): ParsedTender | null {
  const { document } = parseHTML(html);
  const content = document.querySelector(".job-info-box");
  const title = clean(content?.querySelector("h1")?.textContent);
  if (!content || !title) return null;
  const fields = new Map<string,string>();
  for (const row of Array.from(content.querySelectorAll("tr"))) {
    const cells = row.querySelectorAll("td");
    if (cells.length >= 2) fields.set(clean(cells[0]!.textContent).replace(/:$/, "").toLowerCase(), clean(cells[1]!.textContent));
  }
  for (const li of Array.from(document.querySelectorAll(".widget_getintuch li"))) {
    const label = clean(li.querySelector("strong")?.textContent);
    if (label) fields.set(label.toLowerCase(), clean(li.textContent).slice(label.length).trim());
  }
  const deadline = parseDate(fields.get("submission deadline") ?? fields.get("deadline") ?? "");
  const secondary = parseDate(fields.get("deadline") ?? "");
  if (!deadline || (secondary && secondary !== deadline) || tooSoon(deadline, now)) return null;
  const text = clean(content.textContent);
  const address = fields.get("physical address") ?? fields.get("address") ?? null;
  const contact = fields.get("contact details") ?? address ?? "";
  const phone = contact.match(/(?:\+251|00251|0[179])(?:[\s().-]*\d){7,12}/g)?.join(" / ") ?? null;
  // Text cells are concatenated without spaces; stop before a following capitalised label.
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?=[A-Z]|[^A-Za-z]|$)/)?.[0] ?? null;
  const organization = fields.get("procuring entity") ?? fields.get("company") ?? null;
  const reference = fields.get("reference no") ?? null;
  // Dictionary titles are generic; append issuer and reference so distinct notices never look like duplicates.
  const am = amharicTitle(title);
  const finalTitle = am === title ? title : [am, organization, reference].filter(Boolean).join(" — ");
  return { title: finalTitle, organization, category: classifyTender(`${title} ${fields.get("categories") ?? ""}`), summary: amharicSummary(finalTitle, organization, deadline, text.replace(/Save Tender\s*$/, ""), { phone, address }).slice(0,24000), posted_date: parseDate(fields.get("invitation date") ?? ""), deadline, address, phone, email, reference, link };
}

// Only explicitly labelled Gregorian deadlines are accepted; Ethiopian or relative dates remain unguessed.
export function parseTelegram(html: string, base: string, now = Date.now()): ParsedTender[] {
  const { document } = parseHTML(html);
  return Array.from(document.querySelectorAll(".tgme_widget_message")).flatMap(post => {
    const text = clean(post.querySelector(".tgme_widget_message_text")?.textContent);
    if (!/tender|bid|ጨረታ/i.test(text)) return [];
    const deadline = parseDate(text.match(/(?:deadline|closing date|የመዝጊያ ቀን)\s*[:：-]?\s*(20\d{2}-\d{2}-\d{2})/i)?.[1] ?? "");
    if (!deadline || tooSoon(deadline, now)) return [];
    const link = post.querySelector(".tgme_widget_message_date")?.getAttribute("href") ?? base;
    const organization = text.match(/(?:organization|company|ተቋም)\s*[:：]\s*([^;\n]{3,120})/i)?.[1] ?? null;
    return [{title:text.slice(0,180), organization, category:classifyTender(text), summary:amharicSummary(text.slice(0,180), organization, deadline, text), posted_date:parseDate(post.querySelector("time")?.getAttribute("datetime") ?? ""), deadline, address:null, phone:text.match(/(?:\+251|0[179])(?:[\s.-]*\d){7,12}/g)?.join(" / ") ?? null, email:text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null, link, reference:null}];
  });
}
const AMOUNT = String.raw`((?:ETB|Birr|ብር)\s*[\d,]+(?:\.\d+)?|[\d,]+(?:\.\d+)?\s*(?:ETB|Birr|ብር))`;
// Pull an explicitly stated amount near a keyword; null when the notice does not say it.
function amountNear(text: string, keyword: RegExp): string | null {
  const m = text.match(new RegExp(`(?:${keyword.source})[^.\\n]{0,80}?${AMOUNT}`, "i"));
  const v = m?.[1]?.replace(/\s+/g, " ").trim();
  if (!v || /^(?:ETB|Birr|ብር)?\s*0(?:\.0+)?\s*(?:ETB|Birr|ብር)?$/i.test(v)) return null;
  return v.replace(/ETB|Birr/i, "ብር");
}

// Amharic key facts built only from explicitly stated values; the original notice follows verbatim.
export function amharicSummary(title: string, organization: string | null, deadline: string, original: string, extra: { phone?: string | null; address?: string | null } = {}): string {
  const lines = [`ጨረታ፦ ${title}`];
  if (organization) lines.push(`አውጪ ተቋም፦ ${organization}`);
  lines.push(`መዝጊያ ቀን፦ ${deadline} (እንደ ምንጩ)`);
  const doc = amountNear(original, /document|bid document|ሰነድ/);
  if (doc) lines.push(`የሰነድ መግዣ ዋጋ፦ ${doc}`);
  const cpo = amountNear(original, /bid security|bid bond|CPO|ማስከበሪያ/);
  if (cpo) lines.push(`የጨረታ ማስከበሪያ (CPO)፦ ${cpo}`);
  if (extra.address) lines.push(`አድራሻ፦ ${extra.address}`);
  if (extra.phone) lines.push(`ስልክ፦ ${extra.phone}`);
  lines.push("", "ዋናው ማስታወቂያ (ከምንጩ እንደወጣ)፦", original);
  return lines.join("\n");
}

// Federal Public Procurement Service: one tender per lot row with an explicit lot reference and deadline.
export function parsePPS(html: string, link: string, now = Date.now()): ParsedTender[] {
  const { document } = parseHTML(html);
  const out = new Map<string, ParsedTender>();
  const organization = "Federal Public Procurement Service (PPS)";
  for (const table of Array.from(document.querySelectorAll("table"))) {
    const rows = Array.from(table.querySelectorAll("tr"));
    const header = Array.from(rows[0]?.querySelectorAll("td,th") ?? []).map(c => clean(c.textContent).toLowerCase());
    const iItem = header.findIndex(h => h.includes("description")), iRef = header.findIndex(h => h.includes("ref")), iDl = header.findIndex(h => h.includes("submission"));
    if (iItem < 0 || iRef < 0 || iDl < 0) continue;
    let block = table.parentElement; while (block && clean(block.textContent).length < 400 && block.parentElement) block = block.parentElement;
    const text = clean(block?.textContent);
    const phone = text.match(/Tel\.?\s*([0-9/\s-]{9,40})/i)?.[1]?.trim() ?? null;
    for (const row of rows.slice(1)) {
      const cells = Array.from(row.querySelectorAll("td")).map(c => clean(c.textContent));
      const item = cells[iItem], reference = cells[iRef], deadline = parseDate(cells[iDl] ?? "");
      if (!item || !reference || !deadline || tooSoon(deadline, now) || out.has(reference)) continue;
      const am = amharicTitle(item);
      const title = [am === item ? item : am, organization, reference].join(" — ");
      out.set(reference, { title, organization, category: classifyTender(item), summary: amharicSummary(title, organization, deadline, text.slice(0, 6000), { phone, address: "Addis Ababa, Ethiopia" }), posted_date: null, deadline, address: "Addis Ababa, Ethiopia", phone, email: null, link: `${link}#${encodeURIComponent(reference)}`, reference });
    }
  }
  return [...out.values()];
}

// Berhan Bank: listing links to WordPress posts; deadline only from an explicit "on or before <date>" clause.
export function getBerhanLinks(html: string, base: string): string[] {
  const { document } = parseHTML(html);
  return [...new Set(Array.from(document.querySelectorAll("article a[href]")).flatMap(a => {
    try {
      const url = new URL(a.getAttribute("href") ?? "", base);
      return url.hostname === "berhanbanksc.com" && /bid|tender|ifb|auction|sale|ጨረታ|%e1%8c%a8%e1%88%a8%e1%89%b3/i.test(url.pathname) && url.pathname.split("/").filter(Boolean).length === 1 && !/^\/(bids|tender)\/?$/.test(url.pathname) ? [url.href] : [];
    } catch { return []; }
  }))];
}

export function parseBerhanBank(html: string, link: string, now = Date.now()): ParsedTender | null {
  const { document } = parseHTML(html);
  const content = document.querySelector(".elementor-widget-theme-post-content") ?? document.querySelector(".entry-content");
  const title = clean(document.querySelector("h1")?.textContent || document.querySelector('meta[property="og:title"]')?.getAttribute("content") || document.querySelector("title")?.textContent).replace(/\s*[-–|]\s*Berhan Bank.*$/i, "");
  const text = clean(content?.textContent);
  if (!content || !title || !/bid|tender|ጨረታ/i.test(`${title} ${text}`)) return null;
  const dates = [...new Set([...text.matchAll(/on or before[^.]{0,80}?((?:\d{1,2}\s+[A-Za-z]{3,9}\.?,?\s+20\d{2})|(?:[A-Za-z]{3,9}\.?\s+\d{1,2},?\s+20\d{2}))/gi)].map(m => parseDate(m[1] ?? "")).filter((d): d is string => !!d))];
  if (dates.length !== 1) return null;
  const deadline = dates[0]!;
  if (tooSoon(deadline, now)) return null;
  const organization = "Berhan Bank S.C.";
  const reference = text.match(/Reference No\.?\s*:?\s*([A-Za-z0-9/._-]{4,60})/i)?.[1] ?? null;
  const phone = text.match(/Tel\.?\s*([0-9/\s+-]{9,40})/i)?.[1]?.trim() ?? null;
  const am = amharicTitle(title);
  const finalTitle = [am === title ? title : am, organization, reference].filter(Boolean).join(" — ");
  return { title: finalTitle, organization, category: classifyTender(`${title} ${text.slice(0, 1500)}`), summary: amharicSummary(finalTitle, organization, deadline, text, { phone }).slice(0, 24000), posted_date: null, deadline, address: null, phone, email: null, link, reference };
}
