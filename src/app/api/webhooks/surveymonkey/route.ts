import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // TODO: Validate webhook signature
    // TODO: Handle event types:
    //   - response_completed: fetch full response from SM API, insert to survey_responses
    //   - survey_created, survey_updated: sync survey config
    // TODO: Transform and insert to response_answers
    // TODO: Trigger aggregation update

    console.log("SurveyMonkey webhook received:", payload.event_type);

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function HEAD() {
  // SurveyMonkey sends HEAD to verify webhook URL
  return new NextResponse(null, { status: 200 });
}
