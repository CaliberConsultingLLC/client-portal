import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { NorthstarProductCarousel } from "@/components/marketing/northstar-product-carousel";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "NorthStar One Pager",
  description:
    "A zero-scroll North Star Partners one-pager focused on workforce insight, practical outcomes, and product proof.",
};

const messagePoints = [
  "Find where workforce friction is actually forming",
  "See what leaders should address first",
  "Move from insight to action in the same view",
];

export default function NorthStarOnePager() {
  return (
    <main className="h-screen overflow-hidden bg-[radial-gradient(circle_at_12%_10%,rgba(255,255,255,0.48),transparent_34%),radial-gradient(circle_at_84%_0%,rgba(201,154,60,0.22),transparent_30%),linear-gradient(168deg,#ede1c2_0%,#dec891_40%,#132134_100%)] text-text-primary">
      <div className="mx-auto grid h-full max-w-[1500px] grid-rows-[0.9fr_1.1fr] gap-5 px-6 py-6 xl:gap-6 xl:px-10 xl:py-8">
        <section className="grid min-h-0 grid-cols-1 gap-5 rounded-[30px] border border-white/38 bg-white/78 p-6 shadow-[0_20px_46px_rgba(16,35,51,0.14)] backdrop-blur-sm xl:grid-cols-[1.1fr_0.9fr] xl:p-8">
          <div className="flex min-h-0 flex-col justify-between">
            <div className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-nsp-green-700">
                North Star Partners | Workforce Clarity
              </p>
              <h1 className="font-serif text-[clamp(2rem,2.7vw,3.35rem)] font-bold leading-[1.05] text-nsp-blue-900">
                Understand your workforce from a new angle.
                <span className="block text-nsp-blue-700">Gain immediate insight to pull the right levers.</span>
              </h1>
              <p className="max-w-3xl text-[clamp(0.95rem,1.08vw,1.18rem)] leading-relaxed text-nsp-blue-700/95">
                We help leadership teams quickly see where people dynamics are limiting execution, then
                convert those findings into focused, practical actions that improve outcomes.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link href="/contact">
                  Request a tailored walkthrough
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-nsp-blue-700/82">
                One page. One story. One next step.
              </p>
            </div>
          </div>
          <div className="grid min-h-0 gap-3">
            {messagePoints.map((point) => (
              <article
                key={point}
                className="rounded-2xl border border-nsp-blue-200/60 bg-[#eef3f8] px-4 py-3 text-sm font-medium leading-relaxed text-nsp-blue-900"
              >
                {point}
              </article>
            ))}
            <article className="rounded-2xl border border-nsp-orange-300/45 bg-[#132134] px-4 py-3 text-sm leading-relaxed text-nsp-orange-100/90">
              Product output speaks louder than slogans. Hover over the cards below to preview how
              leaders would experience the data.
            </article>
          </div>
        </section>

        <section className="min-h-0 rounded-[30px] border border-white/28 bg-[#0f1f31]/92 p-5 shadow-[0_20px_46px_rgba(8,14,24,0.38)]">
          <NorthstarProductCarousel />
        </section>
      </div>
    </main>
  );
}
