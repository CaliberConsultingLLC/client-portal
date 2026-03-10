import Link from "next/link";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Hero } from "@/components/marketing/hero";
import { ServiceCard } from "@/components/marketing/service-card";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  Compass,
  TrendingUp,
  GitMerge,
  Users,
  Activity,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const services = [
  {
    icon: ClipboardList,
    title: "Culture Surveys",
    description:
      "Comprehensive employee engagement and culture assessments tailored to your organization's unique needs.",
    accent: "nsp-blue",
  },
  {
    icon: Compass,
    title: "The Compass",
    description:
      "Individual leadership assessment that maps strengths, blind spots, and growth opportunities for every leader.",
    accent: "nsp-orange",
  },
  {
    icon: TrendingUp,
    title: "Leadership Development",
    description:
      "Targeted programs built on data — 360 feedback, coaching frameworks, and measurable growth tracking.",
    accent: "nsp-green",
  },
  {
    icon: GitMerge,
    title: "M&A Integration",
    description:
      "Cultural alignment assessments that surface risks and opportunities during mergers and acquisitions.",
    accent: "nsp-yellow",
  },
  {
    icon: Users,
    title: "Department Collaboration",
    description:
      "Cross-functional effectiveness analysis that identifies friction points and builds bridges between teams.",
    accent: "nsp-blue",
  },
  {
    icon: Activity,
    title: "Sentiment Analysis",
    description:
      "Ongoing pulse surveys and sentiment tracking that keep you connected to your organization's heartbeat.",
    accent: "nsp-orange",
  },
];

const processSteps = [
  {
    step: "01",
    title: "Listen",
    description:
      "We design and deploy confidential surveys that capture honest employee perspectives across your organization.",
  },
  {
    step: "02",
    title: "Analyze",
    description:
      "Our automated pipeline cleans, normalizes, and analyzes response data — surfacing trends, patterns, and actionable insights.",
  },
  {
    step: "03",
    title: "Report",
    description:
      "Beautiful, interactive dashboards deliver insights to every level of leadership through a secure client portal.",
  },
  {
    step: "04",
    title: "Act",
    description:
      "We partner with you to translate insights into concrete action plans that drive measurable organizational improvement.",
  },
];

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <Hero />

        {/* Services Section */}
        <section className="bg-surface-2 py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto mb-14 max-w-2xl text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-text-primary md:text-4xl">
                Solutions for every stage of your journey
              </h2>
              <p className="mt-4 text-base text-text-secondary">
                Whether you need a comprehensive culture assessment or a
                targeted leadership tool, we build the right solution for your
                organization.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <ServiceCard
                  key={service.title}
                  icon={service.icon}
                  title={service.title}
                  description={service.description}
                  accentColor={service.accent}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Process Section */}
        <section className="bg-white py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto mb-14 max-w-2xl text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-text-primary md:text-4xl">
                How we work
              </h2>
              <p className="mt-4 text-base text-text-secondary">
                A proven process that transforms raw feedback into
                organizational growth.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
              {processSteps.map((item) => (
                <div key={item.step} className="relative">
                  <div className="mb-4 text-3xl font-extrabold text-nsp-blue-100">
                    {item.step}
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-text-primary">
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

        {/* Why NSP Section */}
        <section className="bg-surface-2 py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-text-primary md:text-4xl">
                  Why North Star Partners?
                </h2>
                <p className="mt-4 text-base leading-relaxed text-text-secondary">
                  We combine deep consulting expertise with modern technology to
                  deliver insights that actually drive change — not just reports
                  that sit on a shelf.
                </p>
                <ul className="mt-8 flex flex-col gap-4">
                  {[
                    "Custom solutions built for your specific challenges",
                    "Confidential, enterprise-grade data security",
                    "Automated pipeline from survey to insight",
                    "Beautiful reporting that leadership actually uses",
                    "Ongoing partnership, not one-time engagements",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-nsp-green-300" />
                      <span className="text-sm text-text-primary">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Visual placeholder */}
              <div className="flex items-center justify-center">
                <div className="glass-surface flex h-80 w-full items-center justify-center rounded-[--radius-xl]">
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-nsp-blue-50">
                      <Compass className="h-8 w-8 text-nsp-blue-500" />
                    </div>
                    <p className="text-sm font-medium text-text-muted">
                      Dashboard preview coming soon
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-nsp-blue-500 py-20">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              Ready to understand your organization better?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-nsp-blue-100">
              Let&apos;s start with a conversation about your goals. We&apos;ll
              design a solution that fits your organization&apos;s unique needs.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                className="bg-white text-nsp-blue-600 hover:bg-nsp-blue-50"
                asChild
              >
                <Link href="/contact">
                  Schedule a Conversation
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
