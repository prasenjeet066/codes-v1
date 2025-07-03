import { createServerClient } from "@/lib/supabase/server"
import { ProfileContent } from "@/components/profile/profile-content"

interface ProfilePageProps {
  params: {
    username: string
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const supabase = createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Allow viewing profiles even when not logged in
  const currentUserId = user?.id || null

  return <ProfileContent username={params.username} currentUserId={currentUserId} />
}
