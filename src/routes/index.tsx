import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  Clock,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ጨረታ መከታተያ" },
      {
        name: "description",
        content: "ጨረታዎችን ይፈልጉ፣ የመዝጊያ ቀናትን ይከታተሉ እና ዝርዝር መረጃ ያስቀምጡ።",
      },
      { property: "og:title", content: "ጨረታ መከታተያ" },
      {
        property: "og:description",
        content: "ጨረታዎችን ይፈልጉ፣ የመዝጊያ ቀናትን ይከታተሉ እና ዝርዝር መረጃ ያስቀምጡ።",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Tender = {
  id: string;
  title: string;
  organization: string;
  category: string;
  postedDate: string;
  deadline: string;
  address: string;
  phone: string;
  email: string;
  saved: boolean;
};

const CATEGORIES = ["ሁሉም", "ክፍት", "ሕክምና", "ኮንስትራክሽን", "ኤሌክትሪክ", "ካርጎ"];

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const SEED: Tender[] = [
  {
    id: "1",
    title: "የኬሚካል እቃዎች አቅርቦት",
    organization: "የተቋም ስም",
    category: "ሕክምና",
    postedDate: addDays(-8),
    deadline: addDays(2),
    address: "አዲስ አበባ",
    phone: "0911 000 000",
    email: "tender@example.com",
    saved: false,
  },
  {
    id: "2",
    title: "የሕክምና መሣሪያዎች ግዢ",
    organization: "የተቋም ስም",
    category: "ሕክምና",
    postedDate: addDays(-5),
    deadline: addDays(12),
    address: "አዲስ አበባ",
    phone: "0911 000 000",
    email: "tender@example.com",
    saved: true,
  },
  {
    id: "3",
    title: "የላቦራቶሪ ዕቃዎች ግዢ",
    organization: "የተቋም ስም",
    category: "ሕክምና",
    postedDate: addDays(-3),
    deadline: addDays(25),
    address: "አዲስ አበባ",
    phone: "0911 000 000",
    email: "tender@example.com",
    saved: false,
  },
  {
    id: "4",
    title: "የተሽከርካሪ ግዢ",
    organization: "የተቋም ስም",
    category: "ካርጎ",
    postedDate: addDays(-30),
    deadline: addDays(-1),
    address: "አዲስ አበባ",
    phone: "0911 000 000",
    email: "tender@example.com",
    saved: false,
  },
];

function daysLeft(deadline: string): number {
  const ms = new Date(deadline + "T23:59:59").getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("am-ET", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const EMPTY_FORM = {
  title: "",
  organization: "",
  category: "ሕክምና",
  deadline: "",
  address: "",
  phone: "",
  email: "",
};

function Index() {
  const [tenders, setTenders] = useState<Tender[]>(SEED);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ሁሉም");
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState<Tender | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const visible = useMemo(() => {
    let list = tenders;
    if (filter === "ክፍት") list = list.filter((t) => daysLeft(t.deadline) >= 0);
    else if (filter !== "ሁሉም") list = list.filter((t) => t.category === filter);
    const q = query.trim();
    if (q) {
      list = list.filter(
        (t) =>
          t.title.includes(q) ||
          t.organization.includes(q) ||
          t.category.includes(q),
      );
    }
    return list;
  }, [tenders, query, filter]);

  const openCount = tenders.filter((t) => daysLeft(t.deadline) >= 0).length;

  function addTender() {
    if (!form.title.trim() || !form.deadline) return;
    setTenders((prev) => [
      {
        id: crypto.randomUUID(),
        title: form.title.trim(),
        organization: form.organization.trim() || "—",
        category: form.category,
        postedDate: new Date().toISOString().slice(0, 10),
        deadline: form.deadline,
        address: form.address.trim() || "—",
        phone: form.phone.trim() || "—",
        email: form.email.trim() || "—",
        saved: false,
      },
      ...prev,
    ]);
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  function toggleSave(id: string) {
    setTenders((prev) =>
      prev.map((t) => (t.id === id ? { ...t, saved: !t.saved } : t)),
    );
  }

  function remove(id: string) {
    setTenders((prev) => prev.filter((t) => t.id !== id));
    setDetail(null);
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto w-full max-w-2xl px-5 pb-32 pt-12">
        <header className="animate-rise-in">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            ጨረታ መከታተያ
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {openCount} ክፍት ጨረታዎች ከ{tenders.length}
          </p>
        </header>

        {/* Search */}
        <div
          className="relative mt-6 animate-rise-in"
          style={{ animationDelay: "60ms" }}
        >
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ጨረታ ፈልግ…"
            className="h-12 w-full rounded-2xl border bg-card pl-11 pr-4 text-sm shadow-card outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"
          />
        </div>

        {/* Category filters */}
        <div
          className="mt-4 flex gap-2 overflow-x-auto pb-1 animate-rise-in"
          style={{ animationDelay: "120ms" }}
        >
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                filter === c
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Tender cards */}
        <ul className="mt-5 space-y-4">
          {visible.length === 0 && (
            <li className="rounded-2xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
              ምንም ጨረታ አልተገኘም
            </li>
          )}
          {visible.map((tender, i) => {
            const left = daysLeft(tender.deadline);
            const closed = left < 0;
            const urgent = !closed && left <= 3;
            return (
              <li key={tender.id} className="animate-rise-in" style={{ animationDelay: `${160 + i * 50}ms` }}>
                <button
                  onClick={() => setDetail(tender)}
                  className="flex w-full overflow-hidden rounded-2xl border bg-card text-left shadow-card transition-transform hover:-translate-y-0.5"
                >
                  {/* Days-left block */}
                  <div
                    className={`flex w-20 shrink-0 flex-col items-center justify-center gap-0.5 px-2 py-5 ${
                      closed
                        ? "bg-muted text-muted-foreground"
                        : urgent
                          ? "bg-destructive/10 text-destructive"
                          : "bg-primary/10 text-primary"
                    }`}
                  >
                    {closed ? (
                      <span className="text-center text-xs font-semibold leading-tight">
                        ተዘግቷል
                      </span>
                    ) : (
                      <>
                        <span className="font-display text-3xl font-bold leading-none">
                          {left}
                        </span>
                        <span className="text-[11px] font-medium">ቀን ቀርቷል</span>
                      </>
                    )}
                  </div>
                  {/* Content */}
                  <div className="min-w-0 flex-1 p-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          closed
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {closed ? "ተዘግቷል" : "ክፍት"}
                      </span>
                      <span className="rounded-full bg-warning/40 px-2.5 py-0.5 text-[11px] font-semibold text-warning-foreground">
                        {tender.category}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label="አስቀምጥ"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSave(tender.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.stopPropagation();
                            toggleSave(tender.id);
                          }
                        }}
                        className="ml-auto rounded-lg p-1 text-muted-foreground hover:text-warning-foreground"
                      >
                        <Star
                          className={`h-4 w-4 ${tender.saved ? "fill-warning text-warning-foreground" : ""}`}
                        />
                      </span>
                    </div>
                    <h3 className="mt-2 truncate font-display font-semibold">
                      {tender.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {tender.organization}
                    </p>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      የሚዘጋው:- {formatDate(tender.deadline)}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </main>

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-6 right-5 flex h-14 items-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-fab transition-transform hover:scale-105 active:scale-95"
      >
        <Plus className="h-5 w-5" />
        ጨረታ ጨምር
      </button>

      {/* Add form sheet */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 sm:items-center"
          onClick={() => setShowForm(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-card p-6 shadow-card animate-sheet-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">አዲስ ጨረታ</h2>
              <button
                onClick={() => setShowForm(false)}
                aria-label="ዝጋ"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 grid max-h-[60vh] gap-3 overflow-y-auto pr-1">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="የጨረታው ርዕስ *"
                className="h-11 rounded-xl border bg-background px-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
              <input
                value={form.organization}
                onChange={(e) =>
                  setForm({ ...form, organization: e.target.value })
                }
                placeholder="ድርጅት / ተጫራች"
                className="h-11 rounded-xl border bg-background px-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">
                  ምድብ
                </span>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                >
                  {CATEGORIES.filter((c) => c !== "ሁሉም" && c !== "ክፍት").map(
                    (c) => (
                      <option key={c}>{c}</option>
                    ),
                  )}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">
                  የመዝጊያ ቀን *
                </span>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) =>
                    setForm({ ...form, deadline: e.target.value })
                  }
                  className="h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                />
              </label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="አድራሻ"
                className="h-11 rounded-xl border bg-background px-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="ስልክ"
                inputMode="tel"
                className="h-11 rounded-xl border bg-background px-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="ኢሜይል"
                inputMode="email"
                className="h-11 rounded-xl border bg-background px-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
              <button
                onClick={addTender}
                className="mt-1 flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-95"
              >
                <Plus className="h-4 w-4" />
                ጨረታ መዝግብ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail sheet */}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 sm:items-center"
          onClick={() => setDetail(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl bg-card p-6 shadow-card animate-sheet-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  daysLeft(detail.deadline) < 0
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {daysLeft(detail.deadline) < 0 ? "ተዘግቷል" : "ክፍት"}
              </span>
              <button
                onClick={() => setDetail(null)}
                aria-label="ዝጋ"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <h2 className="mt-3 font-display text-xl font-bold leading-snug">
              {detail.title}
            </h2>

            <div className="mt-5 space-y-4 border-t pt-5">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Building2 className="h-4 w-4 text-primary" />
                  የጨረታ አውጪ ተቋም
                </p>
                <p className="mt-1 pl-6 text-sm text-muted-foreground">
                  {detail.organization}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">የተለጠፈበት ቀን</p>
                <p className="mt-0.5 flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  {formatDate(detail.postedDate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">የመዝጊያ ቀን</p>
                <p className="mt-0.5 flex items-center gap-2 text-sm font-semibold text-destructive">
                  <Clock className="h-4 w-4" />
                  {formatDate(detail.deadline)}
                  {daysLeft(detail.deadline) >= 0 && (
                    <span className="text-xs font-medium text-muted-foreground">
                      ({daysLeft(detail.deadline)} ቀን ቀርቷል)
                    </span>
                  )}
                </p>
              </div>
              <div className="border-t pt-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <MapPin className="h-4 w-4 text-primary" />
                  የተቋሙ አድራሻ
                </p>
                <p className="mt-1 pl-6 text-sm text-muted-foreground">
                  {detail.address}
                </p>
              </div>
              <div className="border-t pt-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Phone className="h-4 w-4 text-primary" />
                  የመገኛ መረጃ
                </p>
                <p className="mt-1 pl-6 text-sm text-muted-foreground">
                  ስልክ: {detail.phone}
                </p>
                <p className="mt-1 flex items-center gap-2 pl-6 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  {detail.email}
                </p>
              </div>
            </div>

            <button
              onClick={() => remove(detail.id)}
              className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-destructive/10 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/20"
            >
              <Trash2 className="h-4 w-4" />
              ጨረታ ሰርዝ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
