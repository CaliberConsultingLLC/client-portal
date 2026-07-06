import { NextResponse } from "next/server";
import { getOptionalFirebaseUser, isInternalFirebaseRole } from "@/lib/firebase/auth";
import { getFirebaseReadoutById, publishFirebaseReadout } from "@/lib/firebase/readout-store";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ readoutId: string }> }
) {
  try {
    const actor = await getOptionalFirebaseUser();

    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isInternalFirebaseRole(actor.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { readoutId } = await params;
    const readout = await getFirebaseReadoutById(readoutId);

    if (!readout) {
      return NextResponse.json({ error: "Readout not found." }, { status: 404 });
    }

    const published = await publishFirebaseReadout(readoutId);
    return NextResponse.json({ readout: published });
  } catch (error) {
    console.error("Failed to publish readout", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to publish readout." },
      { status: 500 }
    );
  }
}
