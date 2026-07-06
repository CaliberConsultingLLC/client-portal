import { NextRequest, NextResponse } from "next/server";
import { getDashboardDirectoryEntries } from "@/lib/firebase/dashboard-store";
import { loadDwsEmployeeExperienceDashboardData } from "@/lib/employee-experience/dws-dashboard";

// Phase 3 — "keep the engine warm". This runs on a schedule to (a) keep a
// serverless instance hot so clients never hit a cold 20-30s spin-up, and
// (b) refresh the durable EE dashboard cache so the first real visit after a
// data change is already fast.
export const runtime = "nodejs";
export const maxDuration = 60;

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return req.headers.get("x-vercel-cron") === "1";
  }
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}` || req.headers.get("x-vercel-cron") === "1";
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const { instances } = await getDashboardDirectoryEntries();

  const targets = instances.filter(
    (instance) =>
      instance.family === "employee_experience" &&
      instance.dataSource?.kind !== "synthetic_demo" &&
      Boolean(instance.dataSource?.sourceClientId?.trim())
  );

  // De-dupe on the exact cache key (source client + hidden dimensions).
  const seen = new Set<string>();
  const results: Array<{
    instanceId: string;
    sourceClientId: string;
    ok: boolean;
    ms?: number;
    error?: string;
  }> = [];

  for (const instance of targets) {
    const sourceClientId = instance.dataSource!.sourceClientId!.trim();
    const hiddenDimensionIds = instance.settings?.hiddenDimensionIds ?? [];
    const key = `${sourceClientId}::${[...hiddenDimensionIds].sort().join(",")}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    const begin = Date.now();
    try {
      await loadDwsEmployeeExperienceDashboardData({ sourceClientId, hiddenDimensionIds });
      results.push({
        instanceId: instance.id,
        sourceClientId,
        ok: true,
        ms: Date.now() - begin,
      });
    } catch (error) {
      results.push({
        instanceId: instance.id,
        sourceClientId,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    warmedCount: results.filter((entry) => entry.ok).length,
    targetCount: results.length,
    totalMs: Date.now() - startedAt,
    results,
  });
}
