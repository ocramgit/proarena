import { redirect } from "next/navigation";

// Redirect to Esports Hub - Rankings is now part of /esports/rankings
export default function RankingsRedirect() {
  redirect("/esports/rankings");
}
