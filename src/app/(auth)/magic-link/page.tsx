"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingScreen } from "@/components/shared/loading-screen";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function MagicLinkContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const expired = searchParams.get("expired");

  const [status, setStatus] = useState<"verifying" | "success" | "error" | "request">(
    token ? "verifying" : "request"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [email, setEmail] = useState("");
  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => {
    if (!token) return;

    async function verify() {
      try {
        const res = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          const data = await res.json();
          setErrorMessage(data.error || "This link is invalid or has expired.");
          setStatus("error");
          return;
        }

        setStatus("success");
        setTimeout(() => router.push("/portal"), 1500);
      } catch {
        setErrorMessage("Something went wrong. Please try again.");
        setStatus("error");
      }
    }

    verify();
  }, [token, router]);

  if (status === "verifying") {
    return <LoadingScreen />;
  }

  if (status === "success") {
    return (
      <Card className="w-full max-w-sm text-center">
        <CardContent className="pt-8 pb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-nsp-green-100">
            <CheckCircle2 className="h-7 w-7 text-nsp-green-300" />
          </div>
          <h2 className="text-lg font-bold text-text-primary">
            You&apos;re in
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Redirecting to your portal...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card className="w-full max-w-sm text-center">
        <CardContent className="pt-8 pb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-nsp-red-100">
            <AlertCircle className="h-7 w-7 text-nsp-red-300" />
          </div>
          <h2 className="text-lg font-bold text-text-primary">
            Link expired or invalid
          </h2>
          <p className="mt-2 text-sm text-text-secondary">{errorMessage}</p>
          <Button
            variant="outline"
            size="default"
            className="mt-6"
            onClick={() => setStatus("request")}
          >
            Request a new link
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle>
          {expired ? "Session expired" : "Access your portal"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {requestSent ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-nsp-green-300" />
            <p className="text-sm text-text-secondary">
              If your email is associated with a client account, you&apos;ll
              receive an access link shortly. Check your inbox.
            </p>
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setRequestSent(true);
            }}
            className="flex flex-col gap-4"
          >
            <p className="text-sm text-text-secondary">
              Enter your email and we&apos;ll send you a secure access link.
            </p>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
            <Button type="submit">Send Access Link</Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function MagicLinkPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <MagicLinkContent />
    </Suspense>
  );
}
