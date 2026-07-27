import { NextRequest, NextResponse } from "next/server";
import { getOptionalFirebaseUser, isInternalFirebaseRole } from "@/lib/firebase/auth";
import {
  getFirebaseReadoutById,
  setFirebaseReadoutClientAvailability,
} from "@/lib/firebase/readout-store";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ readoutId: string }> }
) {
  try {
    const actor = await getOptionalFirebaseUser();
    if (!actor || !isInternalFirebaseRole(actor.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { readoutId } = await params;
    const readout = await getFirebaseReadoutById(readoutId);
    if (!readout) {
      return NextResponse.json({ error: "Readout not found." }, { status: 404 });
    }

    let available = true;
    try {
      const body = (await request.json()) as { available?: boolean };
      if (typeof body.available === "boolean") {
        available = body.available;
      }
    } catch {
      // Empty body → make available (same as publish).
    }

    const updated = await setFirebaseReadoutClientAvailability(readoutId, available);
    return NextResponse.json({ readout: updated });
  } catch (error) {
    console.error("Failed to update readout availability", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update readout availability." },
      { status: 500 }
    );
  }
}
