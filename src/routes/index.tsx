import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Circle, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ተግባር — የተግባራት ማኔጀር" },
      {
        name: "description",
        content: "ዕለታዊ ተግባራትዎን በቀላሉ ያደራጁ፣ ይከታተሉ እና ይጨርሱ።",
      },
      { property: "og:title", content: "ተግባር — የተግባራት ማኔጀር" },
      {
        property: "og:description",
        content: "ዕለታዊ ተግባራትዎን በቀላሉ ያደራጁ፣ ይከታተሉ እና ይጨርሱ።",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Task = {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
};

type Filter = "all" | "active" | "done";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "ሁሉም" },
  { key: "active", label: "ያልተጠናቀቁ" },
  { key: "done", label: "የተጠናቀቁ" },
];

const SEED: Task[] = [
  { id: "1", title: "የማለዳ ስፖርት ማድረግ", done: true, createdAt: 1 },
  { id: "2", title: "የስራ ሪፖርት ማጠናቀቅ", done: false, createdAt: 2 },
  { id: "3", title: "ለጓደኛ መደወል", done: false, createdAt: 3 },
];

function Index() {
  const [tasks, setTasks] = useState<Task[]>(SEED);
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(() => {
    if (filter === "active") return tasks.filter((t) => !t.done);
    if (filter === "done") return tasks.filter((t) => t.done);
    return tasks;
  }, [tasks, filter]);

  const doneCount = tasks.filter((t) => t.done).length;
  const progress = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  function addTask() {
    const title = draft.trim();
    if (!title) return;
    setTasks((prev) => [
      { id: crypto.randomUUID(), title, done: false, createdAt: Date.now() },
      ...prev,
    ]);
    setDraft("");
  }

  function toggle(id: string) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    );
  }

  function remove(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="min-h-screen gradient-hero">
      <main className="mx-auto w-full max-w-xl px-5 pb-24 pt-16 sm:pt-24">
        <header className="animate-rise-in">
          <p className="text-sm font-medium tracking-widest text-primary uppercase">
            ዛሬ የሚሠራ
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
            ተግባር
          </h1>
          <p className="mt-3 text-muted-foreground">
            ተግባራትዎን ያክሉ፣ ይከታተሉ እና ይጨርሱ።
          </p>
        </header>

        {/* Progress */}
        <section
          className="mt-8 rounded-2xl border bg-card p-5 animate-rise-in"
          style={{ animationDelay: "80ms" }}
        >
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">የዛሬ እድገት</span>
            <span className="font-display text-2xl font-bold text-primary">
              {progress}%
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            ከ{tasks.length} ተግባራት {doneCount} ተጠናቀቁ
          </p>
        </section>

        {/* Add task */}
        <div
          className="mt-6 flex gap-2 animate-rise-in"
          style={{ animationDelay: "160ms" }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            placeholder="አዲስ ተግባር ይጻፉ…"
            className="h-12 flex-1 rounded-xl border bg-card px-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40"
          />
          <button
            onClick={addTask}
            aria-label="ተግባር ጨምር"
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform hover:scale-105 active:scale-95 glow-primary"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* Filters */}
        <div
          className="mt-6 flex gap-2 animate-rise-in"
          style={{ animationDelay: "240ms" }}
        >
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Task list */}
        <ul className="mt-6 space-y-3">
          {visible.length === 0 && (
            <li className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              ምንም ተግባር የለም — አዲስ ይጨምሩ!
            </li>
          )}
          {visible.map((task, i) => (
            <li
              key={task.id}
              className="group flex items-center gap-3 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40 animate-rise-in"
              style={{ animationDelay: `${300 + i * 60}ms` }}
            >
              <button
                onClick={() => toggle(task.id)}
                aria-label={task.done ? "እንዳልተጠናቀቀ ምልክት" : "እንደተጠናቀቀ ምልክት"}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  task.done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/40 text-transparent hover:border-primary"
                }`}
              >
                {task.done ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Circle className="h-3.5 w-3.5 opacity-0" />
                )}
              </button>
              <span
                className={`flex-1 text-sm transition-colors ${
                  task.done
                    ? "text-muted-foreground line-through"
                    : "text-foreground"
                }`}
              >
                {task.title}
              </span>
              <button
                onClick={() => remove(task.id)}
                aria-label="ተግባር ሰርዝ"
                className="rounded-lg p-2 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
