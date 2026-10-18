import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { paymentSchema, userEditSchema } from "@/lib/admin-rules";
import { phoneToEmail } from "@/lib/phone";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });

export const adminRecordPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => paymentSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.rpc("record_admin_payment", {
      _id: data.id, _user_id: data.userId, _days: data.days,
      _amount: data.amount, _note: data.note,
    });
    if (error) throw new Error("ክፍያው አልተመዘገበም፤ እንደገና ይሞክሩ።");
    return { ok: true };
  });

export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => userEditSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: old, error: readError } = await supabaseAdmin.from("profiles").select("phone,full_name").eq("id", data.id).single();
    if (readError || !old) throw new Error("ተጠቃሚው አልተገኘም");
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
      email: phoneToEmail(data.phone), email_confirm: true,
      user_metadata: { phone: data.phone, full_name: data.name },
    });
    if (authError) throw new Error("ለውጡ አልተሳካም፤ ስልኩ በሌላ ተጠቃሚ መመዝገቡን ያረጋግጡ።");
    const { error } = await supabaseAdmin.from("profiles").update({ phone: data.phone, full_name: data.name }).eq("id", data.id);
    if (error) {
      await supabaseAdmin.auth.admin.updateUserById(data.id, { email: phoneToEmail(old.phone), email_confirm: true, user_metadata: { phone: old.phone, full_name: old.full_name } });
      throw new Error("ለውጡ አልተቀመጠም፤ እንደገና ይሞክሩ።");
    }
    return { ok: true };
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
