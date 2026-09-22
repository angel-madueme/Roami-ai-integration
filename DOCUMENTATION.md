## 1. What This Is

_To be completed._

## 2. How To Run It

_To be completed._

## 3. The Flow Step By Step

1. A signed-in user sends one JPG or PNG image as multipart form data in the `file` field to `POST /api/itinerary/upload`. The endpoint requires the existing database-backed session, enforces the 5-requests-per-user-per-10-minutes upload limit, and rejects empty or oversized files above the configured 10MB limit.

2. The endpoint writes the image to the local `uploads/itinerary/<userId>/` folder. The database stores only the generated relative `storageKey`, never the raw image bytes. It creates an `ItineraryJob` with `PENDING`, immediately changes it to `PROCESSING`, starts the background worker without awaiting it, and returns HTTP 202 with the job id right away.

3. The client polls `GET /api/itinerary/job/[id]` with the same authenticated session. The endpoint scopes the lookup by both job id and requesting user id, so another user’s job is never returned. `PROCESSING` returns the current status and attempts; `DONE` includes the full `Itinerary` and ordered `ItineraryActivity` records; `FAILED` includes `errorMessage`.

4. For this API-only stub, the worker runs behind the in-memory Gemini concurrency cap, increments the job attempts, waits briefly to simulate processing, and alternates between a successful fake itinerary with two activities and a recorded failure. This makes both `DONE` and `FAILED` polling paths testable before the real Gemini call is added.

5. A curl-equivalent upload is:

   ```bash
   curl -i -X POST http://localhost:3000/api/itinerary/upload \
     -H "Cookie: roami_session=<signed-session-cookie>" \
     -F "file=@./trip-notes.jpg"
   ```

   The immediate response is HTTP 202 with a body such as `{ "id": "<job-id>", "status": "PROCESSING" }`; it does not wait for the worker.

6. Poll the returned job id:

   ```bash
   curl -i http://localhost:3000/api/itinerary/job/<job-id> \
     -H "Cookie: roami_session=<signed-session-cookie>"
   ```

   The first response is normally `PROCESSING`, followed shortly by either `DONE` with the fake itinerary and activities or `FAILED` with the test error message. The upload and job-status endpoints are API-only in this step; no new UI is included.
## 4. The Data Model

`ItineraryJob` records every uploaded image and tracks the asynchronous extraction lifecycle through `PENDING`, `PROCESSING`, `DONE`, or `FAILED`, including attempts, failure details, and the local filesystem storage key. `Itinerary` stores one successful structured result for a job, including the destination, dates, optional Unsplash photo attribution, and timestamps. `ItineraryActivity` stores the ordered, categorized activities belonging to an itinerary.

The `Itinerary.jobId` unique constraint enforces one itinerary per job, preventing a single upload job from somehow producing two itinerary records. Foreign-key relations connect jobs to users and itineraries to jobs and activities, while the activity `order` value preserves display sequence.
## 5. The Concepts

_To be completed._

## 6. What Went Wrong

_To be completed._

## 7. What This Slice Does Not Handle

_To be completed._

## 8. If I Built This Again

_To be completed._
