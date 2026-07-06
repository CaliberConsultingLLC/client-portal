import { NextRequest, NextResponse } from "next/server";
import { getOptionalFirebaseUser } from "@/lib/firebase/auth";
import { canManageClientCensus } from "@/lib/firebase/portal-access";
import { getFirebasePortalClients } from "@/lib/firebase/portal-store";
import { getAccessibleDashboardAssignments } from "@/lib/firebase/portal-access";
import { saveCensusUpload } from "@/lib/firebase/census-store";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getOptionalFirebaseUser();

    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const clientId = String(formData.get("clientId") ?? "").trim();
    const surveyId = String(formData.get("surveyId") ?? "").trim();
    const surveyLabel = String(formData.get("surveyLabel") ?? "").trim();
    const dashboardAssetId = String(formData.get("dashboardAssetId") ?? "").trim();
    const file = formData.get("file") as File | null;

    if (!clientId || !surveyId || !surveyLabel || !dashboardAssetId || !file) {
      return badRequest("Client, survey ID, survey label, dashboard, and census file are required.");
    }

    const clients = await getFirebasePortalClients();
    const client = clients.find((entry) => entry.id === clientId);

    if (!client) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    if (!canManageClientCensus(actor, clientId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const assignments = await getAccessibleDashboardAssignments(actor);
    const dashboardAssignment = assignments.find(
      (assignment) => assignment.clientId === clientId && assignment.assetId === dashboardAssetId
    );

    if (!dashboardAssignment) {
      return badRequest("Choose a dashboard assigned to this client.");
    }

    const fileName = file.name || "census.csv";
    if (!fileName.toLowerCase().endsWith(".csv")) {
      return badRequest("Census upload currently accepts CSV files only.");
    }

    const csvText = await file.text();
    const upload = await saveCensusUpload({
      clientId,
      surveyId,
      surveyLabel,
      dashboardAssetId,
      dashboardTitle: dashboardAssignment.title,
      fileName,
      csvText,
      uploadedByUid: actor.uid,
      uploadedByEmail: actor.email,
    });

    return NextResponse.json({ upload });
  } catch (error) {
    console.error("Failed to upload census", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to upload census.",
      },
      { status: 500 }
    );
  }
}
