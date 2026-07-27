import { NextResponse } from "next/server";
import { getOptionalFirebaseUser, getActualRole, isInternalFirebaseRole } from "@/lib/firebase/auth";
import { clearFirebaseUserMustChangePassword } from "@/lib/firebase/user-store";

/**
 * Clears the mustChangePassword flag after the signed-in user successfully
 * updates their Firebase Auth password on the client.
 */
export async function POST() {
  try {
    const user = await getOptionalFirebaseUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Never clear the flag while previewing as another user.
    if (user.viewingAsUserUid && isInternalFirebaseRole(getActualRole(user))) {
      return NextResponse.json(
        { error: "Cannot change password while previewing as another user." },
        { status: 403 }
      );
    }

    await clearFirebaseUserMustChangePassword(user.uid);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to clear mustChangePassword flag", error);
    return NextResponse.json(
      { error: "Unable to update password status." },
      { status: 500 }
    );
  }
}
