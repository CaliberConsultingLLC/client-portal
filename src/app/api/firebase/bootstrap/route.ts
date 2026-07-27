import { NextRequest, NextResponse } from "next/server";
import {
  createFirebasePortalUser,
} from "@/lib/firebase/user-store";
import { FIREBASE_PORTAL_ROLES, type FirebasePortalRole } from "@/lib/firebase/roles";
import { seedDefaultPortalCollections } from "@/lib/firebase/portal-store";

function assertDevelopmentOnly() {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Not found");
  }
}

const ALLOWED_ROLES = new Set<FirebasePortalRole>(FIREBASE_PORTAL_ROLES);

export async function POST(request: NextRequest) {
  try {
    assertDevelopmentOnly();

    const body = await request.json();
    const {
      email,
      password,
      fullName,
      role = "super_admin",
      clientIds = [],
      seedDefaults = true,
    } = body as {
      email?: string;
      password?: string;
      fullName?: string;
      role?: FirebasePortalRole;
      clientIds?: string[];
      seedDefaults?: boolean;
    };

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "email, password, and fullName are required." },
        { status: 400 }
      );
    }

    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    if (seedDefaults) {
      await seedDefaultPortalCollections();
    }

    const result = await createFirebasePortalUser({
      email,
      password,
      fullName,
      role,
      clientIds,
      mustChangePassword: false,
    });

    return NextResponse.json({
      success: true,
      seededDefaults: seedDefaults,
      user: {
        uid: result.userDoc.uid,
        email: result.userDoc.email,
        fullName: result.userDoc.fullName,
        role: result.userDoc.role,
        clientIds: result.userDoc.clientIds,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    console.error("Firebase bootstrap failed", error);
    return NextResponse.json(
      { error: "Unable to bootstrap Firebase portal setup." },
      { status: 500 }
    );
  }
}
