export interface UnsplashPhoto {
  photoUrl: string;
  photographerName: string;
  photographerUrl: string;
}

/** Searches Unsplash by destination; provider wiring is intentionally deferred. */
export async function findDestinationPhoto(
  _destination: string
): Promise<UnsplashPhoto | null> {
  // TODO: Search Unsplash and return null for empty results or any provider failure.
  return null;
}
