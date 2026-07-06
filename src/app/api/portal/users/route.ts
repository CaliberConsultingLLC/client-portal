import { NextRequest, NextResponse } from "next/server";
import {
  getOptionalFirebaseUser,
  isInternalFirebaseRole,
} from "@/lib/firebase/auth";
import { getFirebasePortalClients } from "@/lib/firebase/portal-store";
import {
  getFirebaseUserDoc,
  updateFirebasePortalUser,
} from "@/lib/firebase/user-store";
import {
  CLIENT_SCOPED_FIREBASE_ROLES,
  FIREBASE_PORTAL_ROLES,
  type FirebasePortalRole,
} from "@/lib/firebase/roles";
import {
  sanitizeEmployeeExperienceUserAccess,
  type EmployeeExperienceUserAccess,
} from "@/lib/firebase/user-access";

const PORTAL_ROLES = FIREBASE_PORTAL_ROLES;

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

async function assertPortalInternalAccess() {
  const actor = await getOptionalFirebaseUser();

  if (!actor) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (!isInternalFirebaseRole(actor.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { actor };
}

export async function PATCH(request: NextRequest) {
  try {
    const access = await assertPortalInternalAccess();

    if ("error" in access) {
      return access.error;
    }

    const body = (await request.json()) as {
      uid?: string;
      email?: string;
      fullName?: string;
      password?: string;
      role?: FirebasePortalRole;
      isActive?: boolean;
      clientIds?: string[];
      employeeExperienceAccess?: EmployeeExperienceUserAccess;
    };

    const uid = body.uid?.trim() ?? "";
    const email = body.email?.trim() ?? "";
    const fullName = body.fullName?.trim() ?? "";
    const role = body.role;
    const password = body.password?.trim() ?? "";
    const isActive = body.isActive ?? true;

    if (!uid || !email || !fullName || !role) {
      return badRequest("uid, email, fullName, and role are required.");
    }

    if (!PORTAL_ROLES.includes(role)) {
      return badRequest("Invalid portal role.");
    }

    const existingUser = await getFirebaseUserDoc(uid);

    if (!existingUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const clients = await getFirebasePortalClients();
    const validClientIds = new Set(clients.map((client) => client.id));
    const requestedClientIds = Array.isArray(body.clientIds)
      ? body.clientIds.map((value) => value.trim()).filter(Boolean)
      : [];
    const cleanedClientIds = Array.from(
      new Set(requestedClientIds.filter((clientId) => validClientIds.has(clientId)))
    );

    if (
      CLIENT_SCOPED_FIREBASE_ROLES.has(role) && cleanedClientIds.length === 0
    ) {
      return badRequest("Client-facing users must be assigned to at least one client.");
    }

    const user = await updateFirebasePortalUser({
      uid,
      email,
      fullName,
      role,
      clientIds: CLIENT_SCOPED_FIREBASE_ROLES.has(role) ? cleanedClientIds : [],
      employeeExperienceAccess: sanitizeEmployeeExperienceUserAccess(
        body.employeeExperienceAccess
      ),
      isActive,
      password: password || undefined,
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Failed to update portal user", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update user.",
      },
      { status: 500 }
    );
  }
}
