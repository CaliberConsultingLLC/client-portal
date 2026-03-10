"use client";

import { Suspense, useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/admin";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-nsp-blue-50">
          <Lock className="h-5 w-5 text-nsp-blue-500" />
        </div>
        <CardTitle>Admin Sign In</CardTitle>
        <CardDescription>
          Sign in to access the North Star Partners admin dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="you@northstarpartners.org"
            required
            autoComplete="email"
          />
          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="Enter your password"
            required
            autoComplete="current-password"
          />
          {error && (
            <p className="text-sm text-nsp-red-400">{error}</p>
          )}
          <Button type="submit" size="default" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
