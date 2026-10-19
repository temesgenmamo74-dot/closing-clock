import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Building2, CalendarDays, Clock, ExternalLink, LogOut, Mail, MapPin, Phone, Search, Settings, Sparkles, Star, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/tenders")({
  head: () => ({
    meta: [
      { title: "ጨረታዎች — Eliphaz" },
      { name: "description", content: "በየቀኑ ከታማኝ ምንጮች የሚሰበሰቡ ክፍት ጨረታዎች።" },
      { property: "og:title", content: "ጨረታዎች — Eliphaz" },
      { property: "og:description", content: "በየቀኑ ከታማኝ ምንጮች የሚሰበሰቡ ክፍት ጨረታዎች።" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TendersPage,
});

type Tender = {
  id: string; title: string; organization: string | null; category: string | null; summary: string | null;
  posted_date: string | null; deadline: string | null; address: string | null; phone: string | null;
  email: string | null; source_url: string | null; source_name: string | null; created_at: string;
};

const FILTERS = ["ሁሉም", "ክፍት", "የተቀመጡ", "ሕክምና", "ኮንስትራክሽን", "ኤሌክትሪክ", "ካርጎ", "አይቲ", "ቢሮ እቃ", "ሌላ"];

function daysLeft(d: string | null) {
  if (!d) return null;
  return Math.ceil((new Date(d + "T23:59:59").getTime() - Date.now()) / 86_400_000);
}
function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("am-ET", { year: "numeric", month: "long", day: "numeric" });
}

function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("እባክዎ ይግቡ");
      const id = u.user.id;
      const [{ data: profile }, { data: roles }, { data: settings }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).single(),
        supabase.from("user_roles").select("role").eq("user_id", id),
        supabase.from("app_settings").select("*").eq("id", 1).single(),
      ]);
      const isAdmin = !!roles?.some((r) => r.role === "admin");
      const now = Date.now();
      const trialEnd = profile ? new Date(profile.trial_ends_at).getTime() : 0;
      const paidEnd = profile?.paid_until ? new Date(profile.paid_until).getTime() : 0;
      const access = isAdmin || trialEnd > now || paidEnd > now;
      const trialDays = Math.max(0, Math.ceil((trialEnd - now) / 86_400_000));
      return { id, profile, isAdmin, access, trialDays, paid: paidEnd > now, settings };
    },
  });
}

function TendersPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const me = useMe();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ክፍት");
  const [detail, setDetail] = useState<Tender | null>(null);

  const tenders = useQuery({
    queryKey: ["tenders"],
    enabled: !!me.data?.access,
    queryFn: async () => {
      const { data, error } = await supabase.from("tenders").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data as Tender[];
    },
  });
  const saved = useQuery({
    queryKey: ["saved"],
    enabled: !!me.data?.access,
    queryFn: async () => {
      const { data } = await supabase.from("saved_tenders").select("tender_id");
      return new Set((data ?? []).map((r) => r.tender_id));
    },
  });

  const list = useMemo(() => {
    let l = tenders.data ?? [];
    if (filter === "ክፍት") l = l.filter((t) => (daysLeft(t.deadline) ?? 0) >= 0);
    else if (filter === "የተቀመጡ") l = l.filter((t) => saved.data?.has(t.id));
    else if (filter !== "ሁሉም") l = l.filter((t) => t.category === filter);
    const q = query.trim().toLowerCase();
    if (q) l = l.filter((t) => [t.title, t.organization, t.summary, t.category].some((v) => v?.toLowerCase().includes(q)));
    return l;
  }, [tenders.data, saved.data, filter, query]);

  async function toggleSave(id: string) {
    const userId = me.data?.id;
    if (!userId) return;
    if (saved.data?.has(id)) await supabase.from("saved_tenders").delete().eq("tender_id", id).eq("user_id", userId);
    else await supabase.from("saved_tenders").insert({ tender_id: id, user_id: userId });
    qc.invalidateQueries({ queryKey: ["saved"] });
  }

  async function logout() {
    await supabase.auth.signOut();
    qc.clear();
    nav({ to: "/auth" });
  }

  if (me.isLoading) return <div className="p-10 text-center text-sm text-muted-foreground">በመጫን ላይ…</div>;
  const m = me.data;
  if (!m) return <p role="alert" className="p-10 text-center">መረጃ አልተገኘም፤ እንደገና ይግቡ።</p>;

  return (
    <div className="min-h-screen">
      <main className="mx-auto w-full max-w-2xl px-5 pb-20 pt-10">
        <header className="flex items-start justify-between gap-3 animate-rise-in">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Eliphaz</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {m.profile?.full_name || m.profile?.phone}
              {!m.isAdmin && !m.paid && m.access && ` · ነፃ ሙከራ ${m.trialDays} ቀን ቀርቷል`}
            </p>
          </div>
          <div className="flex gap-1">
            {m.isAdmin && (
              <Link to="/admin" className="rounded-xl p-2.5 text-muted-foreground hover:bg-accent" aria-label="አስተዳዳሪ">
                <Settings className="h-5 w-5" />
              </Link>
            )}
            <button onClick={logout} className="rounded-xl p-2.5 text-muted-foreground hover:bg-accent" aria-label="ውጣ">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {!m.access ? (
          <div className="mt-8 rounded-3xl border bg-card p-7 text-center shadow-card">
            <h2 className="font-display text-xl font-bold">የነፃ ሙከራ ጊዜዎ አልቋል</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              አገልግሎቱን ለመቀጠል ይደውሉልን። ክፍያ ከፈጸሙ በኋላ አካውንትዎ ወዲያውኑ ይከፈታል።
            </p>
            <a href={`tel:${m.settings?.owner_phone}`} className="mt-5 inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground">
              <Phone className="h-4 w-4" /> {m.settings?.owner_phone}
            </a>
            <p className="mt-3 text-xs text-muted-foreground">{m.settings?.price_text}</p>
          </div>
        ) : (
          <>
            <div className="relative mt-6">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ጨረታ ፈልግ…"
                className="h-12 w-full rounded-2xl border bg-card pl-11 pr-4 text-sm shadow-card outline-none focus:border-primary focus:ring-2 focus:ring-ring/30" />
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {FILTERS.map((c) => (
                <button key={c} onClick={() => setFilter(c)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${filter === c ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}>
                  {c}
                </button>
              ))}
            </div>
            <ul className="mt-5 space-y-4">
              {tenders.isLoading && <li className="p-10 text-center text-sm text-muted-foreground">በመጫን ላይ…</li>}
              {!tenders.isLoading && list.length === 0 && (
                <li className="rounded-2xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
                  ምንም ጨረታ አልተገኘም — አዳዲስ ጨረታዎች በየቀኑ ይሰበሰባሉ
                </li>
              )}
              {list.map((t) => {
                const left = daysLeft(t.deadline);
                const closed = left !== null && left < 0;
                const urgent = left !== null && !closed && left <= 3;
                return (
                  <li key={t.id}>
                    <div onClick={() => setDetail(t)} role="button"
                      className="flex w-full cursor-pointer overflow-hidden rounded-2xl border bg-card text-left shadow-card transition-transform hover:-translate-y-0.5">
                      <div className={`flex w-20 shrink-0 flex-col items-center justify-center gap-0.5 px-2 py-5 ${closed ? "bg-muted text-muted-foreground" : urgent ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                        {left === null ? <span className="text-xs font-semibold">ቀን የለም</span>
                          : closed ? <span className="text-xs font-semibold">ተዘግቷል</span>
                          : (<><span className="font-display text-3xl font-bold leading-none">{left}</span><span className="text-[11px] font-medium">ቀን ቀርቷል</span></>)}
                      </div>
                      <div className="min-w-0 flex-1 p-4">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-warning/40 px-2.5 py-0.5 text-[11px] font-semibold text-warning-foreground">{t.category ?? "ሌላ"}</span>
                          <span className="truncate text-[11px] text-muted-foreground">Eliphaz ስብስብ</span>
                          <button onClick={(e) => { e.stopPropagation(); toggleSave(t.id); }} aria-label="አስቀምጥ"
                            className="ml-auto rounded-lg p-1 text-muted-foreground hover:text-warning-foreground">
                            <Star className={`h-4 w-4 ${saved.data?.has(t.id) ? "fill-warning text-warning-foreground" : ""}`} />
                          </button>
                        </div>
                        <h3 className="mt-2 line-clamp-2 font-display font-semibold">{t.title}</h3>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{t.organization}</p>
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5" /> የሚዘጋው:- {fmt(t.deadline)}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </main>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 sm:items-center" onClick={() => setDetail(null)}>
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl bg-card p-6 shadow-card animate-sheet-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{detail.category ?? "ሌላ"}</span>
              <button onClick={() => setDetail(null)} aria-label="ዝጋ" className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
            </div>
            <h2 className="mt-3 font-display text-xl font-bold leading-snug">{detail.title}</h2>
            {detail.summary && (
              <div className="mt-4 rounded-2xl bg-primary/5 p-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-primary"><Sparkles className="h-3.5 w-3.5" /> ማጠቃለያ</p>
                <p className="mt-1.5 text-sm">{detail.summary}</p>
              </div>
            )}
            <div className="mt-5 space-y-4 border-t pt-5 text-sm">
              <Row icon={<Building2 className="h-4 w-4 text-primary" />} label="የጨረታ አውጪ ተቋም" value={detail.organization} />
              <Row icon={<CalendarDays className="h-4 w-4 text-primary" />} label="የተለጠፈበት ቀን" value={fmt(detail.posted_date)} />
              <Row icon={<Clock className="h-4 w-4 text-destructive" />} label="የመዝጊያ ቀን" value={fmt(detail.deadline)} />
              <Row icon={<MapPin className="h-4 w-4 text-primary" />} label="አድራሻ" value={detail.address} />
              <Row icon={<Phone className="h-4 w-4 text-primary" />} label="ስልክ" value={detail.phone} />
              <Row icon={<Mail className="h-4 w-4 text-primary" />} label="ኢሜይል" value={detail.email} />
            </div>
            <p className="mt-5 border-t pt-4 text-xs text-muted-foreground">Eliphaz ስብስብ · የመጀመሪያ ምንጭ: {detail.source_name || "—"}</p>
            {detail.source_url && (
              <Button asChild variant="outline" className="mt-4 w-full"><a href={detail.source_url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> የመጀመሪያው ማስታወቂያ</a></Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) {
  return (
    <div>
      <p className="flex items-center gap-2 font-semibold">{icon}{label}</p>
      <p className="mt-1 pl-6 text-muted-foreground">{value || "—"}</p>
    </div>
  );
}
