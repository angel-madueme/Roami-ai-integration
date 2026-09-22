## 1. What This Is

_To be completed._

## 2. How To Run It

_To be completed._

## 3. The Flow Step By Step

_To be completed._

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
