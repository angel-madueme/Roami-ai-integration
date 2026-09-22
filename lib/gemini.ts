export interface GeminiExtractionRequest {
  image: Buffer | Uint8Array;
  mimeType: string;
  prompt: string;
}

/** Returns Gemini's raw extraction response; provider wiring is intentionally deferred. */
export async function extractItineraryWithGemini(
  _request: GeminiExtractionRequest
): Promise<unknown> {
  // TODO: Call Gemini 2.5 Flash through Google's official Gemini SDK.
  throw new Error("Gemini integration not implemented yet.");
}
