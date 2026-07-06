import { NextRequest, NextResponse } from "next/server";
import { getOptionalFirebaseUser } from "@/lib/firebase/auth";
import {
  getCensusUploadById,
  readRawCensusFile,
} from "@/lib/firebase/census-store";
import { canManageClientCensus } from "@/lib/firebase/portal-access";

interface CensusDownloadRouteContext {
  params: Promise<{
    uploadId: string;
  }>;
}

function safeDownloadName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-") || "census.csv";
}

export async function GET(_request: NextRequest, { params }: CensusDownloadRouteContext) {
  try {
    const actor = await getOptionalFirebaseUser();

    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { uploadId } = await params;
    const upload = await getCensusUploadById(uploadId);

    if (!upload) {
      return NextResponse.json({ error: "Census upload not found." }, { status: 404 });
    }

    if (!canManageClientCensus(actor, upload.clientId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rawFile = await readRawCensusFile(upload);
    const body = rawFile.buffer.slice(
      rawFile.byteOffset,
      rawFile.byteOffset + rawFile.byteLength
    ) as ArrayBuffer;

    return new NextResponse(body, {
      headers: {
        "Content-Disposition": `attachment; filename="${safeDownloadName(upload.fileName)}"`,
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Failed to download census", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to download census.",
      },
      { status: 500 }
    );
  }
}
