import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getFirebaseAdminAuth } from "./admin";
import { getFirebaseUserDoc } from "./user-store";
import {
  sanitizeEmployeeExperienceUserAccess,
  type EmployeeExperienceUserAccess,
} from "./user-access";

export const FIREBASE_SESSION_COOKIE_NAME = "firebase_session";
// Set to a user uid when the super admin is previewing the portal as that user.
export const PORTAL_VIEW_AS_COOKIE_NAME = "portal_view_as";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 5;

export interface FirebaseAppUser {
  uid: string;
  email: string | null;
  fullName: string | null;
  role: string;
  clientIds: string[];
  isActive: boolean;
  /** Present only while a super admin is previewing as a client; holds their real role. */
  actualRole?: string;
  /** The clientId being previewed, when in "view as client" mode. */
  viewingAsClientId?: string | null;
  /** The user uid being previewed, when in "view as user" mode. */
  viewingAsUserUid?: string | null;
  employeeExperienceAccess: EmployeeExperienceUserAccess;
}

export function getFirebaseSessionDurationMs() {
  return SESSION_DURATION_MS;
}

export function isInternalFirebaseRole(role: string) {
  return role === "super_admin" || role === "internal_admin";
}

/** The real role of the user, ignoring any active "view as client" preview. */
export function getActualRole(user: FirebaseAppUser) {
  return user.actualRole ?? user.role;
}

export function isSuperAdmin(user: FirebaseAppUser) {
  return getActualRole(user) === "super_admin";
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
    employeeExperienceAccess: sanitizeEmployeeExperienceUserAccess(
      userData.employeeExperienceAccess
    ),
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
    const user = await mapFirebaseUser({ uid: decoded.uid, email: decoded.email });

    if (!user) {
      return null;
    }

    const viewAsUserUid = cookieStore.get(PORTAL_VIEW_AS_COOKIE_NAME)?.value;
    if (viewAsUserUid && user.role === "super_admin") {
      const previewUserDoc = await getFirebaseUserDoc(viewAsUserUid);
      if (!previewUserDoc || !previewUserDoc.isActive) {
        return user;
      }
      return {
        uid: previewUserDoc.uid,
        email: previewUserDoc.email,
        fullName: previewUserDoc.fullName ?? null,
        role: previewUserDoc.role,
        clientIds: previewUserDoc.clientIds ?? [],
        employeeExperienceAccess: sanitizeEmployeeExperienceUserAccess(
          previewUserDoc.employeeExperienceAccess
        ),
        isActive: previewUserDoc.isActive,
        actualRole: user.role,
        viewingAsClientId: null,
        viewingAsUserUid: previewUserDoc.uid,
      } satisfies FirebaseAppUser;
    }

    return user;
  } catch {
    return null;
  }
}

export async function requireFirebasePortalUser() {
  const user = await getOptionalFirebaseUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
