"use client";

import Link from "next/link";
import { AppTopBanner } from "@/components/shared/app-top-banner";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Services", href: "/services" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function Navbar() {
  return (
    <AppTopBanner eyebrow="People-Centered Consulting" items={navLinks}>
      <Button variant="outline" size="sm" asChild className="rounded-full">
        <Link href="/sign-in">Sign In</Link>
      </Button>
      <Button size="pill" asChild>
        <Link href="/contact">Get Started</Link>
      </Button>
    </AppTopBanner>
  );
}
