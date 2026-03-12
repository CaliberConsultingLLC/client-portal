"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Send, CheckCircle2, Clock3, CalendarDays, Compass } from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      firstName: String(formData.get("firstName") || ""),
      lastName: String(formData.get("lastName") || ""),
      email: String(formData.get("email") || ""),
      organization: String(formData.get("organization") || ""),
      message: String(formData.get("message") || ""),
      website: String(formData.get("website") || ""),
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Submission failed. Please try again.");
        setLoading(false);
        return;
      }

      setSubmitted(true);
      form.reset();
    } catch {
      setError("Connection issue. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <section className="bg-gradient-to-b from-white via-[#f7f1e4] to-[#efe3c6] py-28">
        <div className="mx-auto max-w-md px-6 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-nsp-green-100">
            <CheckCircle2 className="h-8 w-8 text-nsp-green-300" />
          </div>
          <h1 className="text-2xl font-extrabold text-text-primary">
            Message sent
          </h1>
          <p className="mt-3 text-base text-text-secondary">
            Thanks for reaching out. We&apos;ll be in touch within one business
            day to schedule a conversation.
          </p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-[#f7f1e4] to-[#e7d4aa] py-20">
        <div
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              "radial-gradient(1px 1px at 14% 20%, rgba(20,18,20,0.16), transparent 60%), radial-gradient(1px 1px at 72% 18%, rgba(20,18,20,0.12), transparent 60%), radial-gradient(1px 1px at 83% 54%, rgba(255,255,255,0.35), transparent 60%), radial-gradient(1px 1px at 58% 84%, rgba(255,255,255,0.3), transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-nsp-green-700">
            Start A Conversation
          </p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-text-primary md:text-5xl">
            Get in Touch
          </h1>
          <p className="mt-4 text-lg text-text-secondary">
            Tell us a little about your organization and what you&apos;re
            looking to accomplish. We&apos;ll follow up to schedule a
            conversation.
          </p>
        </div>
      </section>

      <section className="bg-gradient-to-b from-[#e7d4aa] via-[#c7a664] to-[#0d1017] py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-nsp-green-500" />
                Start a Conversation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <input
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  className="hidden"
                />
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Input
                    label="First Name"
                    name="firstName"
                    placeholder="Jane"
                    required
                  />
                  <Input
                    label="Last Name"
                    name="lastName"
                    placeholder="Smith"
                    required
                  />
                </div>
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  placeholder="jane@company.com"
                  required
                />
                <Input
                  label="Organization"
                  name="organization"
                  placeholder="Acme Corp"
                />
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="message"
                    className="text-sm font-medium text-text-primary"
                  >
                    How can we help?
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    placeholder="Tell us about your organization and what you're looking to accomplish..."
                    required
                    className="flex w-full rounded-[--radius-md] border border-border-default bg-white px-4 py-3 text-sm text-text-primary shadow-sm transition-colors duration-[180ms] placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nsp-green-400 focus-visible:ring-offset-1"
                  />
                </div>
                {error && (
                  <p className="rounded-[--radius-md] border border-nsp-red-200 bg-nsp-red-50 px-3 py-2 text-sm text-nsp-red-700">
                    {error}
                  </p>
                )}
                <Button type="submit" size="lg" disabled={loading}>
                  {loading ? (
                    "Sending..."
                  ) : (
                    <>
                      Send Message
                      <Send className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4 text-white">
            <div className="rounded-[--radius-lg] border border-white/15 bg-white/5 p-5 backdrop-blur-sm">
              <h2 className="text-lg font-bold text-nsp-orange-100">What happens next</h2>
              <ul className="mt-4 space-y-3 text-sm text-nsp-orange-100/90">
                <li className="flex items-start gap-2">
                  <Clock3 className="mt-0.5 h-4 w-4 text-nsp-orange-200" />
                  We review your request within one business day.
                </li>
                <li className="flex items-start gap-2">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-nsp-orange-200" />
                  We schedule a focused 30-minute discovery conversation.
                </li>
                <li className="flex items-start gap-2">
                  <Compass className="mt-0.5 h-4 w-4 text-nsp-orange-200" />
                  You receive a clear recommendation and practical next steps.
                </li>
              </ul>
            </div>
            <div className="rounded-[--radius-lg] border border-white/15 bg-white/5 p-5 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-nsp-orange-200">
                Typical outcomes
              </p>
              <p className="mt-2 text-sm text-nsp-orange-100/90">
                Faster decision alignment, sharper cross-functional execution,
                and measurable movement on your most important people and
                culture priorities.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
