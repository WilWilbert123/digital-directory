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
    // The parser returns 0.0-1.0 normalized coordinates.
    // Our 3D grid is a 40x40 plane centered at (0,0), so X and Z go from -20 to 20.
    const blocks = regions.map((region: any) => {
      let x = 0.5, y = 0.5, w = 0.1, h = 0.1;
      let finalShape = "BOX";

      try {
        if (region.shape_type === "circle" && region.center && region.radius) {
          x = region.center[0];
          y = region.center[1];
          w = region.radius * 2;
          h = region.radius * 2;
          finalShape = "CYLINDER";
        } else if (region.shape_type === "rounded_rect" && region.bounds) {
          x = region.bounds[0] + region.bounds[2] / 2;
          y = region.bounds[1] + region.bounds[3] / 2;
          w = region.bounds[2];
          h = region.bounds[3];
        } else if (region.shape_type === "polygon" && region.points && region.points.length > 0) {
          let minX = 1, maxX = 0, minY = 1, maxY = 0;
          for (const [px, py] of region.points) {
            if (px < minX) minX = px;
            if (px > maxX) maxX = px;
            if (py < minY) minY = py;
            if (py > maxY) maxY = py;
          }
          w = maxX - minX;
          h = maxY - minY;
          x = minX + w / 2;
          y = minY + h / 2;
        } else if (region.centroid) {
          // Fallback to centroid if specific shape data is missing or it's a compound
          x = region.centroid[0];
          y = region.centroid[1];
          w = 0.1; // Default fallback size
          h = 0.1;
          if (region.outer_shape?.type === "circle" && region.outer_shape.radius) {
             w = region.outer_shape.radius * 2;
             h = region.outer_shape.radius * 2;
             finalShape = "CYLINDER";
          }
        }
      } catch (e) {
        console.warn("Failed to parse geometry for region", region);
      }

      const posX = x * 40 - 20;
      const posZ = y * 40 - 20;
      const scaleX = w * 40;
      const scaleZ = h * 40;

      return {
        id: crypto.randomUUID(),
        blockName: region.name || region.id || "Generated Block",
        posX: Number(posX.toFixed(2)),
        posY: 0,
        posZ: Number(posZ.toFixed(2)),
        scaleX: Math.max(0.5, Number(scaleX.toFixed(2))),
        scaleY: 2,
        scaleZ: Math.max(0.5, Number(scaleZ.toFixed(2))),
        tenantId: null,
        shape: finalShape,
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
