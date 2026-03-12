"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUp, Compass, Flag, Sparkles } from "lucide-react";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Button } from "@/components/ui/button";

const journeySteps = [
  {
    title: "Discover your true position",
    body:
      "We start by listening deeply through surveys and targeted prompts so leadership can see where alignment and friction actually exist.",
  },
  {
    title: "Align the right teams",
    body:
      "North Star Partners translates your data into cross-functional priorities, helping teams move in the same direction with less drag.",
  },
  {
    title: "Move forward with confidence",
    body:
      "Dashboards, action plans, and measurable follow-through keep your organization progressing in a directionally correct way.",
  },
];

export default function HomePage() {
  useEffect(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "auto" });
  }, []);

  return (
    <>
      <Navbar />

      <main className="bg-black">
        {/* TOP OF STORY — light destination */}
        <section className="relative overflow-hidden bg-gradient-to-b from-white via-[#f8f3e7] to-[#f0e2c2] py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-nsp-green-700">
                End State
              </p>
              <h1 className="mt-4 font-serif text-4xl font-bold leading-tight text-nsp-blue-900 md:text-6xl">
                A clearer future.
                <br />
                A stronger direction.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-nsp-blue-700 md:text-lg">
                North Star Partners helps organizations move from ambiguity to
                aligned action through people-centered diagnostics, analytics,
                and practical strategy.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/contact">Start your journey</Link>
                </Button>
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/services">Explore services</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* MIDDLE OF STORY — gold transition */}
        <section className="relative border-y border-nsp-orange-500/40 bg-gradient-to-b from-[#e6c37d] via-[#d6ae5c] to-[#a9823f] py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-nsp-blue-900/80">
                The Climb
              </p>
              <h2 className="mt-4 font-serif text-3xl font-bold text-nsp-blue-900 md:text-4xl">
                Direction over drift
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {journeySteps.map((step, index) => (
                <article
                  key={step.title}
                  className="rounded-[--radius-lg] border border-nsp-blue-900/20 bg-white/70 p-6 shadow-lg backdrop-blur"
                >
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-nsp-green-700">
                    0{index + 1}
                  </p>
                  <h3 className="text-lg font-bold text-nsp-blue-900">{step.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-nsp-blue-700">
                    {step.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* BOTTOM OF STORY — dark starting point */}
        <section className="relative min-h-[95vh] overflow-hidden bg-black py-20 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_85%,rgba(201,154,60,0.34),rgba(0,0,0,0.95)_62%)]" />

          <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-nsp-orange-200">
              You begin here
            </p>
            <h2 className="mt-4 max-w-3xl font-serif text-4xl font-bold leading-tight md:text-6xl">
              Start at the edge.
              <br />
              Then move upward.
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-nsp-orange-100/85 md:text-lg">
              Most organizations feel progress pressure without directional
              confidence. Scroll up to experience the journey North Star
              Partners builds: clarity, alignment, and forward motion.
            </p>

            <div className="mt-10 rounded-[--radius-xl] border border-nsp-orange-300/35 bg-nsp-blue-900/40 px-4 py-3 text-nsp-orange-100">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ArrowUp className="h-4 w-4" />
                Scroll up to move forward
              </div>
            </div>

            <div className="mt-12 w-full max-w-md">
              <Image
                src="/brand/forest-city-reference.png"
                alt="North Star Partners brand crest"
                width={576}
                height={1024}
                className="mx-auto h-auto w-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.55)]"
                priority
              />
            </div>

            <div className="mt-10 grid w-full max-w-4xl grid-cols-1 gap-4 text-left sm:grid-cols-3">
              <div className="rounded-[--radius-lg] border border-nsp-orange-300/30 bg-white/5 p-4">
                <Compass className="mb-2 h-5 w-5 text-nsp-orange-200" />
                <p className="text-sm text-nsp-orange-100">Directional clarity</p>
              </div>
              <div className="rounded-[--radius-lg] border border-nsp-orange-300/30 bg-white/5 p-4">
                <Flag className="mb-2 h-5 w-5 text-nsp-orange-200" />
                <p className="text-sm text-nsp-orange-100">Aligned execution</p>
              </div>
              <div className="rounded-[--radius-lg] border border-nsp-orange-300/30 bg-white/5 p-4">
                <Sparkles className="mb-2 h-5 w-5 text-nsp-orange-200" />
                <p className="text-sm text-nsp-orange-100">Measurable momentum</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
