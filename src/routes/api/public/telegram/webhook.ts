import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "node:crypto";
import { sendTelegramMessage } from "@/lib/telegram.server";

function deriveWebhookSecret(telegramApiKey: string): string {
  return createHash("sha256").update(`telegram-webhook:${telegramApiKey}`).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const TELEGRAM_API_KEY = process.env["TELEGRAM_API_KEY"];
        if (!TELEGRAM_API_KEY) return Response.json({ error: "not configured" }, { status: 500 });

        const expected = deriveWebhookSecret(TELEGRAM_API_KEY);
        const actual = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
        if (!safeEqual(actual, expected)) return new Response("Unauthorized", { status: 401 });

        let update: { update_id?: number; message?: { chat?: { id?: number }; from?: { first_name?: string }; text?: string } };
        try {
          update = await request.json();
        } catch {
          return Response.json({ ok: true, ignored: true });
        }
        const chatId = update.message?.chat?.id;
        if (typeof chatId !== "number") return Response.json({ ok: true, ignored: true });

        const text = (update.message?.text ?? "").trim();
        const firstName = update.message?.from?.first_name ?? "";

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const reply = async (text: string) => {
          try {
            await sendTelegramMessage(chatId, text);
          } catch (e) {
            console.error("Telegram reply failed:", e instanceof Error ? e.message : e);
          }
        };

        if (text.startsWith("/stop")) {
          await supabaseAdmin.from("bot_subscribers").delete().eq("chat_id", chatId);
          await reply("ተዉኝ — ከእንግዲህ ማሳወቂያ አልላክም። እንደገና ለመጀመር /start ይላኩ።");
          return Response.json({ ok: true });
        }

        if (text.startsWith("/start")) {
          await supabaseAdmin
            .from("bot_subscribers")
            .upsert({ chat_id: chatId, first_name: firstName || null }, { onConflict: "chat_id" });
          await reply("✅ ተመዝግበዋል! አዲስ ጨረታ ሲገባ እዚህ አሳውቃለሁ። ማሳወቂያውን ለማቆም በማንኛውም ጊዜ /stop ይላኩ።");
          return Response.json({ ok: true });
        }

        await reply("አዲስ ጨረታ ሲገባ እዚህ አሳውቃለሁ። ለመመዝገብ /start ይላኩ።");
        return Response.json({ ok: true });
      },
    },
  },
});
