import { NextRequest, NextResponse } from "next/server";
import { getOptionalFirebaseUser, isInternalFirebaseRole } from "@/lib/firebase/auth";
import { buildCampaignOverviewFavBarsChart } from "@/lib/readout/ee-readout-chart";
import { getFirebaseReadoutById, updateFirebaseReadout } from "@/lib/firebase/readout-store";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ readoutId: string }> }
) {
  try {
    const actor = await getOptionalFirebaseUser();
    if (!actor) {
      return unauthorized();
    }
    if (!isInternalFirebaseRole(actor.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { readoutId } = await params;
    const readout = await getFirebaseReadoutById(readoutId);
    if (!readout) {
      return NextResponse.json({ error: "Readout not found." }, { status: 404 });
    }

    const body = (await request.json()) as { findingId?: string };
    const findingId = body.findingId?.trim() || "overview";
    const findingIndex = readout.findings.findIndex((finding) => finding.id === findingId);

    if (findingIndex < 0) {
      return NextResponse.json({ error: "Finding not found." }, { status: 404 });
    }

    const snapshot = await buildCampaignOverviewFavBarsChart({
      clientId: readout.clientId,
      surveyWaveLabel: readout.surveyWaveLabel,
    });

    const findings = [...readout.findings];
    const existing = findings[findingIndex];
    findings[findingIndex] = {
      ...existing,
      chartType: "favbars",
      chartData: snapshot.chartData,
      chartSub: snapshot.meta.comparisonLabel
        ? `${snapshot.meta.surveyWaveLabel} vs ${snapshot.meta.comparisonLabel}`
        : snapshot.meta.surveyWaveLabel,
    };

    const updatedReadout = await updateFirebaseReadout({
      readoutId,
      findings,
    });

    return NextResponse.json({
      readout: updatedReadout,
      snapshotMeta: snapshot.meta,
    });
  } catch (error) {
    console.error("Failed to sync readout chart", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to sync chart from dashboard." },
      { status: 500 }
    );
  }
}
