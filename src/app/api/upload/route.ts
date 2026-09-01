import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const filename = `${Date.now()}-${safe}`;
  await writeFile(path.join(dir, filename), bytes);
  return NextResponse.json({ url: `/uploads/${filename}` });
}
