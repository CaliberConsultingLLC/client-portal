import { NextRequest, NextResponse } from "next/server";
import { getOptionalFirebaseUser, isInternalFirebaseRole } from "@/lib/firebase/auth";
import {
  getFirebaseDashboardInstanceById,
  updateFirebaseDashboardInstance,
} from "@/lib/firebase/dashboard-store";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function normalizeHiddenDimensionIds(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    return null;
  }

  return Array.from(
    new Set(
      value
        .map((entry) => (typeof entry === "string" ? entry.trim().toLowerCase() : ""))
        .filter(Boolean)
    )
  );
}

async function assertInternalPortalAccess(instanceId: string) {
  const actor = await getOptionalFirebaseUser();

  if (!actor) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (!isInternalFirebaseRole(actor.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const instance = await getFirebaseDashboardInstanceById(instanceId);

  if (!instance) {
    return { error: NextResponse.json({ error: "Dashboard instance not found" }, { status: 404 }) };
  }

  return { actor, instance };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  try {
    const { instanceId } = await params;
    const access = await assertInternalPortalAccess(instanceId);

    if ("error" in access) {
      return access.error;
    }

    const body = (await request.json()) as {
      title?: string;
      description?: string;
      family?: "collaboration" | "integration" | "employee_experience";
      previewHref?: string | null;
      internalNotes?: string | null;
      status?: "active" | "inactive" | "draft";
      visibilityThreshold?: number | string | null;
      hiddenDimensionIds?: unknown;
      redesignEnabled?: unknown;
      dataSourceLabel?: string;
      dataSourceKind?: "synthetic_demo" | "firebase_csv_workspace" | "manual";
      dataSourceSourceClientId?: string | null;
      dataSourceNotes?: string | null;
      dataMappingStatus?: "draft" | "validated" | "error";
      dataMappingFieldMappings?: Record<string, string>;
      dataMappingNotes?: string | null;
    };

    const nextTitle = body.title?.trim();
    if (body.title !== undefined && !nextTitle) {
      return badRequest("Dashboard title is required.");
    }

    const nextDescription = body.description?.trim();
    if (body.description !== undefined && !nextDescription) {
      return badRequest("Dashboard description is required.");
    }

    if (
      body.family !== undefined &&
      body.family !== "collaboration" &&
      body.family !== "integration" &&
      body.family !== "employee_experience"
    ) {
      return badRequest("Invalid dashboard family.");
    }

    if (
      body.status !== undefined &&
      body.status !== "active" &&
      body.status !== "inactive" &&
      body.status !== "draft"
    ) {
      return badRequest("Invalid status.");
    }

    if (
      body.dataSourceKind !== undefined &&
      body.dataSourceKind !== "synthetic_demo" &&
      body.dataSourceKind !== "firebase_csv_workspace" &&
      body.dataSourceKind !== "manual"
    ) {
      return badRequest("Invalid data source kind.");
    }

    const nextDataSourceLabel = body.dataSourceLabel?.trim();
    if (body.dataSourceLabel !== undefined && !nextDataSourceLabel) {
      return badRequest("Data source label is required.");
    }

    if (
      body.dataMappingStatus !== undefined &&
      body.dataMappingStatus !== "draft" &&
      body.dataMappingStatus !== "validated" &&
      body.dataMappingStatus !== "error"
    ) {
      return badRequest("Invalid data mapping status.");
    }

    if (
      body.dataMappingFieldMappings !== undefined &&
      (typeof body.dataMappingFieldMappings !== "object" || Array.isArray(body.dataMappingFieldMappings))
    ) {
      return badRequest("Field mappings must be an object keyed by canonical field name.");
    }

    const visibilityThreshold =
      body.visibilityThreshold === null ||
      body.visibilityThreshold === undefined ||
      body.visibilityThreshold === ""
        ? null
        : Number(body.visibilityThreshold);

    if (
      visibilityThreshold !== null &&
      (!Number.isFinite(visibilityThreshold) || visibilityThreshold < 0)
    ) {
      return badRequest("Visibility threshold must be a positive number.");
    }

    const hiddenDimensionIds = normalizeHiddenDimensionIds(body.hiddenDimensionIds);
    if (hiddenDimensionIds === null) {
      return badRequest("Hidden indexes must be provided as a list.");
    }

    if (body.redesignEnabled !== undefined && typeof body.redesignEnabled !== "boolean") {
      return badRequest("Layout version migration marker must be a boolean.");
    }

    const instance = await updateFirebaseDashboardInstance({
      instanceId,
      ...(body.title !== undefined ? { title: nextTitle } : {}),
      ...(body.description !== undefined ? { description: nextDescription } : {}),
      ...(body.family !== undefined ? { family: body.family } : {}),
      ...(body.previewHref !== undefined ? { previewHref: body.previewHref?.trim() || null } : {}),
      ...(body.internalNotes !== undefined ? { internalNotes: body.internalNotes?.trim() || null } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.visibilityThreshold !== undefined ? { visibilityThreshold } : {}),
      ...(body.hiddenDimensionIds !== undefined ? { hiddenDimensionIds } : {}),
      ...(body.redesignEnabled !== undefined
        ? { redesignEnabled: body.redesignEnabled as boolean }
        : {}),
      ...(body.dataSourceLabel !== undefined ? { dataSourceLabel: nextDataSourceLabel } : {}),
      ...(body.dataSourceKind !== undefined ? { dataSourceKind: body.dataSourceKind } : {}),
      ...(body.dataSourceSourceClientId !== undefined
        ? { dataSourceSourceClientId: body.dataSourceSourceClientId?.trim() || null }
        : {}),
      ...(body.dataSourceNotes !== undefined
        ? { dataSourceNotes: body.dataSourceNotes?.trim() || null }
        : {}),
      ...(body.dataMappingStatus !== undefined ? { dataMappingStatus: body.dataMappingStatus } : {}),
      ...(body.dataMappingFieldMappings !== undefined
        ? {
            dataMappingFieldMappings: Object.fromEntries(
              Object.entries(body.dataMappingFieldMappings).map(([key, value]) => [
                key,
                typeof value === "string" ? value.trim() : "",
              ])
            ),
          }
        : {}),
      ...(body.dataMappingNotes !== undefined
        ? { dataMappingNotes: body.dataMappingNotes?.trim() || null }
        : {}),
    });

    return NextResponse.json({ instance });
  } catch (error) {
    console.error("Failed to update dashboard instance", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update dashboard instance.",
      },
      { status: 500 }
    );
  }
}
