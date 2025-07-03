import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"

export default async function BookmarksPage() {
  const supabase = createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/sign-in")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 bengali-font">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">বুকমার্ক</h1>
        <p className="text-gray-600">এই বৈশিষ্ট্যটি শীঘ্রই আসছে...</p>
      </div>
    </div>
  )
}
