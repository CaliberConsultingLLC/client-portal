import { createServerClient } from "./server";
import { redirect } from "next/navigation";
import type { User } from "@/types/database";

const ADMIN_ROLES = new Set(["super_admin", "admin", "analyst", "nsp_admin"]);
const PORTAL_ROLES = new Set([
  "client_admin",
  "executive",
  "management",
  "employee",
  "super_admin",
  "admin",
  "analyst",
]);

async function getCurrentAppUser(): Promise<User | null> {
  const supabase = await createServerClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  return (user as User) || null;
}

/**
 * Get the currently authenticated user from Supabase Auth + our users table.
 * Redirects to sign-in if not authenticated.
 */
export async function requireAdmin(): Promise<User> {
  const user = await getCurrentAppUser();
  if (!user || !ADMIN_ROLES.has(user.role)) {
    redirect("/sign-in");
  }
  return user;
}

/**
 * Get the currently authenticated portal user.
 * Redirects to the portal sign-in page if not authenticated.
 */
export async function requirePortalUser(): Promise<User> {
  const user = await getCurrentAppUser();
  if (!user || !PORTAL_ROLES.has(user.role)) {
    redirect("/login");
  }
  return user;
}

/**
 * Get the current auth user without redirecting. Returns null if not logged in.
 */
export async function getOptionalUser(): Promise<User | null> {
  return getCurrentAppUser();
}
