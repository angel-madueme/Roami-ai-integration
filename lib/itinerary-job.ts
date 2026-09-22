import { prisma } from "@/lib/prisma";
import { withGeminiConcurrency } from "@/lib/concurrency";
import { AI_CONFIG } from "@/lib/ai-config";

let stubInvocationCount = 0;

const STUB_FAILURE_MESSAGE = "Temporary stub extraction failure for test coverage.";

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Runs the temporary extraction worker for one job. The worker alternates
 * between DONE and FAILED so both API paths can be tested before Gemini is wired.
 */
export function runItineraryExtractionJob(jobId: string): void {
  void withGeminiConcurrency(async () => {
    try {
      await prisma.itineraryJob.update({
        where: { id: jobId },
        data: { attempts: { increment: 1 } },
      });

      await sleep(AI_CONFIG.upload.stubDelayMs);
      stubInvocationCount += 1;

      if (stubInvocationCount % 2 === 0) {
        await prisma.itinerary.create({
          data: {
            jobId,
            destination: "Lagos, Nigeria",
            startDate: new Date("2026-10-10T00:00:00.000Z"),
            endDate: new Date("2026-10-14T00:00:00.000Z"),
            activities: {
              create: [
                {
                  category: "SIGHTSEEING",
                  title: "Explore Lekki Conservation Centre",
                  note: "Walk the canopy bridge and explore the nature trails.",
                  order: 0,
                },
                {
                  category: "FOOD",
                  title: "Try local Lagos cuisine",
                  note: "Plan a meal featuring local dishes during the stay.",
                  order: 1,
                },
              ],
            },
          },
        });

        await prisma.itineraryJob.update({
          where: { id: jobId },
          data: { status: "DONE", errorMessage: null },
        });
        return;
      }

      await prisma.itineraryJob.update({
        where: { id: jobId },
        data: { status: "FAILED", errorMessage: STUB_FAILURE_MESSAGE },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected extraction failure.";
      try {
        await prisma.itineraryJob.update({
          where: { id: jobId },
          data: { status: "FAILED", errorMessage: message },
        });
      } catch (updateError) {
        console.error("Failed to mark itinerary job as FAILED:", updateError);
      }
      console.error("Itinerary extraction job failed:", error);
    }
  });
}
