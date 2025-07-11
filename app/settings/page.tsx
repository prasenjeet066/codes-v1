import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { SettingsContent } from "@/components/settings/settings-content"
import type { User } from "@supabase/supabase-js"

export default async function SettingsPage() {
  const supabase = createServerClient()

  const {
    data: { user },
  }: { data: { user: User | null } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/sign-in")
  }

  return <SettingsContent userId={user.id} />
}
