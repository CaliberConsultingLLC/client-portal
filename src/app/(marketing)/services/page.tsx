import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  Compass,
  TrendingUp,
  GitMerge,
  Users,
  Activity,
  HeartHandshake,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Custom employee experience solutions — culture surveys, leadership development, sentiment analysis, M&A integration, and more.",
};

const services = [
  {
    icon: ClipboardList,
    title: "Culture Surveys",
    id: "culture-surveys",
    description:
      "Comprehensive engagement and culture assessments designed for your organization. We go beyond generic questionnaires to ask the questions that matter for your specific context, industry, and goals.",
    features: [
      "Custom survey design tailored to your organization",
      "Confidential data collection with enterprise-grade security",
      "Automated analysis with trend detection",
      "Interactive dashboards for every level of leadership",
    ],
    accent: "nsp-blue",
  },
  {
    icon: Compass,
    title: "The Compass",
    id: "compass",
    description:
      "An individual leadership assessment tool that maps each leader's unique profile — strengths, blind spots, behavioral patterns, and growth opportunities. Powered by AI-driven analysis.",
    features: [
      "In-depth intake assessment covering leadership style, norms, and behaviors",
      "AI-generated narrative summary and insights",
      "Team-facing 360 feedback campaigns",
      "Personalized development roadmap",
    ],
    accent: "nsp-orange",
  },
  {
    icon: TrendingUp,
    title: "Leadership Development",
    id: "leadership",
    description:
      "Data-driven leadership growth programs that go beyond training. We build measurable development journeys grounded in real feedback from the people who work with your leaders every day.",
    features: [
      "360 feedback with effort and efficacy dimensions",
      "Coaching frameworks built on data",
      "Progress tracking across development cycles",
      "Peer and team perception analysis",
    ],
    accent: "nsp-green",
  },
  {
    icon: Activity,
    title: "Sentiment Analysis",
    id: "sentiment",
    description:
      "Ongoing pulse surveys and sentiment tracking that give you a real-time read on organizational health. Catch issues early and track the impact of your initiatives over time.",
    features: [
      "Automated recurring pulse surveys",
      "Real-time sentiment dashboards",
      "Trend analysis and early warning indicators",
      "Department and team-level breakdowns",
    ],
    accent: "nsp-orange",
  },
  {
    icon: GitMerge,
    title: "M&A Integration",
    id: "ma",
    description:
      "Cultural alignment assessments designed for mergers and acquisitions. Surface the cultural risks and opportunities that due diligence often misses.",
    features: [
      "Pre-merger cultural compatibility assessment",
      "Integration progress tracking",
      "Employee sentiment monitoring during transitions",
      "Risk identification and mitigation planning",
    ],
    accent: "nsp-yellow",
  },
  {
    icon: Users,
    title: "Department Collaboration",
    id: "collaboration",
    description:
      "Cross-functional effectiveness analysis that identifies where teams connect well and where friction slows things down. Build bridges between departments with data.",
    features: [
      "Inter-department relationship mapping",
      "Communication effectiveness scoring",
      "Friction point identification",
      "Collaboration improvement action plans",
    ],
    accent: "nsp-blue",
  },
  {
    icon: HeartHandshake,
    title: "Working Relationships",
    id: "relationships",
    description:
      "Assess and improve team dynamics and interpersonal effectiveness. Understand how people work together and where relationships need support.",
    features: [
      "Team dynamics assessment",
      "Interpersonal effectiveness scoring",
      "Relationship health tracking",
      "Targeted intervention recommendations",
    ],
    accent: "nsp-red",
  },
];

export default function ServicesPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-[#f7f1e4] to-[#e7d4aa] py-20">
        <div
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              "radial-gradient(1px 1px at 12% 20%, rgba(20,18,20,0.18), transparent 60%), radial-gradient(1px 1px at 74% 16%, rgba(20,18,20,0.14), transparent 60%), radial-gradient(1px 1px at 82% 54%, rgba(255,255,255,0.4), transparent 60%), radial-gradient(1px 1px at 56% 82%, rgba(255,255,255,0.3), transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-nsp-green-700">
            Engagement Options
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-text-primary md:text-5xl">
            Our Services
          </h1>
          <p className="mt-4 text-lg text-text-secondary">
            Every organization is different. We build custom solutions that fit
            your specific challenges, culture, and goals.
          </p>
        </div>
      </section>

      {/* Services Detail */}
      <section className="bg-gradient-to-b from-[#e7d4aa] via-[#d6b573] to-[#111724] py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex flex-col gap-16">
            {services.map((service) => (
              <div
                key={service.id}
                id={service.id}
                className="scroll-mt-20 rounded-[--radius-xl] border border-border-default bg-white p-8 shadow-sm md:p-10"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[--radius-md]"
                    style={{
                      backgroundColor: `var(--color-${service.accent}-50)`,
                      color: `var(--color-${service.accent}-500, var(--color-${service.accent}-400))`,
                    }}
                  >
                    <service.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold text-text-primary">
                      {service.title}
                    </h2>
                    <p className="mt-3 text-base leading-relaxed text-text-secondary">
                      {service.description}
                    </p>
                    <ul className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {service.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2 text-sm text-text-primary"
                        >
                          <span
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: `var(--color-${service.accent}-400)` }}
                          />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#111724] py-20 text-white">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-nsp-orange-200">
            Not sure where to begin?
          </p>
          <h2 className="mt-3 text-3xl font-extrabold text-white">
            Not sure which solution fits?
          </h2>
          <p className="mt-4 text-base text-nsp-orange-100/90">
            We start every engagement with a conversation. Tell us about your
            organization and we&apos;ll recommend the right approach.
          </p>
          <Button size="lg" className="mt-8" asChild>
            <Link href="/contact">
              Let&apos;s Talk
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
