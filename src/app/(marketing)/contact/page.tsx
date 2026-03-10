"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Send, CheckCircle2 } from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    // TODO: wire up to API route or Supabase
    await new Promise((r) => setTimeout(r, 1000));
    setSubmitted(true);
    setLoading(false);
  }

  if (submitted) {
    return (
      <section className="bg-white py-28">
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
      {/* Header */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-text-primary md:text-5xl">
            Get in Touch
          </h1>
          <p className="mt-4 text-lg text-text-secondary">
            Tell us a little about your organization and what you&apos;re
            looking to accomplish. We&apos;ll follow up to schedule a
            conversation.
          </p>
        </div>
      </section>

      {/* Contact Form */}
      <section className="bg-surface-2 py-16">
        <div className="mx-auto max-w-xl px-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-nsp-blue-500" />
                Start a Conversation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
                    className="flex w-full rounded-[--radius-md] border border-border-default bg-white px-4 py-3 text-sm text-text-primary shadow-sm transition-colors duration-[180ms] placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nsp-blue-400 focus-visible:ring-offset-1"
                  />
                </div>
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
        </div>
      </section>
    </>
  );
}
