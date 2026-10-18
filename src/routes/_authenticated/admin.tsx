import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Play, Plus, Trash2, Pencil, Search, Receipt, Eye, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminCreateUser, adminRecordPayment, adminUpdateUser, runCollectorNow } from "@/lib/admin.functions";
import { ANNUAL_PAYMENT, paymentSchema, userEditSchema } from "@/lib/admin-rules";
import { normalizePhone } from "@/lib/phone";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [
    { title: "አስተዳዳሪ — Eliphaz" },
    { name: "description", content: "የEliphaz ተጠቃሚዎች፣ የክፍያ መዝገብ፣ ጨረታዎች እና ምንጮች አስተዳደር።" },
    { property: "og:title", content: "አስተዳዳሪ — Eliphaz" },
    { property: "og:description", content: "የEliphaz ተጠቃሚዎች፣ የክፍያ መዝገብ፣ ጨረታዎች እና ምንጮች አስተዳደር።" },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: AdminPage,
});
const input = "h-10 w-full min-w-0 rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary";
const date = (v: string | null | undefined) => v ? new Date(v).toLocaleString("am-ET") : "—";
const money = (n: number) => `${n.toLocaleString("am-ET")} ብር`;
function AdminPage() {
  const qc = useQueryClient();
  const createUser = useServerFn(adminCreateUser), editUser = useServerFn(adminUpdateUser), recordPayment = useServerFn(adminRecordPayment), run = useServerFn(runCollectorNow);
  const [tab, setTab] = useState("users"), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  const [search, setSearch] = useState(""), [userSearch, setUserSearch] = useState("");
  const [nu, setNu] = useState({ name: "", phone: "", password: "", paidDays: 0 });
  const [src, setSrc] = useState({ name: "", url: "", kind: "web" });
  const [ownerPhone, setOwnerPhone] = useState<string | null>(null), [price, setPrice] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ id: string; name: string; phone: string } | null>(null);
  const [payment, setPayment] = useState<{ id: string; userId: string; name: string; days: number; amount: number; note: string } | null>(null);
  const [selected, setSelected] = useState<Tables<"tenders"> | null>(null);
  const [historyUser, setHistoryUser] = useState("");
  const role = useQuery({ queryKey: ["admin-role"], queryFn: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data, error } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (error) throw error; return data;
  }});
  const enabled = role.data === true;
  const users = useQuery({ queryKey: ["admin-users"], enabled, queryFn: async () => {
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }); if (error) throw error; return data;
  }});
  const sources = useQuery({ queryKey: ["admin-sources"], enabled, queryFn: async () => {
    const { data, error } = await supabase.from("sources").select("*").order("created_at"); if (error) throw error; return data;
  }});
  const settings = useQuery({ queryKey: ["admin-settings"], enabled, queryFn: async () => {
    const { data, error } = await supabase.from("app_settings").select("*").eq("id", 1).single(); if (error) throw error; return data;
  }});
  const tenders = useQuery({ queryKey: ["admin-tenders"], enabled, queryFn: async () => {
    const all: Tables<"tenders">[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from("tenders").select("*").order("created_at", { ascending: false }).order("id").range(offset, offset + 499);
      if (error) throw error; all.push(...data); if (data.length < 500) return all;
    }
  }});
  const payments = useQuery({ queryKey: ["admin-payments"], enabled, queryFn: async () => {
    const all: Tables<"payments">[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from("payments").select("*").order("paid_at", { ascending: false }).order("id").range(offset, offset + 499);
      if (error) throw error; all.push(...data); if (data.length < 500) return all;
    }
  }});
  async function action(fn: () => Promise<void>) {
    if (busy) return; setBusy(true); setMsg("");
    try { await fn(); } catch (e) { setMsg(e instanceof Error ? e.message : "አልተሳካም፤ እንደገና ይሞክሩ።"); }
    finally { setBusy(false); }
  }
  async function refresh() {
    await Promise.all(["admin-users", "admin-payments", "admin-tenders", "admin-sources", "admin-settings", "tenders", "me"].map(k => qc.invalidateQueries({ queryKey: [k] })));
  }
  async function remove(table: "tenders" | "sources", id: string, name: string) {
    if (!window.confirm(`«${name}» ይሰረዝ? ይህን መመለስ አይቻልም።`)) return;
    await action(async () => { const { error } = await supabase.from(table).delete().eq("id", id); if (error) throw new Error("መሰረዝ አልተሳካም"); await refresh(); setMsg("ተሰርዟል።"); });
  }
  const allUsers = users.data ?? [], allPayments = payments.data ?? [];
  const filtered = (tenders.data ?? []).filter(t => `${t.title} ${t.organization ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  const filteredUsers = allUsers.filter(u => `${u.full_name ?? ""} ${u.phone}`.toLowerCase().includes(userSearch.toLowerCase()));
  const history = allPayments.filter(p => !historyUser || p.user_id === historyUser);
  if (role.isPending) return <main className="p-10 text-center">እባክዎ ይጠብቁ…</main>;
  if (!enabled) return <main className="p-10 text-center"><p>ይህ ገጽ ለአስተዳዳሪ ብቻ ነው።</p><Link to="/tenders" className="text-primary">ጨረታዎች</Link></main>;
  return <main className="mx-auto w-full max-w-5xl px-5 pb-20 pt-8">
    <Link to="/tenders" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4" />ጨረታዎች</Link>
    <h1 className="mt-4 font-display text-3xl font-bold">Eliphaz <span className="text-lg font-normal text-muted-foreground">አስተዳዳሪ</span></h1>
    <div className="my-6 grid grid-cols-2 gap-4 border-y py-5 sm:grid-cols-4">
      {[['ተጠቃሚዎች', allUsers.length], ['የተከፈለባቸው', allUsers.filter(u => u.paid_until && new Date(u.paid_until).getTime() > Date.now()).length], ['ጨረታዎች', tenders.data?.length ?? 0], ['የተሰበሰበ ክፍያ', money(allPayments.reduce((a,p) => a + Number(p.amount ?? 0), 0))]].map(([label,value]) => <div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}
    </div>
    <nav className="flex flex-wrap gap-2 border-b pb-4" aria-label="የአስተዳዳሪ ክፍሎች">{([['users','ተጠቃሚዎች'],['payments','ክፍያዎች'],['tenders','ጨረታዎች'],['sources','ምንጮች'],['settings','የክፍያ መረጃ']] as const).map(([key,label]) => <Button key={key} variant={tab === key ? 'default' : 'ghost'} onClick={() => setTab(key)} aria-pressed={tab === key}>{label}</Button>)}</nav>
    {msg && <p role="status" className="mt-4 break-words rounded-lg border bg-muted p-3 text-sm">{msg}</p>}
    {[users,sources,settings,tenders,payments].some(q => q.isError) && <p role="alert" className="mt-4 text-destructive">መረጃ ማምጣት አልተሳካም። <Button variant="link" onClick={refresh}>እንደገና ሞክር</Button></p>}
    {tab === 'users' && <section className="pt-6">
      <h2 className="text-lg font-semibold">አዲስ ተጠቃሚ መዝግብ</h2>
      <form className="mt-3 grid gap-3 sm:grid-cols-3" onSubmit={e => { e.preventDefault(); void action(async () => {
        const p = normalizePhone(nu.phone); if (!p) throw new Error("ትክክለኛ ስልክ ቁጥር ያስገቡ");
        await createUser({ data: { ...nu, phone: p } }); setNu({ name:'',phone:'',password:'',paidDays:0 }); await refresh(); setMsg("ተጠቃሚው ተመዝግቧል። የ7 ቀን ነፃ ሙከራ አለው።");
      }); }}>
        <input aria-label="ሙሉ ስም" placeholder="ሙሉ ስም" required maxLength={100} className={input} value={nu.name} onChange={e => setNu({...nu,name:e.target.value})} />
        <input aria-label="ስልክ ቁጥር" placeholder="ስልክ ቁጥር" required inputMode="tel" className={input} value={nu.phone} onChange={e => setNu({...nu,phone:e.target.value})} />
        <input aria-label="የይለፍ ቃል" placeholder="የይለፍ ቃል" required minLength={6} type="password" className={input} value={nu.password} onChange={e => setNu({...nu,password:e.target.value})} />
        <Button disabled={busy} type="submit" className="justify-self-start"><Plus />መዝግብ</Button>
      </form>
      <div className="relative mt-8"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><input aria-label="ተጠቃሚ ፈልግ" placeholder="በስም ወይም በስልክ ፈልግ" className={`${input} pl-10`} value={userSearch} onChange={e => setUserSearch(e.target.value)} /></div>
      <ul className="mt-3 divide-y">{filteredUsers.map(u => <li key={u.id} className="flex flex-wrap items-center gap-3 py-4">
        <div className="min-w-0 flex-1 basis-48"><p className="break-words font-medium">{u.full_name || '—'}</p><a className="text-sm text-primary" href={`tel:${u.phone}`}>{u.phone}</a><p className="mt-1 text-xs text-muted-foreground">{u.paid_until && new Date(u.paid_until).getTime() > Date.now() ? `ተከፍሏል እስከ ${date(u.paid_until)}` : new Date(u.trial_ends_at).getTime() > Date.now() ? `ነፃ ሙከራ እስከ ${date(u.trial_ends_at)}` : 'ጊዜው አልፏል'}</p></div>
        <Button size="icon" variant="ghost" title="ስምና ስልክ አስተካክል" aria-label={`አስተካክል ${u.phone}`} onClick={() => setEdit({id:u.id,name:u.full_name ?? '',phone:u.phone})}><Pencil /></Button>
        <Button size="sm" disabled={busy} onClick={() => setPayment({id:crypto.randomUUID(),userId:u.id,name:u.full_name || u.phone,...ANNUAL_PAYMENT,note:''})}><Plus />ክፍያ መዝግብ</Button>
        <Button size="icon" variant="outline" title="የክፍያ ታሪክ" aria-label={`የክፍያ ታሪክ ${u.phone}`} onClick={() => {setHistoryUser(u.id);setTab('payments');}}><Receipt /></Button>
        {u.paid_until && new Date(u.paid_until).getTime() > Date.now() && <Button size="sm" variant="destructive" disabled={busy} onClick={() => {if (window.confirm(`የ${u.full_name || u.phone} የተከፈለ መዳረሻ ይቋረጥ? የክፍያ ታሪኩ አይሰረዝም።`)) void action(async () => {const {error} = await supabase.from('profiles').update({paid_until:null}).eq('id',u.id);if(error) throw error;await refresh();setMsg('የተከፈለ መዳረሻ ተቋርጧል።');});}}>አቁም</Button>}
      </li>)}</ul>{!users.isPending && !filteredUsers.length && <p className="py-8 text-muted-foreground">ተጠቃሚ አልተገኘም።</p>}
    </section>}
    {tab === 'payments' && <section className="pt-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">የክፍያ ታሪክ</h2><select aria-label="የክፍያ ተጠቃሚ" className={`${input} max-w-xs`} value={historyUser} onChange={e => setHistoryUser(e.target.value)}><option value="">ሁሉም ተጠቃሚዎች</option>{allUsers.map(u => <option key={u.id} value={u.id}>{u.full_name} · {u.phone}</option>)}</select></div><p className="mt-3 font-semibold">ድምር: {money(history.reduce((a,p) => a + Number(p.amount ?? 0), 0))}</p><ul className="mt-3 divide-y">{history.map(p => {const u = allUsers.find(u => u.id === p.user_id);return <li key={p.id} className="flex flex-wrap justify-between gap-3 py-4"><div className="min-w-0"><p className="font-medium">{u?.full_name || u?.phone || '—'}</p><p className="text-xs text-muted-foreground">{u?.phone} · {date(p.paid_at)} · {p.days} ቀናት</p>{p.note && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{p.note}</p>}</div><strong>{money(Number(p.amount ?? 0))}</strong></li>;})}</ul>{!payments.isPending && !history.length && <p className="py-8 text-muted-foreground">የክፍያ መዝገብ የለም።</p>}</section>}
    {tab === 'tenders' && <section className="pt-6"><h2 className="text-lg font-semibold">ጨረታዎች ({filtered.length})</h2><div className="relative mt-3"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><input aria-label="ጨረታ ፈልግ" placeholder="በርዕስ ወይም በተቋም ፈልግ" className={`${input} pl-10`} value={search} onChange={e => setSearch(e.target.value)} /></div><ul className="mt-3 divide-y">{filtered.map(t => <li key={t.id} className="flex items-center gap-2 py-4"><div className="min-w-0 flex-1"><p className="break-words font-medium">{t.title}</p><p className="mt-1 text-xs text-muted-foreground">{t.organization || '—'} · {t.source_name} · መዝጊያ: {date(t.deadline)}</p></div><Button size="icon" variant="ghost" title="ሙሉ ዝርዝር" aria-label={`ዝርዝር ${t.title}`} onClick={() => setSelected(t)}><Eye /></Button><Button size="icon" variant="ghost" disabled={busy} aria-label={`ሰርዝ ${t.title}`} title="ሰርዝ" onClick={() => remove('tenders',t.id,t.title)}><Trash2 className="text-destructive" /></Button></li>)}</ul>{!tenders.isPending && !filtered.length && <p className="py-8 text-muted-foreground">ጨረታ አልተገኘም።</p>}</section>}
    {tab === 'sources' && <section className="pt-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">የጨረታ ምንጮች</h2><Button disabled={busy} onClick={() => action(async () => {const r = await run();await refresh();setMsg(`${r.added} አዲስ ጨረታ ተጨመረ · ${r.errors.length} ምንጭ አልተሳካም`);})}><Play />{busy ? 'እባክዎ ይጠብቁ…' : 'አሁን ሰብስብ'}</Button></div><ul className="mt-3 divide-y">{sources.data?.map(s => <li key={s.id} className="flex items-start gap-3 py-4"><input aria-label={`ምንጭ ${s.name}`} type="checkbox" className="mt-1 accent-primary" disabled={busy} checked={s.active} onChange={e => {const active = e.target.checked;void action(async () => {const {error} = await supabase.from('sources').update({active}).eq('id',s.id);if(error) throw error;await refresh();});}} /><div className="min-w-0 flex-1"><p className="font-medium">{s.name} <span className="text-xs text-muted-foreground">{s.kind === 'telegram' ? 'ቴሌግራም' : 'ድረ-ገጽ'}</span></p><p className="break-all text-xs text-muted-foreground">{s.url}</p><p className="mt-2 text-xs">{!s.active ? 'ቆሟል' : !s.last_run_at ? 'ገና አልተሰበሰበም' : s.last_error ? 'መሰብሰብ አልተሳካም' : 'መሰብሰብ ተሳክቷል'} · {date(s.last_run_at)}</p>{s.last_error && <p className="mt-1 break-words text-xs text-destructive">{s.last_error}</p>}</div><Button size="icon" variant="ghost" disabled={busy} title="ሰርዝ" aria-label={`ሰርዝ ${s.name}`} onClick={() => remove('sources',s.id,s.name)}><Trash2 /></Button></li>)}</ul><form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={e => {e.preventDefault();void action(async () => {const url = new URL(src.url);if(!['http:','https:'].includes(url.protocol)) throw new Error('ትክክለኛ አድራሻ ያስገቡ');const {error} = await supabase.from('sources').insert(src);if(error) throw error;setSrc({name:'',url:'',kind:'web'});await refresh();setMsg('ምንጩ ተጨምሯል።');});}}><input required aria-label="የምንጭ ስም" placeholder="የምንጭ ስም" maxLength={100} className={input} value={src.name} onChange={e => setSrc({...src,name:e.target.value})} /><input required type="url" aria-label="የምንጭ አድራሻ" placeholder="https://…" className={input} value={src.url} onChange={e => setSrc({...src,url:e.target.value})} /><select aria-label="የምንጭ ዓይነት" className={input} value={src.kind} onChange={e => setSrc({...src,kind:e.target.value})}><option value="web">ድረ-ገጽ</option><option value="telegram">ቴሌግራም</option></select><Button disabled={busy} type="submit"><Plus />ምንጭ ጨምር</Button></form></section>}
    {tab === 'settings' && <section className="pt-6"><h2 className="text-lg font-semibold">የክፍያ መረጃ</h2><form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={e => {e.preventDefault();void action(async () => {const {error} = await supabase.from('app_settings').update({owner_phone:ownerPhone ?? settings.data?.owner_phone ?? '',price_text:price ?? settings.data?.price_text ?? ''}).eq('id',1);if(error) throw error;await refresh();setMsg('የክፍያ መረጃ ተቀምጧል።');});}}><label className="space-y-2 text-sm">የክፍያ ስልክ<input required aria-label="የክፍያ ስልክ" className={input} inputMode="tel" value={ownerPhone ?? settings.data?.owner_phone ?? ''} onChange={e => setOwnerPhone(e.target.value)} /></label><label className="space-y-2 text-sm">ዋጋ<input required aria-label="ዋጋ" className={input} maxLength={200} value={price ?? settings.data?.price_text ?? ''} onChange={e => setPrice(e.target.value)} /></label><Button disabled={busy || settings.isPending} type="submit" className="justify-self-start"><Save />አስቀምጥ</Button></form></section>}
    <Dialog open={!!edit} onOpenChange={open => {if(!open && !busy)setEdit(null);}}><DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg"><DialogTitle>የተጠቃሚ መረጃ</DialogTitle><DialogDescription>ስምና የመግቢያ ስልክ</DialogDescription>{edit && <form className="space-y-4" onSubmit={e => {e.preventDefault();void action(async () => {const data = userEditSchema.parse(edit);await editUser({data});setEdit(null);await refresh();setMsg('የተጠቃሚ መረጃ ተቀምጧል።');});}}><label className="block space-y-2 text-sm">ሙሉ ስም<input required maxLength={100} aria-label="የተጠቃሚ ስም" className={input} value={edit.name} onChange={e => setEdit({...edit,name:e.target.value})} /></label><label className="block space-y-2 text-sm">ስልክ<input required aria-label="የተጠቃሚ ስልክ" className={input} value={edit.phone} onChange={e => setEdit({...edit,phone:e.target.value})} /></label>{msg && <p role="status" className="text-sm text-destructive">{msg}</p>}<Button type="submit" disabled={busy}><Save />አስቀምጥ</Button></form>}</DialogContent></Dialog>
    <Dialog open={!!payment} onOpenChange={open => {if(!open && !busy)setPayment(null);}}><DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg"><DialogTitle>ክፍያ መዝግብ</DialogTitle><DialogDescription>{payment?.name}</DialogDescription>{payment && <form className="space-y-4" onSubmit={e => {e.preventDefault();void action(async () => {const data = paymentSchema.parse(payment);await recordPayment({data});setPayment(null);await refresh();setMsg('ክፍያው ተመዝግቧል፤ የተጠቃሚው ጊዜ ተራዝሟል።');});}}><label className="block space-y-2 text-sm">የተከፈለ መጠን (ብር)<input aria-label="የተከፈለ መጠን" required type="number" min="0.01" step="0.01" max="10000000" className={input} value={payment.amount} onChange={e => setPayment({...payment,amount:Number(e.target.value)})} /></label><label className="block space-y-2 text-sm">የመዳረሻ ቀናት<input aria-label="የመዳረሻ ቀናት" required type="number" min="1" max="3650" className={input} value={payment.days} onChange={e => setPayment({...payment,days:Number(e.target.value)})} /></label><label className="block space-y-2 text-sm">ማስታወሻ<textarea aria-label="የክፍያ ማስታወሻ" maxLength={1000} className={`${input} h-24 py-2`} value={payment.note} onChange={e => setPayment({...payment,note:e.target.value})} /></label>{msg && <p role="status" className="text-sm text-destructive">{msg}</p>}<Button type="submit" disabled={busy}><Receipt />ክፍያ አስቀምጥ</Button></form>}</DialogContent></Dialog>
    <Dialog open={!!selected} onOpenChange={open => {if(!open)setSelected(null);}}><DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg"><DialogTitle className="pr-6 leading-relaxed">{selected?.title}</DialogTitle><DialogDescription>{selected?.organization || '—'}</DialogDescription>{selected && <><p className="whitespace-pre-wrap break-words text-sm leading-7">{selected.summary || 'ማጠቃለያ አልተገኘም።'}</p><dl className="grid gap-3 text-sm">{[['መዝጊያ',date(selected.deadline)],['የወጣበት ቀን',date(selected.posted_date)],['ስልክ',selected.phone],['አድራሻ',selected.address],['ኢሜይል',selected.email],['ዘርፍ',selected.category],['ምንጭ',selected.source_name],['የተመዘገበበት',date(selected.created_at)]].map(([label,value]) => <div key={label} className="border-t pt-2"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words">{value || 'በምንጩ አልተገኘም'}</dd></div>)}</dl></>}</DialogContent></Dialog>
  </main>;
}
