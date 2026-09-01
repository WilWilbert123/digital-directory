import { NextRequest, NextResponse } from "next/server";
import { generateWordBuffer } from "@/lib/report-generators/word-generator";
import { buildReportPayload } from "@/lib/report-generators/build-payload";
import type { ReportKind } from "@/lib/report-generators/types";
import { getSession } from "@/lib/auth";
import { fileResponse } from "@/lib/file-response";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const kind = (req.nextUrl.searchParams.get("kind") ?? "tenants") as ReportKind;
  const payload = await buildReportPayload(kind);
  const buffer = await generateWordBuffer(payload);
  return fileResponse(
    new Uint8Array(buffer),
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    `bispos-${kind}.docx`,
  );
}
