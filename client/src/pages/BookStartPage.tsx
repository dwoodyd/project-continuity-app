import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Check, Feather, Save } from "lucide-react";
import { PageMeta } from "@/components/PageMeta";

const BOOK_EXERCISE_KEY = "continuary-book-start-v1";

function starterEntry(dateLabel: string) {
  return `${dateLabel}\n\nI can start before I feel ready by…\n`;
}

export default function BookStartPage() {
  const [, navigate] = useLocation();
  const [content, setContent] = useState("");
  const [saved, setSaved] = useState(false);
  const [bookCode, setBookCode] = useState("");
  const dateLabel = useMemo(
    () => new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date()),
    [],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const incomingCode = params.get("code")?.trim().toUpperCase() ?? "";
    const stored = window.localStorage.getItem(BOOK_EXERCISE_KEY);
    if (stored) {
      try {
        const draft = JSON.parse(stored) as { content?: string; bookCode?: string };
        setContent(draft.content || starterEntry(dateLabel));
        setBookCode(incomingCode || draft.bookCode || "");
        setSaved(Boolean(draft.content));
        return;
      } catch {
        window.localStorage.removeItem(BOOK_EXERCISE_KEY);
      }
    }
    setContent(starterEntry(dateLabel));
    setBookCode(incomingCode);
  }, [dateLabel]);

  function saveLocally() {
    window.localStorage.setItem(BOOK_EXERCISE_KEY, JSON.stringify({ content, bookCode, updatedAt: new Date().toISOString() }));
    setSaved(true);
  }

  function continueWithAccount() {
    saveLocally();
    const query = new URLSearchParams({ source: "permission-to-start" });
    if (bookCode) query.set("bookCode", bookCode);
    navigate(`/apply?${query.toString()}`);
  }

  return (
    <main id="main-content" className="min-h-screen px-4 py-8 text-[#2A2D28] sm:px-6" style={{ background: "#F4F5F2" }}>
      <PageMeta
        title="Permission to Start Exercise"
        description="Try one Permission to Start exercise—no Continuary account required. Your draft stays on this device until you decide it is worth keeping."
        path="/start"
      />
      <div className="mx-auto max-w-2xl">
        <a href="/welcome" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#6B6F68] underline-offset-4 hover:text-[#2A2D28] hover:underline">
          <ArrowRight className="h-4 w-4 rotate-180" aria-hidden="true" />
          Back to Continuary
        </a>

        <section className="mt-8 border border-[#D3D6D0] bg-[#E6E8E3] p-5 sm:p-8" aria-labelledby="book-start-title">
          <div className="flex items-start gap-3">
            <Feather className="mt-0.5 h-5 w-5 text-[#C8452B]" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B6F68]">Permission to Start</p>
              <h1 id="book-start-title" className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#2A2D28] sm:text-4xl">Start before it feels finished.</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#6B6F68] sm:text-base">
                This first exercise does not need an account. Write one honest line. It stays on this device until you decide it is worth keeping.
              </p>
              <p className="mt-3 text-sm text-[#6B6F68]">
                Permission to Start is now available —{" "}
                <a href="https://www.soulengineer.online/books" target="_blank" rel="noopener noreferrer" className="font-medium text-[#C8452B] underline underline-offset-2">get the digital edition</a>
                {" "}or{" "}
                <a href="https://a.co/d/0bvqj6jD" target="_blank" rel="noopener noreferrer" className="font-medium text-[#C8452B] underline underline-offset-2">the paperback</a>.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5 border border-[#D3D6D0] bg-[#F4F5F2] p-5 sm:p-8" aria-label="Start exercise">
          <label htmlFor="book-start-code" className="block text-sm font-semibold text-[#2A2D28]">Book code <span className="font-normal text-[#6B6F68]">(optional)</span></label>
          <input
            id="book-start-code"
            value={bookCode}
            onChange={(event) => { setBookCode(event.target.value.toUpperCase()); setSaved(false); }}
            placeholder="From your copy of Permission to Start"
            className="mt-2 min-h-11 w-full border border-[#C9CCC5] bg-transparent px-3 text-sm text-[#2A2D28] outline-none placeholder:text-[#6B6F68] focus:border-[#C8452B]"
          />
          <label htmlFor="book-start-entry" className="block text-sm font-semibold text-[#2A2D28]">Your draft</label>
          <p className="mt-1 text-sm text-[#6B6F68]">A draft is enough. You are not making a promise.</p>
          <textarea
            id="book-start-entry"
            value={content}
            onChange={(event) => { setContent(event.target.value); setSaved(false); }}
            className="mt-5 min-h-56 w-full resize-y border-y border-[#C9CCC5] bg-transparent px-0 py-4 text-base leading-7 text-[#2A2D28] outline-none focus:border-[#C8452B]"
            style={{ fontFamily: '"Courier Prime", "Courier New", monospace' }}
            spellCheck
          />
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#6B6F68]">{saved ? "Saved on this device." : "Nothing is sent anywhere."}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button onClick={saveLocally} className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#AEB2AB] px-4 text-sm font-semibold text-[#2A2D28] hover:bg-[#E6E8E3]">
                {saved ? <Check className="h-4 w-4" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                {saved ? "Saved here" : "Save this draft"}
              </button>
              <button onClick={continueWithAccount} className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#C8452B] px-4 text-sm font-semibold text-white hover:bg-[#AB3823]">
                Take it with you
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
