import { GoogleGenAI, Type } from "@google/genai";

export async function parseFloorPlanImage(base64Image: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  async function callGeminiWithRetry(fn: () => Promise<any>, retries = 3, delay = 1500): Promise<any> {
    try {
      return await fn();
    } catch (error: any) {
      if (retries > 0 && (error?.status === 503 || error?.code === 503 || error?.message?.includes("503") || error?.status === 429)) {
        console.warn(`Model busy (503). Retrying in ${delay}ms...`);
        await new Promise((res) => setTimeout(res, delay));
        return callGeminiWithRetry(fn, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  const requestConfig = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are an expert indoor mapping and architectural geometry engine. Analyze the provided 2D floor plan image and convert all detectable retail units, kiosks, structural zones, walkways, and architectural features into clean, normalized 2D vector geometry ready for 3D extrusion in Three.js / WebGL.

### CORE OBJECTIVE:
Extract every individual unit and shape as a normalized vector footprint along with its identifying metadata, room number, zone, and dominant color.

### EXTRACTION RULES:
1. COORDINATE SPACE: Normalize all coordinates between 0.0000 and 1.0000. Top-left is [0.0, 0.0]. Bottom-right is [1.0, 1.0].
2. SHAPE CLASSIFICATION: Classify each detected element into one of four \`shape_type\` categories: "polygon", "circle", "rounded_rect", "compound".
3. METADATA EXTRACTION: Extract \`id\` (e.g. "11031", "kiosk_zone_c_1"), \`name\`, \`zone\`, \`color\` (hex code), and \`centroid\` [x, y].
4. COVERAGE CHECKLIST: Extract ALL distinct colored blocks across all zones, the central circular rotunda and walkways, and small kiosk islands.`
          },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            }
          },
        ]
      }
    ],
    config: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        description: "Array of extracted structural footprints.",
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            name: { type: Type.STRING },
            zone: { type: Type.STRING },
            color: { type: Type.STRING },
            shape_type: { type: Type.STRING, description: "polygon, circle, rounded_rect, or compound" },
            centroid: { type: Type.ARRAY, items: { type: Type.NUMBER } },
            points: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.NUMBER } } },
            center: { type: Type.ARRAY, items: { type: Type.NUMBER } },
            radius: { type: Type.NUMBER },
            bounds: { type: Type.ARRAY, items: { type: Type.NUMBER } },
            corner_radius: { type: Type.NUMBER },
          },
          required: ["id", "name", "shape_type", "centroid"]
        }
      }
    }
  };

  const modelsToTry = [
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-2.5-flash-lite"
  ];

  let response;
  let lastError;

  for (const model of modelsToTry) {
    try {
      response = await callGeminiWithRetry(() => ai.models.generateContent({ model, ...requestConfig }));
      break; // Success, exit loop
    } catch (err: any) {
      const isRetryable = 
        err?.status === 503 || err?.code === 503 || err?.message?.includes("503") || 
        err?.status === 429 || err?.code === 429 || err?.message?.includes("429") || 
        err?.status === 404 || err?.code === 404 || err?.message?.includes("not found");
        
      if (isRetryable) {
        console.warn(`Model ${model} unavailable (busy/quota/not found), trying next model...`);
        lastError = err;
        continue;
      } else {
        throw err; // Non-retryable error (e.g. malformed request)
      }
    }
  }

  if (!response) {
    throw lastError || new Error("All AI models failed or were unavailable");
  }

  if (!response.text) throw new Error("No response from AI");
  const parsedData = JSON.parse(response.text);
  return parsedData; // It returns an array now directly
}
