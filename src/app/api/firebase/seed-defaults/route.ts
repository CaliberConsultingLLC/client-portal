import { NextResponse } from "next/server";
import { seedDefaultPortalCollections } from "@/lib/firebase/portal-store";

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await seedDefaultPortalCollections();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to seed default Firebase portal collections", error);
    return NextResponse.json(
      { error: "Unable to seed default Firebase collections." },
      { status: 500 }
    );
  }
}
