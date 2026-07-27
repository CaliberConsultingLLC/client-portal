import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getOptionalFirebaseUser, isInternalFirebaseRole } from "@/lib/firebase/auth";
import { getFirebaseAdminStorage } from "@/lib/firebase/admin";
import { getFirebaseReadoutById } from "@/lib/firebase/readout-store";

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

    const form = await request.formData();
    const file = form.get("file");
    const slot = String(form.get("slot") ?? "slot").replace(/[^a-zA-Z0-9_-]/g, "");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }

    const allowed = ["image/png", "image/jpeg", "image/webp", "image/avif"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Drop a PNG, JPEG, WebP, or AVIF image." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const token = randomUUID();
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const storagePath = `clients/${readout.clientId}/readouts/${readoutId}/${slot}-${Date.now()}.${ext}`;
    const bucket = getFirebaseAdminStorage().bucket();

    await bucket.file(storagePath).save(buffer, {
      contentType: file.type,
      metadata: {
        metadata: {
          firebaseStorageDownloadTokens: token,
        },
      },
    });

    const bucketName = bucket.name;
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;

    return NextResponse.json({ url, storagePath });
  } catch (error) {
    console.error("Failed to upload readout image", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to upload image." },
      { status: 500 }
    );
  }
}
