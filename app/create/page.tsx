import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import EnhancedCreatePost from "@/components/create/enhanced-create-post"

export default async function CreatePage() {
  const supabase = createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/sign-in")
  }

  return <EnhancedCreatePost user={user} />
}
