import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getFirebaseAdminAuth } from "./admin";
import { getFirebaseUserDoc } from "./user-store";

export const FIREBASE_SESSION_COOKIE_NAME = "firebase_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 5;

export interface FirebaseAppUser {
  uid: string;
  email: string | null;
  fullName: string | null;
  role: string;
  clientIds: string[];
  isActive: boolean;
}

export function getFirebaseSessionDurationMs() {
  return SESSION_DURATION_MS;
}

export function isInternalFirebaseRole(role: string) {
  return role === "super_admin" || role === "internal_admin";
}

async function mapFirebaseUser(decodedToken: { uid: string; email?: string | null }) {
  const userData = await getFirebaseUserDoc(decodedToken.uid);

  if (!userData || !userData.isActive) {
    return null;
  }

  return {
    uid: decodedToken.uid,
    email: decodedToken.email ?? null,
    fullName: userData.fullName ?? null,
    role: userData.role,
    clientIds: userData.clientIds ?? [],
    isActive: userData.isActive,
  } satisfies FirebaseAppUser;
}

export async function getOptionalFirebaseUser(): Promise<FirebaseAppUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(FIREBASE_SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    const decoded = await getFirebaseAdminAuth().verifySessionCookie(sessionCookie, true);
    return mapFirebaseUser({ uid: decoded.uid, email: decoded.email });
  } catch {
    return null;
  }
}

export async function requireFirebasePortalUser() {
  const user = await getOptionalFirebaseUser();

  if (!user) {
    redirect("/portal-login");
  }

  return user;
}
