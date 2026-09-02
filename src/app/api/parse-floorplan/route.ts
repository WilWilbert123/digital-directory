import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { parseFloorPlanImage } from "@/lib/floorplan-parser";
import { readFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

export const maxDuration = 60; // Allow more time for AI processing
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN" && session.role !== "MALL_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { imageUrl } = await req.json();
    if (!imageUrl) {
      return NextResponse.json({ error: "Missing imageUrl" }, { status: 400 });
    }

    // Convert the public URL to a local file path
    // e.g. /uploads/12345-map.jpg -> public/uploads/12345-map.jpg
    const cleanUrl = imageUrl.replace(/^\//, "");
    const filePath = path.join(process.cwd(), "public", cleanUrl);

    let imageBuffer: Buffer;
    try {
      imageBuffer = await readFile(filePath);
    } catch (e) {
      return NextResponse.json({ error: "Image file not found on server" }, { status: 404 });
    }

    const base64Image = imageBuffer.toString("base64");

    // Call Gemini Vision to extract regions
    const regions = await parseFloorPlanImage(base64Image);

    // Coordinate Transformation Bridge
    // The parser returns 0-100 percentages.
    // Our 3D grid is a 40x40 plane centered at (0,0), so X and Z go from -20 to 20.
    const blocks = regions.map((region) => {
      const { xPercentage, yPercentage, widthPercentage, heightPercentage } = region.bounds;
      
      const posX = (xPercentage / 100) * 40 - 20;
      const posZ = (yPercentage / 100) * 40 - 20;
      const scaleX = (widthPercentage / 100) * 40;
      const scaleZ = (heightPercentage / 100) * 40;

      return {
        id: crypto.randomUUID(), // Draft ID for the editor
        blockName: region.label || "Generated Block",
        posX: Number(posX.toFixed(2)),
        posY: 0, // Default ground elevation
        posZ: Number(posZ.toFixed(2)),
        scaleX: Math.max(1, Number(scaleX.toFixed(2))), // Minimum size of 1
        scaleY: 2, // Default wall height
        scaleZ: Math.max(1, Number(scaleZ.toFixed(2))),
        tenantId: null,
        shape: region.shape,
      };
    });

    return NextResponse.json({ blocks });
  } catch (error: any) {
    console.error("Floor plan parse error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to parse floor plan" },
      { status: 500 }
    );
  }
}
