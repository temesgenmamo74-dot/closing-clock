// Server-only: Telegram notifications via the connector gateway.
const GATEWAY = "https://connector-gateway.lovable.dev/telegram";

function tgKeys() {
  const lovable = process.env["LOVABLE_API_KEY"];
  const tg = process.env["TELEGRAM_API_KEY"];
  if (!lovable || !tg) throw new Error("LOVABLE_API_KEY or TELEGRAM_API_KEY missing");
  return { lovable, tg };
}

export async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  const { lovable, tg } = tgKeys();
  const res = await fetch(`${GATEWAY}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovable}`,
      "X-Connection-Api-Key": tg,
    },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Telegram sendMessage failed [${res.status}]: ${body.slice(0, 300)}`);
    throw new Error(`Telegram failed [${res.status}]: ${body.slice(0, 200)}`);
  }
}

export type TenderBrief = { title: string; organization: string | null; deadline: string | null; source_url: string | null };

export function buildDailySummary(tenders: TenderBrief[]): string {
  const lines = tenders.slice(0, 8).map((t) => {
    const org = t.organization ? ` — ${t.organization}` : "";
    const dl = t.deadline ? `\n  የሚዘጋው: ${t.deadline}` : "";
    const link = t.source_url ? `\n  <a href="${t.source_url}">ዝርዝር</a>` : "";
    return `• <b>${escapeHtml(t.title)}</b>${escapeHtml(org)}${dl}${link}`;
  });
  return (
    `🆕 <b>አዲስ ጨረታዎች</b>\n\n${lines.join("\n\n")}\n\n` +
    `ሙሉ ዝርዝሩን በአፑ ውስጥ ይመልከቱ። ለማቆም /stop ይላኩ።`
  );
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Sends the daily summary of fresh tenders to every bot subscriber. */
export async function notifySubscribers(tenders: TenderBrief[]): Promise<number> {
  if (!tenders.length) return 0;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: subs, error } = await supabaseAdmin.from("bot_subscribers").select("chat_id");
  if (error) throw error;
  if (!subs?.length) return 0;
  const text = buildDailySummary(tenders);
  let sent = 0;
  for (const s of subs) {
    try {
      await sendTelegramMessage(Number(s.chat_id), text);
      sent += 1;
    } catch {
      // one dead chat must not stop the rest
    }
  }
  return sent;
}
