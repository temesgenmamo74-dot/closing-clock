import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Globe, Send, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ጨረታ መከታተያ — የኢትዮጵያ ጨረታዎች በአንድ ቦታ" },
      { name: "description", content: "ከመንግስትና ከግል ተቋማት ድረ-ገጾች እና ከቴሌግራም ቻናሎች በየቀኑ የሚሰበሰቡ ጨረታዎች። 7 ቀን ነፃ።" },
      { property: "og:title", content: "ጨረታ መከታተያ — የኢትዮጵያ ጨረታዎች በአንድ ቦታ" },
      { property: "og:description", content: "ከመንግስትና ከግል ተቋማት ድረ-ገጾች እና ከቴሌግራም ቻናሎች በየቀኑ የሚሰበሰቡ ጨረታዎች። 7 ቀን ነፃ።" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const items = [
    { icon: Globe, t: "ከብዙ ድረ-ገጾች", d: "የመንግስትና የግል ተቋማት ጨረታዎች" },
    { icon: Send, t: "ከቴሌግራም ቻናሎች", d: "ከታማኝ የጨረታ ቻናሎች" },
    { icon: Sparkles, t: "በAI ማጠቃለያ", d: "በአማርኛ አጭር መግለጫ" },
    { icon: Bell, t: "በየቀኑ ይታደሳል", d: "የመዝጊያ ቀን ቆጣሪ" },
  ];
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-5 py-16">
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl animate-rise-in">ጨረታ መከታተያ</h1>
      <p className="mt-3 text-muted-foreground animate-rise-in">የኢትዮጵያ ጨረታዎች በአንድ ቦታ — በየቀኑ በራሱ ይሰበሰባሉ።</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {items.map(({ icon: I, t, d }) => (
          <div key={t} className="rounded-2xl border bg-card p-4 shadow-card">
            <I className="h-5 w-5 text-primary" />
            <p className="mt-2 font-semibold">{t}</p>
            <p className="text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>
      <Link to="/tenders" className="mt-8 flex h-14 items-center justify-center rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-fab">
        የ7 ቀን ነፃ ሙከራ ጀምር
      </Link>
    </main>
  );
}
