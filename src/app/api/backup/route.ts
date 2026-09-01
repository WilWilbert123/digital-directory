import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { KIOSK_ID } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snapshot = {
    generatedAt: new Date().toISOString(),
    floors: await prisma.floor.findMany(),
    categories: await prisma.category.findMany(),
    tenants: await prisma.tenant.findMany(),
    pathNodes: await prisma.pathNode.findMany(),
    pathEdges: await prisma.pathEdge.findMany(),
    floorBlocks: await prisma.floorBlock.findMany(),
    users: (await prisma.user.findMany()).map(({ password: _p, ...u }) => u),
  };

  const dir = path.join(process.cwd(), "data", "backups");
  await mkdir(dir, { recursive: true });
  const file = `bispos-${Date.now()}.json`;
  await writeFile(path.join(dir, file), JSON.stringify(snapshot, null, 2), "utf8");

  await prisma.syncLog.create({
    data: {
      sourceKioskId: KIOSK_ID,
      tableName: "BACKUP",
      operationType: "SNAPSHOT",
      payloadJson: JSON.stringify({ file, tables: Object.keys(snapshot) }),
      syncStatus: "SUCCESS",
      syncedToMssqlAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, file });
}
