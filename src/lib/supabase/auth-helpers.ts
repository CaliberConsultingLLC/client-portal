import { createServerClient } from "./server";
import { redirect } from "next/navigation";
import type { User } from "@/types/database";

/**
 * Get the currently authenticated user from Supabase Auth + our users table.
 * Redirects to sign-in if not authenticated.
 */
export async function requireAdmin(): Promise<User> {
  const supabase = await createServerClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/sign-in");
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("auth_id", authUser.id)
    .single();

  if (error || !user || user.role !== "nsp_admin") {
    redirect("/sign-in");
  }

  return user as User;
}

/**
 * Get the currently authenticated portal user.
 * Redirects to magic-link page if not authenticated.
 */
export async function requirePortalUser(): Promise<User> {
  const supabase = await createServerClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/magic-link?expired=true");
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("auth_id", authUser.id)
    .single();

  if (error || !user) {
    redirect("/magic-link?expired=true");
  }

  return user as User;
}

/**
 * Get the current auth user without redirecting. Returns null if not logged in.
 */
export async function getOptionalUser(): Promise<User | null> {
  const supabase = await createServerClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("auth_id", authUser.id)
    .single();

  return (user as User) || null;
}
