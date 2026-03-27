"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function FirebaseBootstrapForm() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError("");
    setSuccess("");
    setLoading(true);

    const formData = new FormData(form);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const fullName = String(formData.get("fullName") || "").trim();
    const role = String(formData.get("role") || "super_admin");
    const clientIds = String(formData.get("clientIds") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    try {
      const response = await fetch("/api/firebase/bootstrap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          fullName,
          role,
          clientIds,
          seedDefaults: true,
        }),
      });

      const payload = (await response.json()) as { error?: string; user?: { email: string } };

      if (!response.ok) {
        throw new Error(payload.error || "Bootstrap failed.");
      }

      setSuccess(`Firebase user created/updated for ${payload.user?.email ?? email}.`);
      form.reset();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Bootstrap failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="rounded-[28px] border-[#D7E0E5] bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-2xl text-[#102533]">Firebase Bootstrap</CardTitle>
        <CardDescription className="text-sm leading-relaxed text-[#60727D]">
          Use this local-only form to seed the default portal collections and create the first
          Firebase-backed portal/admin user.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <Input
            label="Full Name"
            name="fullName"
            placeholder="Your name"
            required
          />
          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
          />
          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="Create a password"
            required
          />
          <Input
            label="Role"
            name="role"
            defaultValue="super_admin"
            placeholder="super_admin"
            required
          />
          <div className="md:col-span-2">
            <Input
              label="Client IDs"
              name="clientIds"
              placeholder="tsi,dws,csg"
            />
          </div>
          {error ? (
            <p className="md:col-span-2 text-sm text-[#B04C4C]">{error}</p>
          ) : null}
          {success ? (
            <p className="md:col-span-2 text-sm text-[#255F47]">{success}</p>
          ) : null}
          <div className="md:col-span-2">
            <Button
              type="submit"
              disabled={loading}
              className="rounded-full bg-[#102F4A] text-white hover:bg-[#0C2740]"
            >
              {loading ? "Creating Firebase User..." : "Seed Collections + Create User"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
