import { GoogleGenAI, Type } from "@google/genai";
import { AI_CONFIG } from "@/lib/ai-config";

export interface GeminiExtractionRequest {
  image: Buffer | Uint8Array;
  mimeType: string;
  prompt: string;
}

export class GeminiTimeoutError extends Error {
  constructor() {
    super("Gemini request timed out.");
    this.name = "GeminiTimeoutError";
  }
}

const EXTRACTION_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    destination: { type: Type.STRING },
    startDate: { type: Type.STRING, description: "ISO date in YYYY-MM-DD format." },
    endDate: { type: Type.STRING, description: "ISO date in YYYY-MM-DD format." },
    activities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: {
            type: Type.STRING,
            enum: ["TRANSPORT", "LODGING", "FOOD", "SIGHTSEEING", "OTHER"],
          },
          title: { type: Type.STRING },
          note: { type: Type.STRING },
        },
        required: ["category", "title", "note"],
      },
    },
  },
  required: ["destination", "startDate", "endDate", "activities"],
} as const;

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /timeout|timed out|deadline exceeded|abort/i.test(`${error.name} ${error.message}`);
}

/**
 * Sends the stored image to Gemini and returns the raw JSON response text.
 * The response is independently validated by the background worker with Zod.
 */
export async function extractItineraryWithGemini(
  request: GeminiExtractionRequest
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing required environment variable: GEMINI_API_KEY");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: AI_CONFIG.gemini.model,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: request.mimeType,
                data: Buffer.from(request.image).toString("base64"),
              },
            },
            { text: "Extract the itinerary from this image." },
          ],
        },
      ],
      config: {
        systemInstruction: request.prompt,
        temperature: AI_CONFIG.gemini.temperature,
        maxOutputTokens: AI_CONFIG.gemini.maxOutputTokens,
        responseMimeType: "application/json",
        responseSchema: EXTRACTION_RESPONSE_SCHEMA,
        httpOptions: {
          timeout: AI_CONFIG.gemini.timeoutMs,
          retryOptions: { attempts: 1 },
        },
      },
    });

    const rawResponse = response.text;
    if (!rawResponse) {
      throw new Error("Gemini returned an empty response.");
    }

    return rawResponse;
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new GeminiTimeoutError();
    }
    throw error;
  }
}
