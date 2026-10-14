import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

export const runCollectorNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { runCollector } = await import("@/lib/collector.server");
    return runCollector(3);
  });

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { name: string; phone: string; password: string; paidDays: number }) => {
    if (!/^0[79]\d{8}$/.test(i.phone)) throw new Error("ትክክለኛ ስልክ ቁጥር ያስገቡ");
    if (!i.password || i.password.length < 6) throw new Error("የይለፍ ቃል ቢያንስ 6 ፊደል");
    return { ...i, name: i.name.slice(0, 100), paidDays: Math.max(0, Math.min(3650, i.paidDays | 0)) };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: `${data.phone}@phone.tender-app.local`,
      password: data.password,
      email_confirm: true,
      user_metadata: { phone: data.phone, full_name: data.name },
    });
    if (error) throw new Error(/already/i.test(error.message) ? "ይህ ቁጥር ተመዝግቧል" : error.message);
    if (data.paidDays > 0 && created.user) {
      await supabaseAdmin
        .from("profiles")
        .update({ paid_until: new Date(Date.now() + data.paidDays * 86_400_000).toISOString() })
        .eq("id", created.user.id);
    }
    return { ok: true };
  });
