import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import CreatePostPage  from "@/components/create/create-post-page"

export default async function CreatePage() {
  const supabase = createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/sign-in")
  }

  return <CreatePostPage user={user} />
}
