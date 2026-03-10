import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { processCollaborationCSV } from "@/lib/collaboration/process-csv";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/collab-campaigns/[id]/upload
 *
 * Accepts multipart form data with two CSV files:
 *   - responses: the main respondent data CSV
 *   - statements: the question/department mapping CSV
 *
 * Processes them and stores the result in the collab_campaigns table.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createServerClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify campaign exists
  const { data: campaign, error: fetchError } = await supabase
    .from("collab_campaigns")
    .select("id, config")
    .eq("id", id)
    .single();

  if (fetchError || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Set status to processing
  await supabase
    .from("collab_campaigns")
    .update({ status: "processing", error_message: null, updated_at: new Date().toISOString() })
    .eq("id", id);

  try {
    // Parse multipart form
    const formData = await request.formData();
    const responsesFile = formData.get("responses") as File | null;
    const statementsFile = formData.get("statements") as File | null;

    if (!responsesFile || !statementsFile) {
      await supabase
        .from("collab_campaigns")
        .update({ status: "error", error_message: "Both responses and statements CSV files are required" })
        .eq("id", id);
      return NextResponse.json(
        { error: "Both responses and statements CSV files are required" },
        { status: 400 }
      );
    }

    // Read file contents
    const responsesCSV = await responsesFile.text();
    const statementsCSV = await statementsFile.text();

    if (!responsesCSV.trim() || !statementsCSV.trim()) {
      await supabase
        .from("collab_campaigns")
        .update({ status: "error", error_message: "One or both CSV files are empty" })
        .eq("id", id);
      return NextResponse.json(
        { error: "One or both CSV files are empty" },
        { status: 400 }
      );
    }

    // Get optional dept normalization config
    const config = (campaign.config as Record<string, unknown>) ?? {};
    const deptNormalize = (config.deptNormalize as Record<string, string>) ?? undefined;

    // Process the data
    const result = processCollaborationCSV(responsesCSV, statementsCSV, {
      deptNormalize,
    });

    // Store processed data
    const { error: updateError } = await supabase
      .from("collab_campaigns")
      .update({
        status: "ready",
        processed_data: result as unknown as Record<string, unknown>,
        respondent_count: result.meta.totalRespondents,
        department_count: result.meta.totalDepartments,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      throw new Error(`Failed to save results: ${updateError.message}`);
    }

    return NextResponse.json({
      success: true,
      summary: {
        respondents: result.meta.totalRespondents,
        departments: result.meta.totalDepartments,
        avgIncoming: result.meta.dwsAverageIncoming,
        avgOutgoing: result.meta.dwsAverageOutgoing,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown processing error";
    await supabase
      .from("collab_campaigns")
      .update({
        status: "error",
        error_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
