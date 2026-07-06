import { NextRequest, NextResponse } from "next/server";
import { getOptionalFirebaseUser } from "@/lib/firebase/auth";
import { getFirebaseDashboardInstanceById } from "@/lib/firebase/dashboard-store";
import {
  getDashboardGuidanceScope,
  saveDashboardGuidanceScope,
} from "@/lib/firebase/guidance-pin-store";
import type { DashboardGuidancePin, GuidancePinAccent } from "@/types/guidance-pins";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function normalizeAccent(value: unknown): GuidancePinAccent | null {
  if (value === "blue" || value === "red" || value === "green") {
    return value;
  }
  return null;
}

function normalizePins(value: unknown): DashboardGuidancePin[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const pins: DashboardGuidancePin[] = [];

  for (const [index, entry] of value.entries()) {
    if (!entry || typeof entry !== "object") {
      return null;
    }
    const record = entry as Record<string, unknown>;
    const title = typeof record.title === "string" ? record.title.trim() : "";
    const body = typeof record.body === "string" ? record.body : "";
    const accent = normalizeAccent(record.accent);
    const id = typeof record.id === "string" && record.id.trim() ? record.id.trim() : `pin-${index + 1}`;

    if (!title || !accent) {
      return null;
    }

    pins.push({
      id,
      title,
      body,
      accent,
      order: index,
    });
  }

  return pins;
}

async function assertScopeAccess(instanceId: string) {
  const actor = await getOptionalFirebaseUser();

  if (!actor) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const instance = await getFirebaseDashboardInstanceById(instanceId);

  if (!instance) {
    return { error: NextResponse.json({ error: "Dashboard instance not found" }, { status: 404 }) };
  }

  return { actor, instance };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  try {
    const { instanceId } = await params;
    const access = await assertScopeAccess(instanceId);

    if ("error" in access) {
      return access.error;
    }

    const perspectiveId = request.nextUrl.searchParams.get("perspectiveId")?.trim();
    const campaignLabel = request.nextUrl.searchParams.get("campaignLabel")?.trim();
    const filterKey = request.nextUrl.searchParams.get("filterKey")?.trim() ?? "";

    if (!perspectiveId || !campaignLabel) {
      return badRequest("perspectiveId and campaignLabel are required.");
    }

    const scope = await getDashboardGuidanceScope(
      instanceId,
      perspectiveId,
      campaignLabel,
      filterKey
    );

    return NextResponse.json({
      scope: scope ?? {
        pins: [],
        dashboardInstanceId: instanceId,
        perspectiveId,
        campaignLabel,
        filterKey,
      },
    });
  } catch (error) {
    console.error("Failed to load guidance pins:", error);
    return NextResponse.json({ error: "Failed to load guidance pins." }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  try {
    const { instanceId } = await params;
    const access = await assertScopeAccess(instanceId);

    if ("error" in access) {
      return access.error;
    }

    if (access.actor.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      perspectiveId?: string;
      campaignLabel?: string;
      filterKey?: string;
      pins?: unknown;
    };

    const perspectiveId = body.perspectiveId?.trim();
    const campaignLabel = body.campaignLabel?.trim();
    const filterKey = body.filterKey?.trim() ?? "";
    const pins = normalizePins(body.pins);

    if (!perspectiveId || !campaignLabel || !pins) {
      return badRequest("perspectiveId, campaignLabel, and pins are required.");
    }

    const scope = await saveDashboardGuidanceScope({
      dashboardInstanceId: instanceId,
      perspectiveId,
      campaignLabel,
      filterKey,
      pins,
      updatedBy: access.actor.uid,
    });

    return NextResponse.json({ scope });
  } catch (error) {
    console.error("Failed to save guidance pins:", error);
    return NextResponse.json({ error: "Failed to save guidance pins." }, { status: 500 });
  }
}
