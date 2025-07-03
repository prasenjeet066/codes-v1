import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { SettingsContent } from "@/components/settings/settings-content"

export default async function SettingsPage() {
  const supabase = createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/sign-in")
  }

  return <SettingsContent user={user} />
}
