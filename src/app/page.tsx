"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Compass, Flag, TrendingUp } from "lucide-react";
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

const proofPoints = [
  { metric: "90-180", label: "day action plans" },
  { metric: "24 hrs", label: "initial response time" },
  { metric: "3 levels", label: "leadership-ready reporting" },
  { metric: "1 source", label: "single insight system" },
];

const outcomes = [
  {
    title: "Cross-functional friction surfaced early",
    body:
      "Departmental relationship maps reveal where execution breaks down before delivery risk compounds.",
  },
  {
    title: "Leadership alignment becomes measurable",
    body:
      "Teams move from opinion-driven conversations to shared metrics and practical commitments.",
  },
  {
    title: "Insights convert into execution plans",
    body:
      "Every engagement culminates in a prioritized roadmap that defines owners, timing, and checkpoints.",
  },
];

export default function HomePage() {
  return (
    <>
      <Navbar />

      <main className="relative overflow-hidden bg-gradient-to-b from-white via-[#f6f1e6] via-45% via-[#ead7ab] via-70% to-[#0b0b0d]">
        <div className="pointer-events-none absolute -left-56 -top-44 z-30">
          <NspLogoMark
            size={640}
            className="mix-blend-multiply saturate-125 contrast-110"
          />
        </div>
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-45"
          style={{
            backgroundImage:
              "radial-gradient(1px 1px at 8% 16%, rgba(20,18,20,0.26), transparent 60%), radial-gradient(1px 1px at 18% 22%, rgba(20,18,20,0.16), transparent 60%), radial-gradient(1px 1px at 29% 13%, rgba(20,18,20,0.18), transparent 60%), radial-gradient(1px 1px at 73% 20%, rgba(20,18,20,0.13), transparent 60%), radial-gradient(1.5px 1.5px at 88% 44%, rgba(255,255,255,0.38), transparent 60%), radial-gradient(1px 1px at 72% 64%, rgba(255,255,255,0.24), transparent 60%), radial-gradient(1px 1px at 56% 82%, rgba(255,255,255,0.3), transparent 60%), radial-gradient(1px 1px at 35% 76%, rgba(255,255,255,0.26), transparent 60%), radial-gradient(1px 1px at 82% 90%, rgba(255,255,255,0.28), transparent 60%)",
          }}
        />

        {/* Top: light introduction */}
        <section className="relative z-10 py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-nsp-green-700">
                  Built For Leadership Teams
                </p>
                <h1 className="mt-4 font-serif text-4xl font-bold leading-[1.05] text-nsp-blue-900 md:text-6xl">
                  Move your organization
                  <br />
                  forward with confidence.
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-relaxed text-nsp-blue-700/95 md:text-lg">
                  North Star Partners helps executive teams identify people and
                  culture risk, align around the right priorities, and execute
                  with measurable momentum.
                </p>

                <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  <Button size="lg" className="gap-2" asChild>
                    <Link href="/contact">
                      Schedule a conversation
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="secondary" asChild>
                    <Link href="/services">View engagement options</Link>
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Proof strip */}
        <section className="relative z-10 border-y border-nsp-orange-500/25 bg-white/45 py-8 backdrop-blur-sm">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-5 px-6 md:grid-cols-4">
            {proofPoints.map((item) => (
              <div
                key={item.metric}
                className="rounded-[--radius-md] border border-nsp-blue-900/10 bg-white/60 px-4 py-3 text-center shadow-sm"
              >
                <p className="text-xl font-extrabold text-nsp-blue-900">{item.metric}</p>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-nsp-blue-700/90">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Mid: soft gold narrative */}
        <section className="relative z-10 border-y border-nsp-orange-500/25 py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-nsp-blue-800/90">
                Operating Model
              </p>
              <h2 className="mt-4 font-serif text-3xl font-bold text-nsp-blue-900/95 md:text-4xl">
                A practical path from feedback to execution
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

        <section className="relative z-10 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto mb-10 max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-nsp-blue-800/90">
                Outcomes
              </p>
              <h2 className="mt-3 font-serif text-3xl font-bold text-nsp-blue-900 md:text-4xl">
                Evidence-focused consulting, not generic decks
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {outcomes.map((item) => (
                <article
                  key={item.title}
                  className="rounded-[--radius-lg] border border-nsp-blue-900/15 bg-white/75 p-6 shadow-[0_14px_30px_rgba(20,18,20,0.08)]"
                >
                  <div className="mb-3 inline-flex rounded-full border border-nsp-green-300/60 bg-nsp-green-50 px-2.5 py-1 text-xs font-semibold text-nsp-green-700">
                    Outcome
                  </div>
                  <h3 className="text-lg font-bold text-nsp-blue-900">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-nsp-blue-700">
                    {item.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="relative z-10 py-18">
          <div className="mx-auto grid max-w-6xl items-center gap-8 px-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[--radius-xl] border border-nsp-blue-900/15 bg-white/80 p-6 shadow-[0_18px_38px_rgba(20,18,20,0.08)]">
              <div className="relative mx-auto aspect-square max-w-[280px]">
                <Image
                  src="/CollabLogo.png"
                  alt="Collaboration analytics logo"
                  fill
                  sizes="280px"
                  className="object-contain"
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-nsp-green-700">
                Featured Platform
              </p>
              <h2 className="mt-3 font-serif text-3xl font-bold text-nsp-blue-900 md:text-4xl">
                Collaboration analytics leaders can actually act on
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-nsp-blue-700/95 md:text-lg">
                Our collaboration dashboard helps organizations see where
                cross-functional trust is strong, where friction is slowing
                execution, and where intervention can create measurable movement.
              </p>
              <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <Button size="lg" className="gap-2" asChild>
                  <Link href="/services#collaboration">
                    Explore collaboration analytics
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom: dark finish */}
        <section className="relative z-10 min-h-[56vh] py-20 text-white">
          <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-nsp-orange-100">
              Why NSP
            </p>
            <h2 className="mt-4 max-w-3xl font-serif text-4xl font-bold leading-tight md:text-6xl">
              Insight that points true north.
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-nsp-orange-100/85 md:text-lg">
              We combine consulting depth, structured analytics, and leadership
              communication discipline so recommendations actually translate into
              action.
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
                <TrendingUp className="mb-2 h-5 w-5 text-nsp-orange-200" />
                <p className="text-sm text-nsp-orange-100">Measurable momentum</p>
              </div>
            </div>

            <Button size="lg" className="mt-12 gap-2" asChild>
              <Link href="/contact">
                Talk with our team
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
