import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Phone, Lock, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { normalizePhone, phoneToEmail } from "@/lib/phone";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "ግባ — ጨረታ መከታተያ" },
      { name: "description", content: "በስልክ ቁጥርዎ ይመዝገቡ እና የ7 ቀን ነፃ ሙከራ ይጀምሩ።" },
      { property: "og:title", content: "ግባ — ጨረታ መከታተያ" },
      { property: "og:description", content: "በስልክ ቁጥርዎ ይመዝገቡ እና የ7 ቀን ነፃ ሙከራ ይጀምሩ።" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("up");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const p = normalizePhone(phone);
    if (!p) return setErr("ትክክለኛ ስልክ ቁጥር ያስገቡ (ለምሳሌ 0911223344)");
    if (pw.length < 6) return setErr("የይለፍ ቃል ቢያንስ 6 ፊደል መሆን አለበት");
    setBusy(true);
    const email = phoneToEmail(p);
    const { error } =
      mode === "up"
        ? await supabase.auth.signUp({ email, password: pw, options: { data: { phone: p, full_name: name } } })
        : await supabase.auth.signInWithPassword({ email, password: pw });
    setBusy(false);
    if (error) {
      setErr(
        /already/i.test(error.message)
          ? "ይህ ቁጥር ተመዝግቧል — ይግቡ"
          : /invalid/i.test(error.message)
            ? "ስልክ ቁጥር ወይም የይለፍ ቃል ትክክል አይደለም"
            : error.message,
      );
      return;
    }
    nav({ to: "/tenders" });
  }

  const field =
    "h-12 w-full rounded-xl border bg-background pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30";

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border bg-card p-7 shadow-card animate-rise-in">
        <h1 className="font-display text-2xl font-bold">ጨረታ መከታተያ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "up" ? "ይመዝገቡ — የ7 ቀን ነፃ ሙከራ" : "እንኳን ደህና መጡ"}
        </p>
        <div className="mt-6 space-y-3">
          {mode === "up" && (
            <div className="relative">
              <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ሙሉ ስም" className={field} />
            </div>
          )}
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="ስልክ ቁጥር" inputMode="tel" className={field} />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="የይለፍ ቃል" className={field} />
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <button disabled={busy} className="h-12 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {busy ? "እባክዎ ይጠብቁ…" : mode === "up" ? "ተመዝገብ" : "ግባ"}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setMode(mode === "up" ? "in" : "up")}
          className="mt-4 w-full text-center text-sm text-primary"
        >
          {mode === "up" ? "አካውንት አለዎት? ይግቡ" : "አዲስ ነዎት? ይመዝገቡ"}
        </button>
      </form>
    </div>
  );
}
