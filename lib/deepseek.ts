export interface DeepSeekExpansionRequest {
  itinerary: unknown;
  prompt: string;
}

/** Returns DeepSeek's raw expansion response; provider wiring is intentionally deferred. */
export async function expandItineraryWithDeepSeek(
  _request: DeepSeekExpansionRequest
): Promise<unknown> {
  void _request;
  // TODO: Use the official OpenAI SDK with baseURL https://api.deepseek.com.
  // DeepSeek's API is OpenAI-compatible, so the OpenAI SDK is pointed at its
  // different base URL as documented in the PRD and AGENTS.md.
  throw new Error("DeepSeek integration not implemented yet.");
}
