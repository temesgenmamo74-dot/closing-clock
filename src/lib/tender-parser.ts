import { parseHTML } from "linkedom";
import { classifyTender, daysRemaining } from "@/lib/tender-rules";

export type ParsedTender = { title: string; organization: string | null; category: string; summary: string; posted_date: string | null; deadline: string; address: string | null; phone: string | null; email: string | null; link: string; reference: string | null };
const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

export function parseDate(text: string): string | null {
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  let value = iso?.[0] ?? null;
  if (!value) {
    const english = text.match(/\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(20\d{2})\b/i);
    if (english) {
      const month = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf(english[2].toLowerCase()) + 1;
      value = `${english[3]}-${String(month).padStart(2,"0")}-${english[1].padStart(2,"0")}`;
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
    if (cells.length >= 2) fields.set(clean(cells[0].textContent).replace(/:$/, "").toLowerCase(), clean(cells[1].textContent));
  }
  for (const li of Array.from(document.querySelectorAll(".widget_getintuch li"))) {
    const label = clean(li.querySelector("strong")?.textContent);
    if (label) fields.set(label.toLowerCase(), clean(li.textContent).slice(label.length).trim());
  }
  const deadline = parseDate(fields.get("submission deadline") ?? fields.get("deadline") ?? "");
  const secondary = parseDate(fields.get("deadline") ?? "");
  if (!deadline || (secondary && secondary !== deadline) || (daysRemaining(deadline, now) ?? -1) < 0) return null;
  const text = clean(content.textContent);
  const address = fields.get("physical address") ?? fields.get("address") ?? null;
  const contact = fields.get("contact details") ?? address ?? "";
  const phone = contact.match(/(?:\+251|00251|0[179])(?:[\s().-]*\d){7,12}/g)?.join(" / ") ?? null;
  // Text cells are concatenated without spaces; stop before a following capitalised label.
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?=[A-Z]|[^A-Za-z]|$)/)?.[0] ?? null;
  const organization = fields.get("procuring entity") ?? fields.get("company") ?? null;
  const reference = fields.get("reference no") ?? null;
  return { title: amharicTitle(title), organization, category: classifyTender(`${title} ${fields.get("categories") ?? ""}`), summary: text.replace(/Save Tender\s*$/, "").slice(0,24000), posted_date: parseDate(fields.get("invitation date") ?? ""), deadline, address, phone, email, reference, link };
}

// Only explicitly labelled Gregorian deadlines are accepted; Ethiopian or relative dates remain unguessed.
export function parseTelegram(html: string, base: string, now = Date.now()): ParsedTender[] {
  const { document } = parseHTML(html);
  return Array.from(document.querySelectorAll(".tgme_widget_message")).flatMap(post => {
    const text = clean(post.querySelector(".tgme_widget_message_text")?.textContent);
    if (!/tender|bid|ጨረታ/i.test(text)) return [];
    const deadline = parseDate(text.match(/(?:deadline|closing date|የመዝጊያ ቀን)\s*[:：-]?\s*(20\d{2}-\d{2}-\d{2})/i)?.[1] ?? "");
    if (!deadline || (daysRemaining(deadline, now) ?? -1) < 0) return [];
    const link = post.querySelector(".tgme_widget_message_date")?.getAttribute("href") ?? base;
    const organization = text.match(/(?:organization|company|ተቋም)\s*[:：]\s*([^;\n]{3,120})/i)?.[1] ?? null;
    return [{title:text.slice(0,180), organization, category:classifyTender(text), summary:text, posted_date:parseDate(post.querySelector("time")?.getAttribute("datetime") ?? ""), deadline, address:null, phone:text.match(/(?:\+251|0[179])(?:[\s.-]*\d){7,12}/g)?.join(" / ") ?? null, email:text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null, link, reference:null}];
  });
}