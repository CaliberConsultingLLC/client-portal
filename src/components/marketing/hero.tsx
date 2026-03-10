import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, Shield, Zap } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-nsp-blue-50/50 via-white to-nsp-orange-50/30" />

      <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-20 md:pb-28 md:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          {/* Tag */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-nsp-blue-200 bg-nsp-blue-50 px-4 py-1.5 text-xs font-semibold text-nsp-blue-600">
            <Zap className="h-3.5 w-3.5" />
            People-Centered Consulting
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-text-primary md:text-5xl lg:text-6xl">
            Turn employee insights into{" "}
            <span className="bg-gradient-to-r from-nsp-blue-500 to-nsp-blue-400 bg-clip-text text-transparent">
              organizational growth
            </span>
          </h1>

          {/* Subhead */}
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary md:text-xl">
            Custom surveys, automated analytics, and beautiful reporting — all
            in one platform. We help you understand your people and build a
            stronger organization.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/contact">
                Schedule a Conversation
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/services">Explore Our Services</Link>
            </Button>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            {
              icon: Shield,
              label: "Confidential",
              desc: "End-to-end data privacy",
            },
            {
              icon: BarChart3,
              label: "Actionable",
              desc: "Insights that drive change",
            },
            {
              icon: Zap,
              label: "Automated",
              desc: "From survey to report",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center gap-2 text-center"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-nsp-blue-50 text-nsp-blue-500">
                <item.icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-bold text-text-primary">
                {item.label}
              </span>
              <span className="text-xs text-text-muted">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
