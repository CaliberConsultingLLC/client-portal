import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Target, Eye, Heart } from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description:
    "North Star Partners — people-centered consulting that transforms organizations through data-driven insights.",
};

export default function AboutPage() {
  return (
    <>
      {/* Header */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-text-primary md:text-5xl">
            About North Star Partners
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-text-secondary">
            We believe that every organization has the potential to be a place
            where people thrive. Our mission is to surface the insights that
            make that possible — through rigorous data collection, thoughtful
            analysis, and reporting that leadership actually acts on.
          </p>
        </div>
      </section>

      {/* Mission / Vision / Values */}
      <section className="bg-surface-2 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                icon: Target,
                title: "Our Mission",
                description:
                  "To help organizations build better cultures by turning employee feedback into actionable strategy — with custom tools, automated analysis, and beautiful reporting.",
              },
              {
                icon: Eye,
                title: "Our Vision",
                description:
                  "A world where every leader has access to the honest, data-driven insights they need to create workplaces where people genuinely want to contribute and grow.",
              },
              {
                icon: Heart,
                title: "Our Values",
                description:
                  "Confidentiality first. Custom over cookie-cutter. Insights over information. Partnership over transactions. Action over reports.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[--radius-lg] border border-border-default bg-white p-8 shadow-sm"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[--radius-md] bg-nsp-blue-50 text-nsp-blue-500">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-3 text-lg font-bold text-text-primary">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-text-secondary">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Approach */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="mb-8 text-center text-3xl font-extrabold text-text-primary">
            Our Approach
          </h2>
          <div className="prose prose-slate mx-auto max-w-none text-text-secondary">
            <p className="text-base leading-relaxed">
              Most consulting firms hand you a generic survey, run the numbers,
              and deliver a deck. We take a different approach. Every solution we
              build starts with understanding your organization&apos;s specific
              context — your industry, your culture, your challenges, and your
              goals.
            </p>
            <p className="mt-4 text-base leading-relaxed">
              From there, we design custom instruments that ask the right
              questions. Our automated pipeline handles the data — cleaning,
              normalizing, and analyzing responses to surface the insights that
              matter. And our reporting isn&apos;t just accurate, it&apos;s
              beautiful. We believe that insights only drive change when
              leadership actually engages with them.
            </p>
            <p className="mt-4 text-base leading-relaxed">
              We don&apos;t disappear after delivering a report. We partner with
              you to translate findings into action plans, track progress, and
              iterate. Our client portal gives you access to your data whenever
              you need it — no extra logins, no complicated software.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-surface-2 py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-extrabold text-text-primary">
            Let&apos;s work together
          </h2>
          <p className="mt-4 text-base text-text-secondary">
            Ready to learn more about how we can help your organization? Start
            with a conversation.
          </p>
          <Button size="lg" className="mt-8" asChild>
            <Link href="/contact">
              Get in Touch
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
