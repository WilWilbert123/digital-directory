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
            text: `Analyze this floor plan/blueprint image.
Extract every distinct room, store, or tenant zone you see.
For each region, provide its text label (if any), shape, and bounding box.

Important Coordinate Rules:
- The bounds must represent a rectangular bounding box around the shape.
- xPercentage and yPercentage represent the CENTER of the region (0 to 100).
- widthPercentage and heightPercentage represent the total size of the region (0 to 100).
- Do not extract empty hallways as regions.
- Do not extract small text fragments, only bounding boxes for the actual rooms/structures.`,
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
        type: Type.OBJECT,
        properties: {
          regions: {
            type: Type.ARRAY,
            description: "Array of bounded regions representing distinct stores, rooms, or zones in the blueprint.",
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING, description: "The name of the store, room, or zone. Extract exactly as written." },
                shape: { type: Type.STRING, description: "BOX or CYLINDER" },
                bounds: {
                  type: Type.OBJECT,
                  properties: {
                    xPercentage: { type: Type.NUMBER, description: "X coordinate of the center (0-100)" },
                    yPercentage: { type: Type.NUMBER, description: "Y coordinate of the center (0-100)" },
                    widthPercentage: { type: Type.NUMBER, description: "Width percentage (0-100)" },
                    heightPercentage: { type: Type.NUMBER, description: "Height percentage (0-100)" }
                  },
                  required: ["xPercentage", "yPercentage", "widthPercentage", "heightPercentage"]
                }
              },
              required: ["label", "shape", "bounds"]
            }
          }
        },
        required: ["regions"]
      }
    }
  };

  let response;
  try {
    response = await callGeminiWithRetry(() => ai.models.generateContent({ model: "gemini-3.6-flash", ...requestConfig }));
  } catch (err: any) {
    if (err?.status === 503 || err?.code === 503 || err?.message?.includes("503")) {
      console.warn("Primary model busy, switching to fallback...");
      response = await callGeminiWithRetry(() => ai.models.generateContent({ model: "gemini-1.5-flash", ...requestConfig }));
    } else {
      throw err;
    }
  }

  if (!response.text) throw new Error("No response from AI");
  const parsedData = JSON.parse(response.text);
  return parsedData.regions;
}
