import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { NotificationsContent } from "@/components/notifications/notifications-content"

export default async function NotificationsPage() {
  const supabase = createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/sign-in")
  }

  return <NotificationsContent />
}
