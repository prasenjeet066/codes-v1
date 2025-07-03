"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { PostCard } from "./post-card"
import type { Post } from "@/types/post"

interface TimelineProps {
  userId: string
  refreshTrigger?: number
}

export function Timeline({ userId, refreshTrigger }: TimelineProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    fetchCurrentUser()
  }, [userId])

  useEffect(() => {
    fetchPosts()
  }, [userId, refreshTrigger])

  const fetchCurrentUser = async () => {
    try {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).single()
      setCurrentUser(data)
    } catch (error) {
      console.error("Error fetching current user:", error)
    }
  }

  const fetchPosts = async () => {
    try {
      setIsLoading(true)

      // Get all posts including reposts
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(`
          id,
          content,
          created_at,
          user_id,
          media_urls,
          media_type,
          reply_to,
          repost_of,
          is_pinned,
          profiles!posts_user_id_fkey(username, display_name, avatar_url, is_verified)
        `)
        .order("created_at", { ascending: false })
        .limit(50)

      if (postsError) {
        console.error("Posts Error:", postsError)
        return
      }

      // Process posts to handle reposts correctly
      const processedPosts: Post[] = []

      for (const post of postsData || []) {
        if (post.repost_of) {
          // This is a repost, get the original post
          const { data: originalPost, error: originalError } = await supabase
            .from("posts")
            .select(`
              id,
              content,
              created_at,
              user_id,
              media_urls,
              media_type,
              reply_to,
              profiles!posts_user_id_fkey(username, display_name, avatar_url, is_verified)
            `)
            .eq("id", post.repost_of)
            .single()

          if (!originalError && originalPost) {
            // Get stats for original post
            const [likesData, repostsData, repliesData] = await Promise.all([
              supabase.from("likes").select("user_id").eq("post_id", originalPost.id),
              supabase.from("posts").select("user_id").eq("repost_of", originalPost.id),
              supabase.from("posts").select("id").eq("reply_to", originalPost.id),
            ])

            const transformedPost: Post = {
              id: originalPost.id,
              content: originalPost.content,
              created_at: originalPost.created_at,
              user_id: originalPost.user_id,
              username: originalPost.profiles?.username || "unknown",
              display_name: originalPost.profiles?.display_name || "Unknown User",
              avatar_url: originalPost.profiles?.avatar_url,
              is_verified: originalPost.profiles?.is_verified || false,
              likes_count: likesData.data?.length || 0,
              is_liked: likesData.data?.some((like: any) => like.user_id === userId) || false,
              reposts_count: repostsData.data?.length || 0,
              is_reposted: repostsData.data?.some((repost: any) => repost.user_id === userId) || false,
              replies_count: repliesData.data?.length || 0,
              reply_to: originalPost.reply_to,
              media_urls: originalPost.media_urls,
              media_type: originalPost.media_type,
              is_repost: true,
              repost_of: originalPost.id,
              reposted_by: post.profiles?.username,
              post_user_id: post.user_id,
              post_username: post.profiles?.username,
              post_display_name: post.profiles?.display_name,
              post_created_at: post.created_at,
              repost_created_at: post.created_at,
            }
            processedPosts.push(transformedPost)
          }
        } else {
          // Regular post
          const [likesData, repostsData, repliesData] = await Promise.all([
            supabase.from("likes").select("user_id").eq("post_id", post.id),
            supabase.from("posts").select("user_id").eq("repost_of", post.id),
            supabase.from("posts").select("id").eq("reply_to", post.id),
          ])

          const transformedPost: Post = {
            id: post.id,
            content: post.content,
            created_at: post.created_at,
            user_id: post.user_id,
            username: post.profiles?.username || "unknown",
            display_name: post.profiles?.display_name || "Unknown User",
            avatar_url: post.profiles?.avatar_url,
            is_verified: post.profiles?.is_verified || false,
            likes_count: likesData.data?.length || 0,
            is_liked: likesData.data?.some((like: any) => like.user_id === userId) || false,
            reposts_count: repostsData.data?.length || 0,
            is_reposted: repostsData.data?.some((repost: any) => repost.user_id === userId) || false,
            replies_count: repliesData.data?.length || 0,
            reply_to: post.reply_to,
            media_urls: post.media_urls,
            media_type: post.media_type,
            is_repost: false,
            repost_of: null,
            reposted_by: null,
            post_user_id: null,
            post_username: null,
            post_display_name: null,
            post_created_at: null,
            repost_created_at: null,
          }
          processedPosts.push(transformedPost)
        }
      }

      // Sort by creation time (reposts use repost_created_at, regular posts use created_at)
      processedPosts.sort((a, b) => {
        const timeA = new Date(a.repost_created_at || a.created_at).getTime()
        const timeB = new Date(b.repost_created_at || b.created_at).getTime()
        return timeB - timeA
      })

      setPosts(processedPosts)
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (isLiked) {
      await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", userId)
    } else {
      await supabase.from("likes").insert({ post_id: postId, user_id: userId })
    }

    // Update local state
    setPosts(
      posts.map((post) =>
        post.id === postId ? { ...post, is_liked: !isLiked, likes_count: post.likes_count + (isLiked ? -1 : 1) } : post,
      ),
    )
  }

  const handleRepost = async (postId: string, isReposted: boolean) => {
    if (isReposted) {
      // Remove repost
      await supabase.from("posts").delete().eq("repost_of", postId).eq("user_id", userId)
    } else {
      // Add repost
      await supabase.from("posts").insert({
        repost_of: postId,
        user_id: userId,
        content: "",
      })
    }

    // Update local state and refresh
    setPosts(
      posts.map((post) =>
        post.id === postId
          ? {
              ...post,
              is_reposted: !isReposted,
              reposts_count: post.reposts_count + (isReposted ? -1 : 1),
            }
          : post,
      ),
    )

    // Refresh timeline to show new repost
    setTimeout(() => fetchPosts(), 500)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No posts yet. Follow some users or create your first post!</p>
      </div>
    )
  }

  return (
    <div>
      {posts.map((post, index) => (
        <PostCard
          key={`${post.id}_${post.is_repost ? post.repost_created_at : post.created_at}_${index}`}
          post={post}
          currentUserId={userId}
          currentUser={currentUser}
          onLike={handleLike}
          onRepost={handleRepost}
          onReply={fetchPosts}
        />
      ))}
    </div>
  )
                     }
