import { NextRequest, NextResponse } from "next/server";
import { getOptionalFirebaseUser, isInternalFirebaseRole } from "@/lib/firebase/auth";
import {
  deleteFirebaseReadout,
  getFirebaseReadoutById,
  updateFirebaseReadout,
} from "@/lib/firebase/readout-store";
import type { ReadoutFinding, ReadoutIntro, ReadoutOutro, ReadoutStatus } from "@/types/readout";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

async function getReadoutAccess(readoutId: string) {
  const actor = await getOptionalFirebaseUser();

  if (!actor) {
    return { error: unauthorized() };
  }

  const readout = await getFirebaseReadoutById(readoutId);

  if (!readout) {
    return { error: NextResponse.json({ error: "Readout not found." }, { status: 404 }) };
  }

  const isInternal = isInternalFirebaseRole(actor.role);
  const canAccessClient = actor.clientIds.includes(readout.clientId);

  if (!isInternal && !canAccessClient) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { actor, readout };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ readoutId: string }> }
) {
  const { readoutId } = await params;
  const access = await getReadoutAccess(readoutId);

  if ("error" in access) {
    return access.error;
  }

  if (!isInternalFirebaseRole(access.actor.role) && access.readout.status !== "published") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({ readout: access.readout });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ readoutId: string }> }
) {
  try {
    const { readoutId } = await params;
    const access = await getReadoutAccess(readoutId);

    if ("error" in access) {
      return access.error;
    }

    if (!isInternalFirebaseRole(access.actor.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      campaignId?: string | null;
      surveyWaveLabel?: string | null;
      name?: string;
      status?: ReadoutStatus;
      intro?: Partial<ReadoutIntro>;
      findings?: ReadoutFinding[];
      outro?: Partial<ReadoutOutro>;
    };

    const readout = await updateFirebaseReadout({
      readoutId,
      ...(body.campaignId !== undefined ? { campaignId: body.campaignId } : {}),
      ...(body.surveyWaveLabel !== undefined ? { surveyWaveLabel: body.surveyWaveLabel } : {}),
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.intro !== undefined ? { intro: body.intro } : {}),
      ...(body.findings !== undefined ? { findings: body.findings } : {}),
      ...(body.outro !== undefined ? { outro: body.outro } : {}),
    });

    return NextResponse.json({ readout });
  } catch (error) {
    console.error("Failed to update readout", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update readout." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ readoutId: string }> }
) {
  try {
    const { readoutId } = await params;
    const access = await getReadoutAccess(readoutId);

    if ("error" in access) {
      return access.error;
    }

    if (!isInternalFirebaseRole(access.actor.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteFirebaseReadout(readoutId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete readout", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete readout." },
      { status: 500 }
    );
  }
}
