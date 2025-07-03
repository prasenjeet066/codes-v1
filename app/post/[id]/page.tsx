import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { PostDetailContent } from "@/components/post/post-detail-content"

interface PostPageProps {
  params: {
    id: string
  }
}

export default async function PostPage({ params }: PostPageProps) {
  const supabase = createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/sign-in")
  }

  return <PostDetailContent postId={params.id} userId={user.id} />
}
