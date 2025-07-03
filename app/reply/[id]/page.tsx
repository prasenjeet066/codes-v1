import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { ReplyDetailContent } from "@/components/reply/reply-detail-content"

interface ReplyPageProps {
  params: {
    id: string
  }
}

export default async function ReplyPage({ params }: ReplyPageProps) {
  const supabase = createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/sign-in")
  }

  return <ReplyDetailContent replyId={params.id} userId={user.id} />
}
