import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Play, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { runCollectorNow } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "አስተዳዳሪ — ጨረታ መከታተያ" },
      { name: "description", content: "ተጠቃሚዎችን፣ ክፍያን እና የጨረታ ምንጮችን ያስተዳድሩ።" },
      { property: "og:title", content: "አስተዳዳሪ — ጨረታ መከታተያ" },
      { property: "og:description", content: "ተጠቃሚዎችን፣ ክፍያን እና የጨረታ ምንጮችን ያስተዳድሩ።" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

const input = "h-10 rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary";

function AdminPage() {
  const qc = useQueryClient();
  const run = useServerFn(runCollectorNow);
  const [running, setRunning] = useState(false);
  const [runMsg, setRunMsg] = useState("");
  const [src, setSrc] = useState({ name: "", url: "", kind: "web" });

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => (await supabase.from("profiles").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const sources = useQuery({
    queryKey: ["admin-sources"],
    queryFn: async () => (await supabase.from("sources").select("*").order("created_at")).data ?? [],
  });
  const settings = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => (await supabase.from("app_settings").select("*").eq("id", 1).single()).data,
  });
  const [ownerPhone, setOwnerPhone] = useState<string | null>(null);
  const [price, setPrice] = useState<string | null>(null);

  async function activate(id: string, days: number) {
    const until = days > 0 ? new Date(Date.now() + days * 86_400_000).toISOString() : null;
    await supabase.from("profiles").update({ paid_until: until }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }
  async function addSource() {
    if (!src.name || !src.url.startsWith("http")) return;
    await supabase.from("sources").insert(src);
    setSrc({ name: "", url: "", kind: "web" });
    qc.invalidateQueries({ queryKey: ["admin-sources"] });
  }
  async function toggleSource(id: string, active: boolean) {
    await supabase.from("sources").update({ active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-sources"] });
  }
  async function delSource(id: string) {
    await supabase.from("sources").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-sources"] });
  }
  async function saveSettings() {
    await supabase.from("app_settings").update({
      owner_phone: ownerPhone ?? settings.data?.owner_phone ?? "",
      price_text: price ?? settings.data?.price_text ?? "",
    }).eq("id", 1);
    qc.invalidateQueries({ queryKey: ["admin-settings"] });
    qc.invalidateQueries({ queryKey: ["me"] });
  }
  async function collect() {
    setRunning(true); setRunMsg("");
    try {
      const r = await run();
      setRunMsg(`${r.added} አዲስ ጨረታ ተጨመረ${r.errors.length ? ` · ${r.errors.length} ምንጭ አልተሳካም` : ""}`);
      qc.invalidateQueries({ queryKey: ["tenders"] });
      qc.invalidateQueries({ queryKey: ["admin-sources"] });
    } catch (e) {
      setRunMsg(e instanceof Error ? e.message : "ስህተት");
    }
    setRunning(false);
  }

  const card = "mt-6 rounded-3xl border bg-card p-5 shadow-card";

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-20 pt-10">
      <Link to="/tenders" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" /> ጨረታዎች</Link>
      <h1 className="mt-3 font-display text-3xl font-bold">አስተዳዳሪ</h1>

      <section className={card}>
        <h2 className="font-display font-semibold">የክፍያ መረጃ (ሙከራ ላለቀባቸው የሚታይ)</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input className={input} placeholder="የእርስዎ ስልክ" defaultValue={settings.data?.owner_phone} key={`p${settings.data?.owner_phone}`} onChange={(e) => setOwnerPhone(e.target.value)} />
          <input className={input} placeholder="ዋጋ (ለምሳሌ 300 ብር / ወር)" defaultValue={settings.data?.price_text} key={`t${settings.data?.price_text}`} onChange={(e) => setPrice(e.target.value)} />
          <button onClick={saveSettings} className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">አስቀምጥ</button>
        </div>
      </section>

      <section className={card}>
        <h2 className="font-display font-semibold">ተጠቃሚዎች ({users.data?.length ?? 0})</h2>
        <ul className="mt-3 divide-y">
          {users.data?.map((u) => {
            const now = Date.now();
            const paid = u.paid_until && new Date(u.paid_until).getTime() > now;
            const trial = new Date(u.trial_ends_at).getTime() > now;
            return (
              <li key={u.id} className="flex flex-wrap items-center gap-2 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{u.full_name || "—"} · <a href={`tel:${u.phone}`} className="text-primary">{u.phone}</a></p>
                  <p className="text-xs text-muted-foreground">
                    {paid ? `ተከፍሏል እስከ ${new Date(u.paid_until!).toLocaleDateString("am-ET")}` : trial ? "በነፃ ሙከራ ላይ" : "ጊዜው አልፏል"}
                  </p>
                </div>
                <button onClick={() => activate(u.id, 30)} className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">+1 ወር</button>
                <button onClick={() => activate(u.id, 365)} className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">+1 ዓመት</button>
                {paid && <button onClick={() => activate(u.id, 0)} className="rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive">አቁም</button>}
              </li>
            );
          })}
        </ul>
      </section>

      <section className={card}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display font-semibold">የጨረታ ምንጮች</h2>
          <button onClick={collect} disabled={running} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-60">
            <Play className="h-3.5 w-3.5" /> {running ? "በመሰብሰብ ላይ…" : "አሁን ሰብስብ"}
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">በየቀኑ ጠዋት በራሱ ይሰበስባል። {runMsg}</p>
        <ul className="mt-3 divide-y">
          {sources.data?.map((s) => (
            <li key={s.id} className="flex items-center gap-2 py-3 text-sm">
              <input type="checkbox" checked={s.active} onChange={(e) => toggleSource(s.id, e.target.checked)} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{s.name} <span className="text-xs text-muted-foreground">({s.kind === "telegram" ? "ቴሌግራም" : "ድረ-ገጽ"})</span></p>
                <p className="truncate text-xs text-muted-foreground">{s.url}</p>
                {s.last_error && <p className="truncate text-xs text-destructive">{s.last_error}</p>}
              </div>
              <button onClick={() => delSource(s.id)} className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive" aria-label="ሰርዝ"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_2fr_auto_auto]">
          <input className={input} placeholder="ስም" value={src.name} onChange={(e) => setSrc({ ...src, name: e.target.value })} />
          <input className={input} placeholder="https://... ወይም https://t.me/s/channel" value={src.url} onChange={(e) => setSrc({ ...src, url: e.target.value })} />
          <select className={input} value={src.kind} onChange={(e) => setSrc({ ...src, kind: e.target.value })}>
            <option value="web">ድረ-ገጽ</option><option value="telegram">ቴሌግራም</option>
          </select>
          <button onClick={addSource} className="inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> ጨምር</button>
        </div>
      </section>
    </main>
  );
}
