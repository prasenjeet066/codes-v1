import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { PrivacyContent } from "@/components/privacy/privacy-content"

export default async function PrivacyPage() {
  const supabase = createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/sign-in")
  }

  return <PrivacyContent userId={user.id} />
}