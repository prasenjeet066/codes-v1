"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { VideoPlayer } from "@/components/media/video-player"
import { ImageViewer } from "@/components/media/image-viewer"
import { ArrowLeft, Heart, MessageCircle, Repeat2, Share, ChevronDown, ChevronRight, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

interface Post {
  id: string
  content: string
  created_at: string
  user_id: string
  media_urls?: string[]
  media_type?: string
  reply_to?: string
  profiles: {
    username: string
    display_name: string
    avatar_url?: string
    is_verified?: boolean
  }
  likes_count: number
  replies_count: number
  reposts_count: number
  is_liked: boolean
  is_reposted: boolean
}

interface NestedReply extends Post {
  replies?: NestedReply[]
  level: number
}

interface PostDetailContentProps {
  postId: string
  userId: string
}

export function PostDetailContent({ postId, userId }: PostDetailContentProps) {
  const router = useRouter()
  const [post, setPost] = useState<Post | null>(null)
  const [replies, setReplies] = useState<NestedReply[]>([])
  const [loading, setLoading] = useState(true)
  const [replyContent, setReplyContent] = useState("")
  const [isReplying, setIsReplying] = useState(false)
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [selectedImage, setSelectedImage] = useState<{ src: string; alt: string } | null>(null)

  useEffect(() => {
    fetchCurrentUser()
    fetchPost()
  }, [postId, userId])

  const fetchCurrentUser = async () => {
    try {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).single()
      setCurrentUser(data)
    } catch (error) {
      console.error("Error fetching current user:", error)
    }
  }

  const fetchPost = async () => {
    try {
      setLoading(true)

      // Fetch the main post
      const { data: postData, error: postError } = await supabase
        .from("posts")
        .select(`
          *,
          profiles!posts_user_id_fkey (
            username,
            display_name,
            avatar_url,
            is_verified
          )
        `)
        .eq("id", postId)
        .single()

      if (postError) {
        console.error("Post fetch error:", postError)
        setPost(null)
        return
      }

      // Fetch likes for the post
      const { data: likesData } = await supabase.from("likes").select("user_id").eq("post_id", postId)

      // Fetch reposts for the post
      const { data: repostsData } = await supabase.from("reposts").select("user_id").eq("post_id", postId)

      // Fetch replies count
      const { data: repliesCount } = await supabase.from("posts").select("id").eq("reply_to", postId)

      // Transform post data
      const transformedPost: Post = {
        ...postData,
        profiles: postData.profiles || { username: "unknown", display_name: "Unknown User" },
        likes_count: likesData?.length || 0,
        is_liked: likesData?.some((like: any) => like.user_id === userId) || false,
        reposts_count: repostsData?.length || 0,
        is_reposted: repostsData?.some((repost: any) => repost.user_id === userId) || false,
        replies_count: repliesCount?.length || 0,
      }

      setPost(transformedPost)
      await fetchReplies(postId)
    } catch (error) {
      console.error("Error fetching post:", error)
      setPost(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchReplies = async (parentId: string, level = 0) => {
    try {
      // Get all replies for this post
      const { data: repliesData, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles!posts_user_id_fkey (
            username,
            display_name,
            avatar_url,
            is_verified
          )
        `)
        .eq("reply_to", parentId)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Replies fetch error:", error)
        return []
      }

      const enrichedReplies: NestedReply[] = []

      for (const reply of repliesData || []) {
        // Fetch likes for each reply
        const { data: replyLikes } = await supabase.from("likes").select("user_id").eq("post_id", reply.id)

        // Fetch reposts for each reply
        const { data: replyReposts } = await supabase.from("reposts").select("user_id").eq("post_id", reply.id)

        // Fetch replies count for each reply
        const { data: replyRepliesCount } = await supabase.from("posts").select("id").eq("reply_to", reply.id)

        const enrichedReply: NestedReply = {
          ...reply,
          level,
          profiles: reply.profiles || { username: "unknown", display_name: "Unknown User" },
          likes_count: replyLikes?.length || 0,
          is_liked: replyLikes?.some((like: any) => like.user_id === userId) || false,
          reposts_count: replyReposts?.length || 0,
          is_reposted: replyReposts?.some((repost: any) => repost.user_id === userId) || false,
          replies_count: replyRepliesCount?.length || 0,
        }

        // Fetch nested replies (up to 5 levels deep)
        if (level < 5 && enrichedReply.replies_count > 0) {
          enrichedReply.replies = await fetchReplies(reply.id, level + 1)
        }

        enrichedReplies.push(enrichedReply)
      }

      if (level === 0) {
        setReplies(enrichedReplies)
      }

      return enrichedReplies
    } catch (error) {
      console.error("Error fetching replies:", error)
      return []
    }
  }

  const handleLike = async (targetPostId: string) => {
    try {
      const isCurrentlyLiked = targetPostId === postId ? post?.is_liked : false

      if (isCurrentlyLiked) {
        await supabase.from("likes").delete().eq("post_id", targetPostId).eq("user_id", userId)
      } else {
        await supabase.from("likes").insert({ post_id: targetPostId, user_id: userId })
      }

      // Update local state
      if (targetPostId === postId && post) {
        setPost({
          ...post,
          is_liked: !isCurrentlyLiked,
          likes_count: post.likes_count + (isCurrentlyLiked ? -1 : 1),
        })
      }

      // Update replies state
      const updateReplies = (replies: NestedReply[]): NestedReply[] => {
        return replies.map((reply) => {
          if (reply.id === targetPostId) {
            return {
              ...reply,
              is_liked: !isCurrentlyLiked,
              likes_count: reply.likes_count + (isCurrentlyLiked ? -1 : 1),
            }
          }
          if (reply.replies) {
            return { ...reply, replies: updateReplies(reply.replies) }
          }
          return reply
        })
      }

      setReplies((prev) => updateReplies(prev))
    } catch (error) {
      console.error("Error toggling like:", error)
    }
  }

  const handleRepost = async (targetPostId: string) => {
    try {
      const isCurrentlyReposted = targetPostId === postId ? post?.is_reposted : false

      if (isCurrentlyReposted) {
        await supabase.from("reposts").delete().eq("post_id", targetPostId).eq("user_id", userId)
      } else {
        await supabase.from("reposts").insert({ post_id: targetPostId, user_id: userId })
      }

      // Update local state
      if (targetPostId === postId && post) {
        setPost({
          ...post,
          is_reposted: !isCurrentlyReposted,
          reposts_count: post.reposts_count + (isCurrentlyReposted ? -1 : 1),
        })
      }
    } catch (error) {
      console.error("Error toggling repost:", error)
    }
  }

  const handleReply = async () => {
    if (!replyContent.trim()) return

    setIsReplying(true)
    try {
      const { error } = await supabase.from("posts").insert({
        content: replyContent.trim(),
        user_id: userId,
        reply_to: postId,
      })

      if (error) throw error

      setReplyContent("")
      if (post) {
        setPost({ ...post, replies_count: post.replies_count + 1 })
      }
      await fetchReplies(postId)
    } catch (error) {
      console.error("Error posting reply:", error)
    } finally {
      setIsReplying(false)
    }
  }

  const handleShare = async () => {
    try {
      await navigator.share({
        title: `Post by @${post?.profiles.username}`,
        text: post?.content,
        url: window.location.href,
      })
    } catch (error) {
      // Fallback to copying to clipboard
      await navigator.clipboard.writeText(window.location.href)
    }
  }

  const toggleReplyExpansion = (replyId: string) => {
    setExpandedReplies((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(replyId)) {
        newSet.delete(replyId)
      } else {
        newSet.add(replyId)
      }
      return newSet
    })
  }

  const renderMedia = (mediaUrls: string[]) => {
    return (
      <div
        className={`grid gap-2 mt-3 ${
          mediaUrls.length === 1 ? "grid-cols-1" : mediaUrls.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
        }`}
      >
        {mediaUrls.map((url, index) => {
          const isVideo = url.includes(".mp4") || url.includes(".webm") || url.includes(".mov")

          return (
            <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
              {isVideo ? (
                <VideoPlayer src={url} className="w-full h-full" />
              ) : (
                <img
                  src={url || "/placeholder.svg"}
                  alt={`Media ${index + 1}`}
                  className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setSelectedImage({ src: url, alt: `Media ${index + 1}` })}
                />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const renderReply = (reply: NestedReply) => {
    const isExpanded = expandedReplies.has(reply.id)
    const hasReplies = reply.replies && reply.replies.length > 0
    const indentLevel = Math.min(reply.level, 5)

    return (
      <div key={reply.id} className={`${indentLevel > 0 ? "ml-4 sm:ml-8" : ""}`}>
        {/* Connection Line */}
        {indentLevel > 0 && <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-200" />}

        <Card
          className={`mb-3 hover:shadow-md transition-shadow ${indentLevel > 0 ? "border-l-2 border-l-blue-200" : ""}`}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={reply.profiles.avatar_url || "/placeholder.svg"} />
                <AvatarFallback className="text-xs">
                  {reply.profiles.display_name?.[0] || reply.profiles.username?.[0] || "U"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Link
                    href={`/profile/${reply.profiles.username}`}
                    className="font-medium text-sm truncate hover:underline"
                  >
                    {reply.profiles.display_name || reply.profiles.username}
                  </Link>
                  {reply.profiles.is_verified && (
                    <Badge variant="secondary" className="h-4 w-4 p-0 rounded-full bg-blue-500 text-white">
                      ✓
                    </Badge>
                  )}
                  <span className="text-gray-500 text-xs">@{reply.profiles.username}</span>
                  <span className="text-gray-400 text-xs">·</span>
                  <span className="text-gray-500 text-xs">
                    {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                  </span>
                  {indentLevel > 0 && (
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      L{indentLevel}
                    </Badge>
                  )}
                </div>

                <p className="text-sm text-gray-900 mb-2 whitespace-pre-wrap break-words">{reply.content}</p>

                {reply.media_urls && reply.media_urls.length > 0 && renderMedia(reply.media_urls)}

                <div className="flex items-center gap-4 mt-3">
                  <button
                    onClick={() => handleLike(reply.id)}
                    className={`flex items-center gap-1 text-xs hover:text-red-500 transition-colors ${
                      reply.is_liked ? "text-red-500" : "text-gray-500"
                    }`}
                  >
                    <Heart className={`h-3 w-3 ${reply.is_liked ? "fill-current" : ""}`} />
                    {reply.likes_count > 0 && <span>{reply.likes_count}</span>}
                  </button>

                  <Link
                    href={`/reply/${reply.id}`}
                    className="flex items-center gap-1 text-xs hover:text-blue-500 transition-colors text-gray-500"
                  >
                    <MessageCircle className="h-3 w-3" />
                    {reply.replies_count > 0 && <span>{reply.replies_count}</span>}
                  </Link>

                  {hasReplies && (
                    <button
                      onClick={() => toggleReplyExpansion(reply.id)}
                      className="flex items-center gap-1 text-xs hover:text-blue-600 transition-colors text-blue-600"
                    >
                      {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      <span>
                        {reply.replies?.length} {reply.replies?.length === 1 ? "reply" : "replies"}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Nested Replies */}
        {hasReplies && isExpanded && (
          <div className="relative">{reply.replies?.map((nestedReply) => renderReply(nestedReply))}</div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Post not found</h2>
          <p className="text-gray-500 mb-4">This post may have been deleted or doesn't exist.</p>
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
          <h1 className="text-xl font-bold">Post</h1>
        </div>

        {/* Main Post */}
        <div className="p-4 border-b">
          <div className="flex gap-3 mb-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={post.profiles.avatar_url || "/placeholder.svg"} />
              <AvatarFallback>{post.profiles.display_name?.[0] || post.profiles.username?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Link href={`/profile/${post.profiles.username}`} className="font-semibold hover:underline">
                  {post.profiles.display_name || post.profiles.username}
                </Link>
                <span className="text-gray-500">@{post.profiles.username}</span>
              </div>
              <p className="text-lg mb-3 break-words">{post.content}</p>

              {/* Media */}
              {post.media_urls && post.media_urls.length > 0 && renderMedia(post.media_urls)}

              <div className="text-gray-500 text-sm mb-3">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </div>
            </div>
          </div>

          {/* Post Actions */}
          <div className="flex items-center justify-between pt-3 border-t">
            <button
              onClick={() => handleLike(post.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-full hover:bg-red-50 transition-colors ${
                post.is_liked ? "text-red-500" : "text-gray-500"
              }`}
            >
              <Heart className={`h-5 w-5 ${post.is_liked ? "fill-current" : ""}`} />
              <span>{post.likes_count}</span>
            </button>

            <button className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-blue-50 text-gray-500 transition-colors">
              <MessageCircle className="h-5 w-5" />
              <span>{post.replies_count}</span>
            </button>

            <button
              onClick={() => handleRepost(post.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-full hover:bg-green-50 transition-colors ${
                post.is_reposted ? "text-green-500" : "text-gray-500"
              }`}
            >
              <Repeat2 className="h-5 w-5" />
              <span>{post.reposts_count}</span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-gray-50 text-gray-500 transition-colors"
            >
              <Share className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Reply Form */}
        <div className="p-4 border-b">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={currentUser?.avatar_url || "/placeholder.svg"} />
              <AvatarFallback>{currentUser?.display_name?.[0] || currentUser?.username?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                placeholder="Post your reply"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="min-h-[80px] resize-none border-none p-0 text-lg placeholder:text-gray-500 focus-visible:ring-0"
              />
              <div className="flex justify-end mt-3">
                <Button
                  onClick={handleReply}
                  disabled={!replyContent.trim() || isReplying}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  {isReplying ? "Posting..." : "Reply"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Replies */}
        <div className="divide-y">
          {replies.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No replies yet. Be the first to reply!</p>
            </div>
          ) : (
            <div className="px-4">
              <h3 className="py-4 font-semibold text-lg">Replies</h3>
              {replies.map((reply) => renderReply(reply))}
            </div>
          )}
        </div>
      </div>

      {/* Image Viewer */}
      {selectedImage && (
        <ImageViewer
          src={selectedImage.src || "/placeholder.svg"}
          alt={selectedImage.alt}
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </div>
  )
}
