import { redirect } from "next/navigation";

// Redirect to Esports Hub - Pracc is now part of /esports/pracc
export default function PraccRedirect() {
  redirect("/esports/pracc");
}
