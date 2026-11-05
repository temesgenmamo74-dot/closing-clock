import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "የግላዊነት ፖሊሲ — Eliphaz" },
      { name: "description", content: "Eliphaz የተጠቃሚዎችን መረጃ እንዴት እንደሚጠብቅ። Privacy Policy." },
      { property: "og:title", content: "የግላዊነት ፖሊሲ — Eliphaz" },
      { property: "og:description", content: "Eliphaz Privacy Policy" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-5 py-10 text-sm leading-relaxed text-foreground">
      <h1 className="text-2xl font-bold">የግላዊነት ፖሊሲ</h1>
      <p>Eliphaz ከኢትዮጵያ ይፋዊ ምንጮች የተሰበሰቡ ጨረታዎችን የሚያሳይ መተግበሪያ ነው።</p>
      <h2 className="font-semibold">የምንሰበስበው መረጃ</h2>
      <p>ስም፣ ስልክ ቁጥር እና የይለፍ ቃል (በምስጢር የተቀመጠ) ብቻ። ቴሌግራም ቦቱን ከጀመሩ የቴሌግራም መለያ ቁጥርዎ ማሳወቂያ ለመላክ ብቻ ይቀመጣል።</p>
      <h2 className="font-semibold">አጠቃቀም</h2>
      <p>መረጃዎ ለመግቢያ፣ ለደንበኝነት ማረጋገጫ እና ለጨረታ ማሳወቂያ ብቻ ይውላል። ለማንም አይሸጥም ወይም አይሰጥም።</p>
      <h2 className="font-semibold">መረጃን ማጥፋት</h2>
      <p>መለያዎ እንዲጠፋ ከፈለጉ ባለቤቱን በስልክ ያነጋግሩ፤ መረጃዎ ይሰረዛል።</p>
      <hr />
      <h1 className="text-xl font-bold">Privacy Policy</h1>
      <p>Eliphaz shows tenders collected from public Ethiopian sources. We store only your name, phone number and a securely hashed password, plus your Telegram chat ID if you start our bot. Data is used only for sign-in, subscription and tender notifications, and is never sold or shared. To delete your account, contact the owner by phone.</p>
    </main>
  );
}
