import { GoogleGenAI, Type } from "@google/genai";
import { createCanvas, loadImage } from "canvas";

export interface Point2D {
  x: number;
  y: number;
}

export interface Extruded3DBlock {
  id: string;
  name: string;
  zone: string;
  shape_type: "polygon" | "circle" | "capsule";
  color: string;
  centroid: Point2D;
  points: Point2D[];
  isObstacle: boolean;
}

// 1. Core API Caller with Exponential Backoff Retry Logic
async function callGeminiWithRetry<T>(fn: () => Promise<T>, retries = 2, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRetryable =
      error?.status === 503 ||
      error?.status === 429 ||
      error?.message?.includes("429") ||
      error?.message?.includes("503") ||
      error?.message?.includes("RESOURCE_EXHAUSTED");

    if (retries > 0 && isRetryable) {
      console.warn(`[FloorPlanParser] Model rate-limited/throttled. Retrying in ${delay}ms...`);
      await new Promise((res) => setTimeout(res, delay));
      return callGeminiWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

// 2. High-Precision Canvas Pixel Sampling for 100% Matching Map Colors
async function sampleExactColorFromImage(
  imageBuffer: Buffer,
  normalizedX: number,
  normalizedY: number
): Promise<string> {
  try {
    const img = await loadImage(imageBuffer);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const px = Math.min(Math.max(Math.floor(normalizedX * img.width), 0), img.width - 1);
    const py = Math.min(Math.max(Math.floor(normalizedY * img.height), 0), img.height - 1);

    const pixel = ctx.getImageData(px, py, 1, 1).data;
    const r = pixel[0].toString(16).padStart(2, "0");
    const g = pixel[1].toString(16).padStart(2, "0");
    const b = pixel[2].toString(16).padStart(2, "0");

    return `#${r}${g}${b}`.toUpperCase();
  } catch (err) {
    console.warn("[FloorPlanParser] Canvas sampling fallback triggered:", err);
    return "#808080";
  }
}

// 3. Main Floor Plan Parser Engine
export async function parseFloorPlanImage(base64Image: string): Promise<Extruded3DBlock[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const rawImageBuffer = Buffer.from(base64Image.replace(/^data:image\/\w+;base64,/, ""), "base64");

  const promptText = `You are an expert Architectural Vectorizer. Analyze the floor plan image and generate precise normalized boundary coordinates.

### CRITICAL SHAPE & GEOMETRY DIRECTIVES:
1. MAP BOUNDS: Normalized spatial plane [0.0, 0.0] (Top-Left) to [1.0, 1.0] (Bottom-Right).
2. FLAT HORIZONTAL RECTANGLES (UNITS 04 & 07):
   - Units 04 and 07 on the left vertical stack MUST be flat horizontal rectangles. Do NOT add triangular or pointed arrow ends.
3. CENTRAL DIAMOND WALKWAY (UNITS 33, 34, 38, 39):
   - Unit 33: Standard rectangle with ONLY its bottom-right corner cut at a 45-degree angle.
   - Unit 34: Standard rectangle with ONLY its bottom-left corner cut at a 45-degree angle.
   - Unit 38: Standard rectangle with ONLY its top-right corner cut at a 45-degree angle.
   - Unit 39: Standard rectangle with ONLY its top-left corner cut at a 45-degree angle.
4. SINGLE CHAMFERED UNITS:
   - Unit 01: Triangular/slope cut on top right.
   - Units 08, 09, 11, 26, 45: Single chamfered corner rectangular blocks.
5. SPECIAL NON-POLYGON SHAPES:
   - Unit 23: Circular kiosk. Set 'shape_type': "circle".
   - Unit 42: Pill/stadium horizontal capsule. Set 'shape_type': "capsule".
6. POINT TRACING:
   - Trace all vertices in CLOCKWISE order into the 'points' array. Ensure adjacent partition walls remain parallel without overlapping.`;

  const requestConfig = {
    contents: [
      {
        role: "user",
        parts: [
          { text: promptText },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: rawImageBuffer.toString("base64"),
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        description: "List of normalized vector footprints extracted from the floor plan.",
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            name: { type: Type.STRING },
            zone: { type: Type.STRING },
            shape_type: { type: Type.STRING, description: "polygon, circle, or capsule" },
            isObstacle: { type: Type.BOOLEAN },
            centroid: {
              type: Type.ARRAY,
              items: { type: Type.NUMBER },
              description: "[x, y] center point normalized 0.0 to 1.0",
            },
            points: {
              type: Type.ARRAY,
              items: {
                type: Type.ARRAY,
                items: { type: Type.NUMBER },
              },
              description: "Array of [x, y] perimeter points tracing the precise outline clockwise.",
            },
          },
          required: ["id", "name", "shape_type", "centroid", "points", "isObstacle"],
        },
      },
    },
  };

  // Fallback array across active Gemini models to bypass 429 quota limits
  const modelsToTry = [
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite",
    "gemini-2.5-flash",
  ];

  let response: any;
  let lastError: any;

  for (const model of modelsToTry) {
    try {
      response = await callGeminiWithRetry(() =>
        ai.models.generateContent({ model, ...requestConfig })
      );
      console.log(`[FloorPlanParser] Successfully parsed using model: ${model}`);
      break;
    } catch (err: any) {
      console.warn(`[FloorPlanParser] Model '${model}' failed or rate-limited. Trying fallback...`);
      lastError = err;
    }
  }

  if (!response || !response.text) {
    throw lastError || new Error("All vision models failed due to rate limits or invalid responses.");
  }

  const rawParsedData = JSON.parse(response.text);

  // Post-Processing: Pixel sampling for colors & point formatting
  const finalBlocks: Extruded3DBlock[] = await Promise.all(
    rawParsedData.map(async (item: any, idx: number) => {
      const cx = item.centroid?.[0] ?? 0.5;
      const cy = item.centroid?.[1] ?? 0.5;

      const sampledHexColor = await sampleExactColorFromImage(rawImageBuffer, cx, cy);

      const formattedPoints: Point2D[] = (item.points || []).map((pt: number[]) => ({
        x: Math.round(pt[0] * 10000) / 10000,
        y: Math.round(pt[1] * 10000) / 10000,
      }));

      return {
        id: item.id || `block_${idx + 1}`,
        name: item.name || `Unit ${idx + 1}`,
        zone: item.zone || "Main Floor",
        shape_type: item.shape_type || "polygon",
        color: sampledHexColor,
        isObstacle: item.isObstacle ?? true,
        centroid: { x: cx, y: cy },
        points: formattedPoints,
      };
    })
  );

  return finalBlocks;
}