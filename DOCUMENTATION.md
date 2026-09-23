## 1. What This Is

_To be completed._

## 2. How To Run It

_To be completed._

## 3. The Flow Step By Step

1. A signed-in user sends one JPG or PNG image as multipart form data in the `file` field to `POST /api/itinerary/upload`. The endpoint requires the existing database-backed session, enforces the 5-requests-per-user-per-10-minutes upload limit, and rejects empty or oversized files above the configured 10MB limit.

2. The endpoint writes the image to the local `uploads/itinerary/<userId>/` folder. The database stores only the generated relative `storageKey`, never the raw image bytes. It creates an `ItineraryJob` with `PENDING`, immediately changes it to `PROCESSING`, starts the background worker without awaiting it, and returns HTTP 202 with the job id right away.

3. The client polls `GET /api/itinerary/job/[id]` with the same authenticated session. The endpoint scopes the lookup by both job id and requesting user id, so another user’s job is never returned. `PROCESSING` returns the current status and attempts; `DONE` includes the full `Itinerary` and ordered `ItineraryActivity` records; `FAILED` includes `errorMessage`.

4. The background worker reads the uploaded image from the job’s `storageKey` and passes it to `lib/gemini.ts`. That client uses Google’s official Gemini SDK with Gemini 2.5 Flash, the configured 30-second timeout, temperature, and output-token cap. Its system prompt requests only the structured itinerary JSON and Gemini receives an explicit JSON response schema for the destination, ISO dates, activity categories, titles, and notes.

5. The worker parses Gemini’s raw JSON response and validates it independently with the Zod itinerary schema. A successful response that fails validation is sent through exactly one retry with the same input. A second validation failure marks the job `FAILED` and records the validation error; timeout and provider errors are marked failed without retry. A valid response creates the `Itinerary` and ordered `ItineraryActivity` rows, then marks the job `DONE`.

6. Before creating the successful `Itinerary`, the worker calls `lib/unsplash.ts` with the extracted destination. That module searches Unsplash using `UNSPLASH_ACCESS_KEY` and returns the first usable photo plus photographer attribution. Unsplash failures or empty results are treated as optional enrichment: the job still reaches `DONE`, with the three Unsplash fields left `null` when no photo is available.

7. Poll the returned job id while the worker runs:

   ```bash
   curl -i http://localhost:3000/api/itinerary/job/<job-id> \
     -H "Cookie: roami_session=<signed-session-cookie>"
   ```

   The upload response is immediate and contains `{ "id": "<job-id>", "status": "PROCESSING" }`. A later poll returns `DONE` with the persisted itinerary and activities, or `FAILED` with the recorded timeout, provider, or validation error.
## 4. The Data Model

`ItineraryJob` records every uploaded image and tracks the asynchronous extraction lifecycle through `PENDING`, `PROCESSING`, `DONE`, or `FAILED`, including attempts, failure details, and the local filesystem storage key. `Itinerary` stores one successful structured result for a job, including the destination, dates, optional Unsplash photo attribution, and timestamps. `ItineraryActivity` stores the ordered, categorized activities belonging to an itinerary.

The `Itinerary.jobId` unique constraint enforces one itinerary per job, preventing a single upload job from somehow producing two itinerary records. Foreign-key relations connect jobs to users and itineraries to jobs and activities, while the activity `order` value preserves display sequence.
## 5. The Concepts

### Structured output and schema validation

Structured output means Gemini is asked for a JSON object matching an explicit itinerary schema: destination, ISO start and end dates, and categorized activities with a title and note. This is needed because trusting a 200 response without validating its shape means a malformed or incomplete response could silently corrupt the itinerary or crash downstream code that expects fields which are not there.

`lib/gemini.ts` requests Gemini’s JSON response mode and response schema. `lib/itinerary-job.ts` independently parses the returned JSON and validates it with Zod before any database rows are created. If a successful response fails validation, the same input is retried once; if validation fails again, the job is marked `FAILED` with the validation error. Timeouts and provider errors are not retried.

This was chosen instead of trusting the model’s own schema enforcement alone. The model-side schema guides generation, while application-side Zod validation is the independent safety boundary before data is persisted.
## 6. What Went Wrong

_To be completed._

## 7. What This Slice Does Not Handle

_To be completed._

## 8. If I Built This Again

_To be completed._
