import { createClient } from "@openpreview/db/server";
import OnboardingPage from "./OnboardingPage";
import { redirect } from "next/navigation";


export default async function Onboarding() {
  const supabase = createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return redirect('/login');
  }

  return (
    <OnboardingPage user={user} />
  )
}