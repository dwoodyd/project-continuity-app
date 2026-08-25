import { ArrowRight, BookOpen, Feather } from "lucide-react";
import { PageMeta } from "@/components/PageMeta";

export default function BookStartHerePage() {
  return (
    <main id="main-content" className="min-h-screen px-4 py-8 text-[#2A2D28] sm:px-6" style={{ background: "#F4F5F2" }}>
      <PageMeta
        title="Start Here — Permission to Start"
        description="A quiet first step for Permission to Start readers: begin one private exercise, then explore Continuary when you are ready."
        path="/start-here"
      />

      <div className="mx-auto max-w-2xl">
        <a href="/welcome" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#6B6F68] underline-offset-4 hover:text-[#2A2D28] hover:underline">
          <ArrowRight className="h-4 w-4 rotate-180" aria-hidden="true" />
          Back to Continuary
        </a>

        <section className="mt-8 border border-[#D3D6D0] bg-[#E6E8E3] p-5 sm:p-8" aria-labelledby="start-here-title">
          <div className="flex items-start gap-3">
            <BookOpen className="mt-0.5 h-5 w-5 text-[#C8452B]" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B6F68]">Permission to Start</p>
              <h1 id="start-here-title" className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#2A2D28] sm:text-4xl">You have the book. Start here.</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#6B6F68] sm:text-base">
                Thank you for bringing it home. You do not have to change everything today—just choose one small place to begin.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5 border border-[#D3D6D0] bg-[#F4F5F2] p-5 sm:p-8" aria-labelledby="first-step-title">
          <div className="flex items-start gap-3">
            <Feather className="mt-0.5 h-5 w-5 text-[#C8452B]" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B6F68]">Your first step</p>
              <h2 id="first-step-title" className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-[#2A2D28]">Write one line before you feel ready.</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#6B6F68]">
                The first exercise is private and does not need an account. A draft is enough.
              </p>
              <a href="/start" className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 bg-[#C8452B] px-4 text-sm font-semibold text-white hover:bg-[#AB3823]">
                Begin the first exercise
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        <section className="mt-5 border-t border-[#D3D6D0] pt-5" aria-labelledby="continuary-next-title">
          <h2 id="continuary-next-title" className="text-lg font-semibold text-[#2A2D28]">When you want a place to keep the thread.</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#6B6F68]">
            Continuary is a quiet companion for returning to what matters, one small continuation at a time.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <a href="/welcome" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#C8452B] underline underline-offset-4 hover:text-[#AB3823]">
              See how Continuary works
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a href="/apply?source=permission-to-start-start-here" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#6B6F68] underline underline-offset-4 hover:text-[#2A2D28]">
              Apply for Continuary
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
