import { NextResponse } from "next/server";
import { getOptionalFirebaseUser, isInternalFirebaseRole } from "@/lib/firebase/auth";
import { getFirebaseDashboardInstanceById } from "@/lib/firebase/dashboard-store";
import { loadDwsEEDataMap } from "@/lib/employee-experience/dws-dashboard";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  try {
    const { instanceId } = await params;

    const actor = await getOptionalFirebaseUser();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isInternalFirebaseRole(actor.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const instance = await getFirebaseDashboardInstanceById(instanceId);
    if (!instance) {
      return NextResponse.json({ error: "Dashboard instance not found" }, { status: 404 });
    }

    if (instance.family !== "employee_experience") {
      return NextResponse.json(
        { error: "Data map is only available for Employee Experience dashboards." },
        { status: 400 }
      );
    }

    const sourceClientId = instance.dataSource.sourceClientId ?? undefined;
    const map = await loadDwsEEDataMap(sourceClientId);

    return NextResponse.json({ map, instance: { id: instanceId, title: instance.title } });
  } catch (error) {
    console.error("Failed to build data map", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to build data map." },
      { status: 500 }
    );
  }
}
