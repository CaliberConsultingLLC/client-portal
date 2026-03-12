"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Services", href: "/services" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-nsp-orange-400/30 bg-nsp-blue-900/90 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Logo size="sm" />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-[--radius-md] px-4 py-2 text-sm font-medium text-nsp-orange-100/90 transition-colors duration-[180ms] hover:bg-white/10 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/sign-in">Sign In</Link>
          </Button>
          <Button size="pill" asChild>
            <Link href="/contact">Get Started</Link>
          </Button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="rounded-[--radius-md] p-2 text-nsp-orange-100 transition-colors hover:bg-white/10 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={cn(
          "overflow-hidden border-t border-nsp-orange-400/30 bg-nsp-blue-900 transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] md:hidden",
          mobileOpen ? "max-h-80 pb-6" : "max-h-0"
        )}
      >
        <nav className="flex flex-col gap-1 px-6 pt-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-[--radius-md] px-4 py-3 text-sm font-medium text-nsp-orange-100/90 transition-colors hover:bg-white/10 hover:text-white"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <hr className="my-2 border-nsp-orange-400/30" />
          <Link
            href="/sign-in"
            className="rounded-[--radius-md] px-4 py-3 text-sm font-medium text-nsp-orange-100/90 transition-colors hover:bg-white/10"
            onClick={() => setMobileOpen(false)}
          >
            Sign In
          </Link>
          <Button size="default" className="mt-2" asChild>
            <Link href="/contact">Get Started</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
