import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface ContactPayload {
  firstName: string;
  lastName: string;
  email: string;
  organization?: string;
  message: string;
  website?: string; // Honeypot
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ContactPayload;
    const firstName = body.firstName?.trim();
    const lastName = body.lastName?.trim();
    const email = body.email?.trim().toLowerCase();
    const organization = body.organization?.trim() || null;
    const message = body.message?.trim();
    const website = body.website?.trim();

    if (website) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (!firstName || !lastName || !email || !message) {
      return NextResponse.json(
        { error: "Please fill out all required fields." },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    const submittedAt = new Date().toISOString();
    const fullName = `${firstName} ${lastName}`;

    // Best-effort persistence. If this table is not provisioned yet,
    // we still accept the request and preserve continuity for the user.
    try {
      const supabase = createAdminClient();
      await supabase.from("contact_inquiries").insert({
        full_name: fullName,
        email,
        organization,
        message,
        submitted_at: submittedAt,
      });
    } catch {
      // Intentionally ignore persistence failures for now.
    }

    return NextResponse.json(
      {
        ok: true,
        submittedAt,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to submit form right now. Please try again shortly." },
      { status: 500 }
    );
  }
}
