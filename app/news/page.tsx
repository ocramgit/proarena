import { redirect } from "next/navigation";

// Redirect to Esports Hub - News is now part of /esports
export default function NewsRedirect() {
  redirect("/esports");
}
