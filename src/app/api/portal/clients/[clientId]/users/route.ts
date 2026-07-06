import { NextRequest, NextResponse } from "next/server";
import { getOptionalFirebaseUser } from "@/lib/firebase/auth";
import { canManageClientUsers } from "@/lib/firebase/portal-access";
import {
  type FirebasePortalRole,
  createFirebasePortalUser,
  getFirebaseUserDoc,
  listFirebaseUsersByClientId,
  updateFirebasePortalUser,
} from "@/lib/firebase/user-store";
import { getFirebasePortalClients } from "@/lib/firebase/portal-store";

const CLIENT_MANAGEABLE_ROLES: FirebasePortalRole[] = [
  "client_admin",
  "executive",
  "management",
  "employee",
];

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

async function assertRequestAccess(clientId: string) {
  const actor = await getOptionalFirebaseUser();

  if (!actor) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const clients = await getFirebasePortalClients();
  const client = clients.find((entry) => entry.id === clientId) ?? null;

  if (!client) {
    return { error: NextResponse.json({ error: "Client not found" }, { status: 404 }) };
  }

  if (!canManageClientUsers(actor, clientId)) {
    return { error: forbidden() };
  }

  return { actor, client };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  const access = await assertRequestAccess(clientId);

  if ("error" in access) {
    return access.error;
  }

  const users = await listFirebaseUsersByClientId(clientId);
  return NextResponse.json({ users });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const access = await assertRequestAccess(clientId);

    if ("error" in access) {
      return access.error;
    }

    const body = (await request.json()) as {
      email?: string;
      fullName?: string;
      password?: string;
      role?: FirebasePortalRole;
      isActive?: boolean;
    };

    const email = body.email?.trim() ?? "";
    const fullName = body.fullName?.trim() ?? "";
    const password = body.password ?? "";
    const role = body.role;
    const isActive = body.isActive ?? true;

    if (!email || !fullName || !password || !role) {
      return badRequest("email, fullName, password, and role are required.");
    }

    if (!CLIENT_MANAGEABLE_ROLES.includes(role)) {
      return forbidden("You cannot assign that role from this workspace.");
    }

    const result = await createFirebasePortalUser({
      email,
      fullName,
      password,
      role,
      clientIds: [clientId],
      isActive,
    });

    return NextResponse.json({ user: result.userDoc });
  } catch (error) {
    console.error("Failed to create client user", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create client user.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const access = await assertRequestAccess(clientId);

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

    const existingUser = await getFirebaseUserDoc(uid);

    if (!existingUser || !existingUser.clientIds.includes(clientId)) {
      return NextResponse.json(
        { error: "User not found in this client workspace." },
        { status: 404 }
      );
    }

    if (!CLIENT_MANAGEABLE_ROLES.includes(role)) {
      return forbidden("You cannot assign that role from this workspace.");
    }

    if (!CLIENT_MANAGEABLE_ROLES.includes(existingUser.role)) {
      return forbidden("You cannot modify this user from the client workspace.");
    }

    const user = await updateFirebasePortalUser({
      uid,
      email,
      fullName,
      role,
      clientIds: Array.from(new Set([...existingUser.clientIds, clientId])),
      employeeExperienceAccess: existingUser.employeeExperienceAccess,
      isActive,
      password: password || undefined,
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Failed to update client user", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update client user.",
      },
      { status: 500 }
    );
  }
}
