"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface SupabaseSignOutButtonProps {
  redirectTo?: string;
  label?: string;
  className?: string;
  variant?: "default" | "secondary" | "outline" | "ghost" | "link";
}

export function SupabaseSignOutButton({
  redirectTo = "/login",
  label = "Sign Out",
  className,
  variant = "ghost",
}: SupabaseSignOutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignOut() {
    setIsLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
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
    >
      <LogOut className="h-4 w-4" />
      {isLoading ? "Signing Out..." : label}
    </Button>
  );
}
