"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getFirebaseAuth } from "@/lib/firebase/client";

export function PortalSignInForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/portal";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    try {
      const credential = await signInWithEmailAndPassword(
        getFirebaseAuth(),
        email,
        password
      );
      const idToken = await credential.user.getIdToken();
      const sessionResponse = await fetch("/api/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ idToken }),
      });

      if (!sessionResponse.ok) {
        throw new Error("Session creation failed");
      }
    } catch {
      setError("We could not sign you in with those credentials.");
      setLoading(false);
      return;
    }

    window.location.assign(redirectTo);
  }

  return (
    <Card className="w-full max-w-[460px] rounded-[32px] border border-[#D7DDD4] bg-white/98 shadow-[0_28px_90px_rgba(17,17,17,0.12)]">
      <CardHeader className="space-y-5 px-9 pb-3 pt-9">
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#EEF4EA] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#386B45]">
          <Lock className="h-3.5 w-3.5" />
          Private Access
        </div>
        <div>
          <CardTitle className="text-[2rem] font-semibold tracking-tight text-[#2B2B2B]">
            Client Portal
          </CardTitle>
          <CardDescription className="mt-3 max-w-sm text-sm leading-relaxed text-[#59675C]">
            Sign in securely to access your dashboards, reports, and client materials.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-9 pb-9 pt-3">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Email Address"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@clientcompany.com"
            className="h-13 rounded-2xl border-[#D7DDD4] bg-[#F7F8F4]"
          />
          <Input
            label="Password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Enter your password"
            className="h-13 rounded-2xl border-[#D7DDD4] bg-[#F7F8F4]"
          />
          {error ? <p className="text-sm text-[#B04C4C]">{error}</p> : null}
          <Button
            type="submit"
            size="lg"
            disabled={loading}
            className="mt-1 h-13 w-full rounded-2xl bg-[#2B2B2B] text-white shadow-[0_12px_26px_rgba(17,17,17,0.18)] hover:bg-[#386B45]"
          >
            {loading ? "Signing In..." : "Secure Login"}
          </Button>
        </form>

        <div className="mt-7 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-[#59675C]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#D9B85C]" />
          Encrypted portal access
        </div>
      </CardContent>
    </Card>
  );
}
