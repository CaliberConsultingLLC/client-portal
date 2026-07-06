"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFirebaseAuth } from "@/lib/firebase/client";

interface FirebaseSignOutButtonProps {
  redirectTo?: string;
  label?: string;
  className?: string;
  variant?: "default" | "secondary" | "outline" | "ghost" | "link";
  title?: string;
}

export function FirebaseSignOutButton({
  redirectTo = "/login",
  label = "Sign Out",
  className,
  variant = "ghost",
  title,
}: FirebaseSignOutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignOut() {
    setIsLoading(true);

    await fetch("/api/auth/session", {
      method: "DELETE",
    });
    await signOut(getFirebaseAuth());

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant={variant}
      size="default"
      onClick={handleSignOut}
      disabled={isLoading}
      className={className}
      title={title ?? (label || "Sign out")}
      aria-label={title ?? (label || "Sign out")}
    >
      <LogOut className="h-4 w-4" />
      {isLoading ? "Signing Out..." : label}
    </Button>
  );
}
