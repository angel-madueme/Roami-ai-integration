import { requireVerifiedUser } from "@/lib/auth-guard";
import { ItineraryFlow } from "./_components/itinerary-flow";

export default async function ItineraryPage() {
  await requireVerifiedUser();
  return <ItineraryFlow />;
}
