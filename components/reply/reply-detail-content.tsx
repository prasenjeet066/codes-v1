"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { PostCard } from "@/components/dashboard/post-card"
import { CreatePost } from "@/components/dashboard/create-post"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"

interface ReplyDetailContentProps {
  replyId: string
  userId: string
}

export function ReplyDetailContent({ replyId, userId }: ReplyDetailContentProps) {
  const [reply, setReply] = useState<any>(null)
  const [parentPost, setParentPost] = useState<any>(null)
  const [subReplies, setSubReplies] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchReplyAndContext()
    fetchCurrentUser()
  }, [replyId, userId])

  const fetchCurrentUser = async () => {
    try {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).single()
      setCurrentUser(data)
    } catch (error) {
      console.error("Error fetching current user:", error)
    }
  }

  const fetchReplyAndContext = async () => {
    try {
      // Fetch the reply
      const { data: replyData, error: replyError } = await supabase
        .from("posts")
        .select(`
          *,
          profiles!inner(username, display_name, avatar_url, is_verified),
          likes(user_id),
          reposts(user_id),
          replies:posts!reply_to(id)
        `)
        .eq("id", replyId)
        .single()

      if (replyError) throw replyError

      const transformedReply = {
        ...replyData,
        username: replyData.profiles.username,
        display_name: replyData.profiles.display_name,
        avatar_url: replyData.profiles.avatar_url,
        is_verified: replyData.profiles.is_verified || false,
        likes_count: replyData.likes?.length || 0,
        is_liked: replyData.likes?.some((like: any) => like.user_id === userId) || false,
        reposts_count: replyData.reposts?.length || 0,
        is_reposted: replyData.reposts?.some((repost: any) => repost.user_id === userId) || false,
        replies_count: replyData.replies?.length || 0,
        is_repost: false,
      }

      setReply(transformedReply)

      // Fetch parent post if this is a reply
      if (replyData.reply_to) {
        const { data: parentData, error: parentError } = await supabase
          .from("posts")
          .select(`
            *,
            profiles!inner(username, display_name, avatar_url, is_verified),
            likes(user_id),
            reposts(user_id)
          `)
          .eq("id", replyData.reply_to)
          .single()

        if (!parentError && parentData) {
          const transformedParent = {
            ...parentData,
            username: parentData.profiles.username,
            display_name: parentData.profiles.display_name,
            avatar_url: parentData.profiles.avatar_url,
            is_verified: parentData.profiles.is_verified || false,
            likes_count: parentData.likes?.length || 0,
            is_liked: parentData.likes?.some((like: any) => like.user_id === userId) || false,
            reposts_count: parentData.reposts?.length || 0,
            is_reposted: parentData.reposts?.some((repost: any) => repost.user_id === userId) || false,
            is_repost: false,
          }
          setParentPost(transformedParent)
        }
      }

      // Fetch sub-replies
      const { data: subRepliesData, error: subRepliesError } = await supabase
        .from("posts")
        .select(`
          *,
          profiles!inner(username, display_name, avatar_url, is_verified),
          likes(user_id),
          reposts(user_id),
          replies:posts!reply_to(id)
        `)
        .eq("reply_to", replyId)
        .order("created_at", { ascending: true })

      if (!subRepliesError && subRepliesData) {
        const transformedSubReplies = subRepliesData.map((subReply: any) => ({
          ...subReply,
          username: subReply.profiles.username,
          display_name: subReply.profiles.display_name,
          avatar_url: subReply.profiles.avatar_url,
          is_verified: subReply.profiles.is_verified || false,
          likes_count: subReply.likes?.length || 0,
          is_liked: subReply.likes?.some((like: any) => like.user_id === userId) || false,
          reposts_count: subReply.reposts?.length || 0,
          is_reposted: subReply.reposts?.some((repost: any) => repost.user_id === userId) || false,
          replies_count: subReply.replies?.length || 0,
          is_repost: false,
        }))
        setSubReplies(transformedSubReplies)
      }
    } catch (error) {
      console.error("Error fetching reply and context:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLike = async (postId: string, isLiked: boolean) => {
    try {
      if (isLiked) {
        await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", userId)
      } else {
        await supabase.from("likes").insert({ post_id: postId, user_id: userId })
      }
      fetchReplyAndContext()
    } catch (error) {
      console.error("Error toggling like:", error)
    }
  }

  const handleRepost = async (postId: string, isReposted: boolean) => {
    try {
      if (isReposted) {
        await supabase.from("reposts").delete().eq("post_id", postId).eq("user_id", userId)
      } else {
        await supabase.from("reposts").insert({ post_id: postId, user_id: userId })
      }
      fetchReplyAndContext()
    } catch (error) {
      console.error("Error toggling repost:", error)
    }
  }

  const handleReplyCreated = () => {
    fetchReplyAndContext()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!reply) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Reply not found</h2>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto border-x">
        {/* Header */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Reply</h1>
        </div>

        {/* Parent Post (if exists) */}
        {parentPost && (
          <div className="border-b bg-gray-50">
            <div className="p-4 text-sm text-gray-600">
              Replying to <span className="text-blue-600">@{parentPost.username}</span>
            </div>
            <PostCard
              post={parentPost}
              currentUserId={userId}
              currentUser={currentUser}
              onLike={handleLike}
              onRepost={handleRepost}
              onReply={handleReplyCreated}
            />
          </div>
        )}

        {/* Main Reply */}
        <PostCard
          post={reply}
          currentUserId={userId}
          currentUser={currentUser}
          onLike={handleLike}
          onRepost={handleRepost}
          onReply={handleReplyCreated}
        />

        {/* Reply Form */}
        {currentUser && (
          <div className="border-b">
            <CreatePost userId={userId} replyTo={replyId} onPostCreated={handleReplyCreated} />
          </div>
        )}

        {/* Sub-replies */}
        <div className="divide-y">
          {subReplies.map((subReply) => (
            <PostCard
              key={subReply.id}
              post={subReply}
              currentUserId={userId}
              currentUser={currentUser}
              onLike={handleLike}
              onRepost={handleRepost}
              onReply={handleReplyCreated}
            />
          ))}
        </div>

        {subReplies.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No replies yet. Be the first to reply!</p>
          </div>
        )}
      </div>
    </div>
  )
}
