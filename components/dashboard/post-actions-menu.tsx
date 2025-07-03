"use client"

import { useState } from "react"
import { MoreHorizontal, Edit, Trash2, Flag, UserX, Pin, PinOff } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { Post } from "@/types/post"

interface PostActionsMenuProps {
  post: Post
  currentUserId: string
  onPostUpdated?: () => void
  onPostDeleted?: () => void
  onPinPost?: () => void
}

export function PostActionsMenu({
  post,
  currentUserId,
  onPostUpdated,
  onPostDeleted,
  onPinPost,
}: PostActionsMenuProps) {
  const [isLoading, setIsLoading] = useState(false)
  const isOwnPost = post.user_id === currentUserId

  const handleDeletePost = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return

    setIsLoading(true)
    try {
      const { error } = await supabase.from("posts").delete().eq("id", post.id).eq("user_id", currentUserId)

      if (error) throw error

      toast.success("Post deleted successfully")
      onPostDeleted?.()
    } catch (error) {
      console.error("Error deleting post:", error)
      toast.error("Failed to delete post")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePinPost = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from("posts")
        .update({ is_pinned: !post.is_pinned })
        .eq("id", post.id)
        .eq("user_id", currentUserId)

      if (error) throw error

      toast.success(post.is_pinned ? "Post unpinned" : "Post pinned")
      onPinPost?.()
    } catch (error) {
      console.error("Error pinning post:", error)
      toast.error("Failed to pin post")
    } finally {
      setIsLoading(false)
    }
  }

  const handleReportPost = async () => {
    try {
      const { error } = await supabase.from("reports").insert({
        reporter_id: currentUserId,
        reported_user_id: post.user_id,
        post_id: post.id,
        reason: "inappropriate_content",
        status: "pending",
      })

      if (error) throw error

      toast.success("Post reported successfully")
    } catch (error) {
      console.error("Error reporting post:", error)
      toast.error("Failed to report post")
    }
  }

  const handleBlockUser = async () => {
    if (!confirm(`Are you sure you want to block @${post.username}?`)) return

    try {
      const { error } = await supabase.from("blocks").insert({
        blocker_id: currentUserId,
        blocked_id: post.user_id,
      })

      if (error) throw error

      toast.success(`Blocked @${post.username}`)
      onPostUpdated?.()
    } catch (error) {
      console.error("Error blocking user:", error)
      toast.error("Failed to block user")
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {isOwnPost ? (
          <>
            <DropdownMenuItem onClick={handlePinPost} disabled={isLoading}>
              {post.is_pinned ? (
                <>
                  <PinOff className="mr-2 h-4 w-4" />
                  Unpin post
                </>
              ) : (
                <>
                  <Pin className="mr-2 h-4 w-4" />
                  Pin to profile
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" />
              Edit post
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDeletePost} disabled={isLoading} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete post
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem onClick={handleReportPost}>
              <Flag className="mr-2 h-4 w-4" />
              Report post
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleBlockUser} className="text-red-600">
              <UserX className="mr-2 h-4 w-4" />
              Block @{post.username}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
