"use client"

import { useState, useEffect } from "react"
import {ReplyCard} from "@/components/reply/reply-card"
import { useRouter } from "next/navigation"
import Spinner from "@/components/loader/spinner"
import { supabase } from "@/lib/supabase/client"
import { PostSection} from "@/components/post/post-section"
import { PostCard} from "@/components/dashboard/post-card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2, Paperclip } from "lucide-react"
import Image from "next/image"

import LinkPreview from "@/components/link-preview"

interface PostDetailContentProps {
  postId: string
  userId: string
}

type CommentState = {
  text: string
  replyingTo: string | null // username or null
  replyParentId: string | null // postId or replyId
}

export function PostDetailContent({ postId, userId }: PostDetailContentProps) {
  const [post, setPost] = useState<any>(null)
  const [replies, setReplies] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const [commentState, setCommentState] = useState<CommentState>({
    text: '',
    replyingTo: null,
    replyParentId: postId // by default, reply to the main post
  })
  const [isPosting, setIsPosting] = useState(false)
  
  useEffect(() => {
    fetchCurrentUser()
    fetchPostAndReplies()
    
    // Reset comment state when postId changes
    setCommentState({
      text: '',
      replyingTo: null,
      replyParentId: postId,
    })
  }, [postId, userId])
  /**
  const setNewViewUpdate = async (data) =>{
    try{
      if(userId !== null){
      const {error} = await supabase.from('posts').update({
        views_count : post.views_count + 1
      }).eq("id",postId)
      }
    }catch(error){
      // error
    }
  }**/
  const fetchCurrentUser = async () => {
    try {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).single()
      setCurrentUser(data)
    } catch (error) {
      console.error("Error fetching current user:", error)
    }
  }

  const handlePostComment = async () => {
    if (!commentState.text.trim() || isPosting) return

    setIsPosting(true)
    try {
      const commentData = {
        content: commentState.text,
        user_id: userId,
        reply_to: commentState.replyParentId,
      }

      const { error } = await supabase.from('posts').insert(commentData)
      if (error) throw error

      // Reset comment box and refresh replies
      setCommentState({ text: '', replyingTo: null, replyParentId: postId })
      await fetchPostAndReplies()
    } catch (error) {
      console.error('Error posting comment:', error)
    } finally {
      setIsPosting(false)
    }
  }

  const fetchPostAndReplies = async () => {
    try {
      setIsLoading(true)

      // Fetch main post
      const { data: postData, error: postError } = await supabase
        .from("posts")
        .select(`
          *,
          profiles!posts_user_id_fkey(username, display_name, avatar_url, is_verified)
        `)
        .eq("id", postId)
        .single()

      if (postError) {
        setPost(null)
        setIsLoading(false)
        return
      }
      //setNewViewUpdate(data)
      // Fetch likes, reposts, replies count
      const [{ data: likesData }, { data: repostsData }, { data: repliesCount }] = await Promise.all([
        supabase.from("likes").select("user_id").eq("post_id", postId),
        supabase.from("reposts").select("user_id").eq("post_id", postId),
        supabase.from("posts").select("id").eq("reply_to", postId)
      ])

      const transformedPost = {
        ...postData,
        username: postData.profiles?.username || "unknown",
        display_name: postData.profiles?.display_name || "Unknown User",
        avatar_url: postData.profiles?.avatar_url,
        is_verified: postData.profiles?.is_verified || false,
        likes_count: likesData?.length || 0,
        is_liked: likesData?.some((like: any) => like.user_id === userId) || false,
        reposts_count: repostsData?.length || 0,
        is_reposted: repostsData?.some((repost: any) => repost.user_id === userId) || false,
        replies_count: repliesCount?.length || 0,
        is_repost: false,
      }
      //setNewViewUpdate(postData)
      setPost(transformedPost)
      try{
      if(userId !== postData.user_id){
      const {error} = await supabase.from('posts').update({
        views_count : postData.views_count + 1
      }).eq("id",postId)
      }
    }catch(error){
      // error
      }
      // Fetch replies (top-level only)
      const { data: repliesData, error: repliesError } = await supabase
        .from("posts")
        .select(`
          *,
          profiles!posts_user_id_fkey(username, display_name, avatar_url, is_verified)
        `)
        .eq("reply_to", postId)
        .order("created_at", { ascending: true })

      if (repliesError) {
        setReplies([])
        return
      }

      // For each reply, fetch like/repost counts
      const transformedReplies = await Promise.all(
        (repliesData || []).map(async (reply: any) => {
          const [{ data: replyLikes }, { data: replyReposts }] = await Promise.all([
            supabase.from("likes").select("user_id").eq("post_id", reply.id),
            supabase.from("reposts").select("user_id").eq("post_id", reply.id),
          ])
          return {
            ...reply,
            username: reply.profiles?.username || "unknown",
            display_name: reply.profiles?.display_name || "Unknown User",
            avatar_url: reply.profiles?.avatar_url,
            is_verified: reply.profiles?.is_verified || false,
            likes_count: replyLikes?.length || 0,
            is_liked: replyLikes?.some((like: any) => like.user_id === userId) || false,
            reposts_count: replyReposts?.length || 0,
            is_reposted: replyReposts?.some((repost: any) => repost.user_id === userId) || false,
            replies_count: 0,
            is_repost: false,
          }
        })
      )

      setReplies(transformedReplies)
    } catch (error) {
      console.error("Error fetching post and replies:", error)
      setPost(null)
    } finally {
      
      setIsLoading(false)
    }
  }

  const handleLike = async (id: string, isLiked: boolean) => {
    try {
      if (isLiked) {
        await supabase.from("likes").delete().eq("post_id", id).eq("user_id", userId)
      } else {
        await supabase.from("likes").insert({ post_id: id, user_id: userId })
      }
      fetchPostAndReplies()
    } catch (error) {
      console.error("Error toggling like:", error)
    }
  }

  const handleRepost = async (id: string, isReposted: boolean) => {
    try {
      if (isReposted) {
        await supabase.from("reposts").delete().eq("post_id", id).eq("user_id", userId)
      } else {
        await supabase.from("reposts").insert({ post_id: id, user_id: userId })
      }
      fetchPostAndReplies()
    } catch (error) {
      console.error("Error toggling repost:", error)
    }
  }

  // Handle clicking "Reply" on a post or reply
  const handleReplyCreated = (reply?: any) => {
    if (reply) {
      // Set reply state to reply to this reply
      setCommentState({
        text: '',
        replyingTo: reply.username,
        replyParentId: reply.id
      })
      router.push(`/post/${reply.id}`)
    } else {
      // Replying to main post
      setCommentState({
        text: '',
        replyingTo: post.username,
        replyParentId: postId
      })
    }
  }

  // UI rendering
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Spinner/>
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

  // Helper: render the reply input box
  const renderReplyInput = () => (
    <div className="flex items-center gap-2 px-4 py-3 box-border w-full">
      {/* Avatar */}
      {currentUser?.avatar_url ? (
        <Image
          src={currentUser.avatar_url}
          alt={currentUser.display_name || "User"}
          width={35}
          height={35}
          className="rounded-full object-cover"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gray-200" />
      )}

      {/* Input container */}
      <div className="flex-1 flex items-center bg-gray-100 rounded-full px-3 py-1">
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={commentState.text}
            onChange={e =>
              setCommentState(prev => ({ ...prev, text: e.target.value }))
            }
            placeholder={
              commentState.replyingTo
                ? `Replying to @${commentState.replyingTo}...`
                : "Write a reply..."
            }
            className="bg-transparent w-full outline-none px-2 py-1"
            disabled={isPosting}
            autoFocus
          />
        </div>
        <button
          type="button"
          className="text-gray-400 hover:text-gray-600 flex items-center ml-2"
          tabIndex={-1}
          aria-label="Attach file"
        >
          <Paperclip className="w-5 h-5" />
        </button>
      </div>

      <Button
        className="bg-gray-800 text-white rounded-full"
        disabled={!commentState.text.trim() || isPosting}
        onClick={handlePostComment}
      >
        {isPosting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          'Post'
        )}
      </Button>
    </div>
  )

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto border-x">
        {/* Header */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b px-4 py-3 z-50 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold">{post.display_name}</h1>
            <small>{replies.length} replies</small>
          </div>
        </div>
        {/* Main Post */}
        <PostSection
          post={post}
          currentUserId={userId}
          currentUser={currentUser}
          onLike={handleLike}
          onRepost={handleRepost}
          onReply={() => handleReplyCreated()}
        />

        {/* Replies */}
        <div className="divide-y">
          <h3 className="my-2 px-4">Comments</h3>
          {/* Comment Box: Only show if not replying to a specific reply */}
          {!commentState.replyingTo && renderReplyInput()}
          {replies.map(reply => (
            <div key={reply.id}>
              <ReplyCard
                post={reply}
                currentUserId={userId}
                currentUser={currentUser}
                
              />
              {/* Show reply input under the reply if replying to it */}
              {commentState.replyParentId === reply.id && renderReplyInput()}
            </div>
          ))}
        </div>
        {replies.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No replies yet. Be the first to reply!</p>
          </div>
        )}
      </div>
    </div>
  )
  }
