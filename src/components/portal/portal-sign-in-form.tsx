"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const router = useRouter();
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

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <Card className="w-full max-w-[430px] rounded-[28px] border-0 bg-white/96 shadow-[0_24px_70px_rgba(24,36,46,0.14)]">
      <CardHeader className="space-y-4 px-8 pb-3 pt-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4E2A2]/40 text-[#344954]">
          <Lock className="h-5 w-5" />
        </div>
        <div>
          <CardTitle className="text-3xl font-semibold tracking-tight text-[#102533]">
            Client Portal
          </CardTitle>
          <CardDescription className="mt-2 max-w-sm text-sm leading-relaxed text-[#5B7280]">
            Sign in securely to access your dashboards, reports, and client materials.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-8 pb-8 pt-2">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@clientcompany.com"
            className="h-12 rounded-2xl border-[#C8D2D8] bg-[#F8FAFB]"
          />
          <Input
            label="Password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Enter your password"
            className="h-12 rounded-2xl border-[#C8D2D8] bg-[#F8FAFB]"
          />
          {error ? <p className="text-sm text-[#B04C4C]">{error}</p> : null}
          <Button
            type="submit"
            size="lg"
            disabled={loading}
            className="mt-2 h-12 w-full rounded-2xl bg-[#102F4A] text-white hover:bg-[#0C2740]"
          >
            {loading ? "Signing In..." : "Secure Login"}
          </Button>
        </form>

        <div className="mt-6 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-[#5B7280]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#D9B85C]" />
          Encrypted portal access
        </div>
      </CardContent>
    </Card>
  );
}
