import { redirect } from "next/navigation";

// Redirect to Esports Hub - My Org is now part of /esports/org
export default function OrgMeRedirect() {
  redirect("/esports/org");
}
