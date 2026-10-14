import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  Plus,
  Trash2,
  Trophy,
  X,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ጨረታ — የጨረታ መከታተያ" },
      {
        name: "description",
        content: "ጨረታዎችን ያዘጋጁ፣ የመዝጊያ ቀናትን ይከታተሉ እና ውጤቶችን ይመዝግቡ።",
      },
      { property: "og:title", content: "ጨረታ — የጨረታ መከታተያ" },
      {
        property: "og:description",
        content: "ጨረታዎችን ያዘጋጁ፣ የመዝጊያ ቀናትን ይከታተሉ እና ውጤቶችን ይመዝግቡ።",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Status = "open" | "submitted" | "won" | "lost";

type Tender = {
  id: string;
  title: string;
  organization: string;
  deadline: string;
  budget: string;
  status: Status;
};

const STATUS_META: Record<Status, { label: string; className: string }> = {
  open: { label: "ክፍት", className: "bg-primary/15 text-primary" },
  submitted: { label: "ቀርቧል", className: "bg-chart-2/15 text-chart-2" },
  won: { label: "ተሸንፏል", className: "bg-chart-5/15 text-chart-5" },
  lost: { label: "ተሸንፎበታል", className: "bg-destructive/15 text-destructive" },
};

const STATUS_ORDER: Status[] = ["open", "submitted", "won", "lost"];

const SEED: Tender[] = [
  {
    id: "1",
    title: "የቢሮ እቃዎች አቅርቦት",
    organization: "ከተማ አስተዳደር",
    deadline: addDays(5),
    budget: "250,000",
    status: "open",
  },
  {
    id: "2",
    title: "የኮምፒውተር ላቦራቶሪ ግንባታ",
    organization: "የትምህርት ቢሮ",
    deadline: addDays(12),
    budget: "1,800,000",
    status: "submitted",
  },
  {
    id: "3",
    title: "የጽዳት አገልግሎት ውል",
    organization: "ሆስፒታል",
    deadline: addDays(-2),
    budget: "600,000",
    status: "won",
  },
];

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

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

const EMPTY_FORM = { title: "", organization: "", deadline: "", budget: "" };

function Index() {
  const [tenders, setTenders] = useState<Tender[]>(SEED);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<Status | "all">("all");

  const visible = useMemo(
    () =>
      filter === "all" ? tenders : tenders.filter((t) => t.status === filter),
    [tenders, filter],
  );

  const stats = useMemo(
    () => ({
      open: tenders.filter((t) => t.status === "open").length,
      submitted: tenders.filter((t) => t.status === "submitted").length,
      won: tenders.filter((t) => t.status === "won").length,
    }),
    [tenders],
  );

  function addTender() {
    if (!form.title.trim() || !form.deadline) return;
    setTenders((prev) => [
      {
        id: crypto.randomUUID(),
        title: form.title.trim(),
        organization: form.organization.trim() || "—",
        deadline: form.deadline,
        budget: form.budget.trim(),
        status: "open",
      },
      ...prev,
    ]);
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  function cycleStatus(id: string) {
    setTenders((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status:
                STATUS_ORDER[
                  (STATUS_ORDER.indexOf(t.status) + 1) % STATUS_ORDER.length
                ] ?? "open",
            }
          : t,
      ),
    );
  }

  function remove(id: string) {
    setTenders((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="min-h-screen gradient-hero">
      <main className="mx-auto w-full max-w-2xl px-5 pb-24 pt-14 sm:pt-20">
        <header className="animate-rise-in">
          <p className="text-sm font-medium tracking-widest text-primary uppercase">
            የጨረታ መከታተያ
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
            ጨረታ
          </h1>
          <p className="mt-3 text-muted-foreground">
            ጨረታዎችን ይመዝግቡ፣ የመዝጊያ ቀናትን ይከታተሉ እና ውጤቶችን ያስቀምጡ።
          </p>
        </header>

        {/* Stats */}
        <section
          className="mt-8 grid grid-cols-3 gap-3 animate-rise-in"
          style={{ animationDelay: "80ms" }}
        >
          {(
            [
              { label: "ክፍት", value: stats.open },
              { label: "ቀርቧል", value: stats.submitted },
              { label: "ተሸንፏል", value: stats.won },
            ] as const
          ).map((s) => (
            <div key={s.label} className="rounded-2xl border bg-card p-4">
              <p className="font-display text-2xl font-bold text-primary">
                {s.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </section>

        {/* Add tender */}
        <div className="mt-6 animate-rise-in" style={{ animationDelay: "160ms" }}>
          {showForm ? (
            <div className="rounded-2xl border bg-card p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">
                  አዲስ ጨረታ
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  aria-label="ዝጋ"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 grid gap-3">
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="የጨረታው ርዕስ *"
                  className="h-11 rounded-xl border bg-background px-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40"
                />
                <input
                  value={form.organization}
                  onChange={(e) =>
                    setForm({ ...form, organization: e.target.value })
                  }
                  placeholder="ድርጅት / ተጫራች"
                  className="h-11 rounded-xl border bg-background px-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40"
                />
                <div className="grid grid-cols-2 gap-3">
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
                      className="h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-muted-foreground">
                      በጀት (ብር)
                    </span>
                    <input
                      value={form.budget}
                      onChange={(e) =>
                        setForm({ ...form, budget: e.target.value })
                      }
                      placeholder="0"
                      inputMode="numeric"
                      className="h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40"
                    />
                  </label>
                </div>
                <button
                  onClick={addTender}
                  className="mt-1 flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-95 glow-primary"
                >
                  <Plus className="h-4 w-4" />
                  ጨረታ መዝግብ
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
            >
              <Plus className="h-4 w-4" />
              አዲስ ጨረታ ጨምር
            </button>
          )}
        </div>

        {/* Filters */}
        <div
          className="mt-6 flex flex-wrap gap-2 animate-rise-in"
          style={{ animationDelay: "240ms" }}
        >
          {(["all", ...STATUS_ORDER] as const).map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              {key === "all" ? "ሁሉም" : STATUS_META[key].label}
            </button>
          ))}
        </div>

        {/* Tender list */}
        <ul className="mt-6 space-y-3">
          {visible.length === 0 && (
            <li className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              ምንም ጨረታ የለም — አዲስ ይጨምሩ!
            </li>
          )}
          {visible.map((tender, i) => {
            const left = daysLeft(tender.deadline);
            const meta = STATUS_META[tender.status];
            return (
              <li
                key={tender.id}
                className="group rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40 animate-rise-in"
                style={{ animationDelay: `${300 + i * 60}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-display font-semibold">
                      {tender.title}
                    </h3>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      {tender.organization}
                    </p>
                  </div>
                  <button
                    onClick={() => cycleStatus(tender.id)}
                    title="ሁኔታ ለመቀየር ይጫኑ"
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-transform hover:scale-105 ${meta.className}`}
                  >
                    {meta.label}
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDate(tender.deadline)}
                    {tender.status === "open" && (
                      <span
                        className={
                          left < 0
                            ? "text-destructive"
                            : left <= 3
                              ? "font-semibold text-primary"
                              : ""
                        }
                      >
                        {left < 0
                          ? "(ጊዜው አልፏል)"
                          : left === 0
                            ? "(ዛሬ ይዘጋል!)"
                            : `(${left} ቀን ቀርቷል)`}
                      </span>
                    )}
                  </span>
                  {tender.budget && (
                    <span className="flex items-center gap-1.5">
                      <Trophy className="h-3.5 w-3.5" />
                      {tender.budget} ብር
                    </span>
                  )}
                  <button
                    onClick={() => remove(tender.id)}
                    aria-label="ጨረታ ሰርዝ"
                    className="ml-auto rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
