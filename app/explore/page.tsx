import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { ExploreContent } from "@/components/explore/explore-content"

export default async function ExplorePage() {
  const supabase = createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/sign-in")
  }

  return <ExploreContent />
}
