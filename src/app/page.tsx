"use client";

import Link from "next/link";
import { Compass, Flag, Sparkles } from "lucide-react";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Button } from "@/components/ui/button";
import { NspLogoMark } from "@/components/shared/nsp-logo-mark";

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
  return (
    <>
      <Navbar />

      <main className="relative overflow-hidden bg-gradient-to-b from-white via-[#f2e7cf] to-[#0b0b0d]">
        <div
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              "radial-gradient(1px 1px at 15% 20%, rgba(20,18,20,0.24), transparent 60%), radial-gradient(1px 1px at 72% 18%, rgba(20,18,20,0.16), transparent 60%), radial-gradient(1.5px 1.5px at 83% 58%, rgba(255,255,255,0.42), transparent 60%), radial-gradient(1px 1px at 35% 74%, rgba(255,255,255,0.3), transparent 60%), radial-gradient(1px 1px at 60% 88%, rgba(255,255,255,0.36), transparent 60%)",
          }}
        />

        {/* Top: light introduction */}
        <section className="relative py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-nsp-green-700">
                  Directionally Correct
                </p>
                <h1 className="mt-4 font-serif text-4xl font-bold leading-tight text-nsp-blue-900 md:text-6xl">
                  Move your organization
                  <br />
                  forward with clarity.
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-relaxed text-nsp-blue-700 md:text-lg">
                  North Star Partners combines consulting insight and practical
                  analytics to align teams, reveal friction early, and build
                  momentum around the right priorities.
                </p>

                <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row">
                  <Button size="lg" asChild>
                    <Link href="/contact">Start your journey</Link>
                  </Button>
                  <Button size="lg" variant="secondary" asChild>
                    <Link href="/services">Explore services</Link>
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <div className="rounded-[--radius-xl] border border-nsp-orange-300/70 bg-white/80 p-8 shadow-xl">
                  <NspLogoMark size={220} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mid: soft gold narrative */}
        <section className="relative border-y border-nsp-orange-500/25 py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-nsp-blue-800/90">
                The Journey
              </p>
              <h2 className="mt-4 font-serif text-3xl font-bold text-nsp-blue-900/95 md:text-4xl">
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

        {/* Bottom: dark finish */}
        <section className="relative min-h-[56vh] py-20 text-white">
          <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-nsp-orange-100">
              Keep moving forward
            </p>
            <h2 className="mt-4 max-w-3xl font-serif text-4xl font-bold leading-tight md:text-6xl">
              Insight that points true north.
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-nsp-orange-100/85 md:text-lg">
              We help your teams listen better, align faster, and execute with
              confidence using practical tools and measurable outcomes.
            </p>

            <div className="mt-12 grid w-full max-w-4xl grid-cols-1 gap-4 text-left sm:grid-cols-3">
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
