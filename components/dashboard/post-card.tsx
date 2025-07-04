"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Heart, Loader2, MessageCircle, Languages, Repeat2, Share, Pin } from "lucide-react"
import Link from "next/link"
import { ReplyDialog } from "./reply-dialog"
import { PostActionsMenu } from "./post-actions-menu"
import { VerificationBadge } from "@/components/badge/verification-badge"
import LinkPreview from "@/components/link-preview"
import DOMPurify from "dompurify"
import { useRouter,usePathname } from "next/navigation"


// Component এর মধ্যে

import type { Post } from "@/types/post"

interface PostCardProps {
  post: Post
  currentUserId: string
  currentUser: any
  onLike: (postId: string, isLiked: boolean) => void
  onRepost: (postId: string, isReposted: boolean) => void
  onReply?: () => void
}

function extractFirstUrl(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const match = text.match(urlRegex)
  return match ? match[0] : null
}

export function PostCard({ post, currentUserId, currentUser, onLike, onRepost, onReply }: PostCardProps) {
  const [showReplyDialog, setShowReplyDialog] = useState(false)
  const [repostLoading, setRepostLoading] = useState(false)
  const router = useRouter()
  const postUrl = extractFirstUrl(post.content)
  const hasMedia = post.media_urls && post.media_urls.length > 0
  const [trans,setTrans] = useState(null)
  const MAX_LENGTH = 300; // You can adjust this
  const pathname = usePathname()
  const isPostPage = pathname.startsWith("/post")
  //const isPostPage = usePathname().startsWith("/post");
  const shouldTrim = !isPostPage && post.content.length > MAX_LENGTH;
  const halfLength = Math.floor(post.content.length / 2);
  const trimmedContent = post.content.slice(0, halfLength) + '...';
  async function translateText(text: string, targetLang: string = "bn") {
  const res = await fetch("https://libretranslate.com/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: text,
      source: "auto",
      target: targetLang,
      format: "text"
    })
  });
  const data = await res.json();
  return data.translatedText;
  }
    // Format hashtags and mentions with XSS protection
  const formatContent = (content: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g

    // First sanitize the content to prevent XSS
    const sanitizedContent = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    })
    
    return sanitizedContent
      .replace(
        urlRegex,
        '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline break-all">$1</a>',
      )
      .replace(
        /#([a-zA-Z0-9_\u0980-\u09FF]+)/g,
        '<span class="text-blue-600 hover:underline cursor-pointer">#$1</span>',
      )
      .replace(/@([a-zA-Z0-9_]+)/g, '<span class="text-blue-600 hover:underline cursor-pointer">@$1</span>')
  }
  
  const handlePostTranslate = async () => {
  const transTo = "bn"
  // set translated lang text
  const transText = await translateText(post.content, transTo)
  post.content = transText;
  setTrans({
    transTo: transTo,
    transFrom: ""
  })
  }

  // Reply handler
  const handleReplyClick = () => {
    router.push(`/post/${post.id}`)
  }

  // Direct repost handler (no dialog)
  const handleRepostClick = async () => {
    setRepostLoading(true)
    try {
      if (post.is_reposted) {
        // Remove repost
        const { error } = await supabase.from("posts").delete().eq("repost_of", post.id).eq("user_id", currentUserId)

        if (!error) {
          onRepost(post.id, true)
        }
      } else {
        // Add repost
        const { error } = await supabase.from("posts").insert({
          user_id: currentUserId,
          content: "",
          repost_of: post.id,
        })

        if (!error) {
          onRepost(post.id, false)
        }
      }
    } catch (error) {
      console.error("Error reposting:", error)
    } finally {
      setRepostLoading(false)
    }
  }

  // Pin post handler
  const handlePinPost = async () => {
    try {
      const { error } = await supabase
        .from("posts")
        .update({ is_pinned: !post.is_pinned })
        .eq("id", post.id)
        .eq("user_id", currentUserId)

      if (!error) {
        onReply?.() // Refresh timeline
      }
    } catch (error) {
      console.error("Error pinning post:", error)
    }
  }

  // Render image/video/gif media
  const renderMedia = (mediaUrls: string[] | null, mediaType: string | null) => {
    if (!mediaUrls || mediaUrls.length === 0) return null

    if (mediaType === "video") {
      return (
        <div className="mt-3 rounded-lg overflow-hidden border">
          <video src={mediaUrls[0]} className="w-full max-h-96 object-cover" controls />
        </div>
      )
    }
    if (mediaType === "gif") {
      return (
        <div className={`mt-3 grid gap-1 ${mediaUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {mediaUrls.slice(0, 4).map((url, index) => (
            <div key={index} className="relative">
              <img
                src={url || "/placeholder.svg"}
                alt="GIF media"
                className="w-full h-32 lg:h-48 object-cover cursor-pointer hover:opacity-90 rounded"
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(url, "_blank")
                }}
              />
              {url.includes("giphy.com") && (
                <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1 rounded">GIF</div>
              )}
            </div>
          ))}
        </div>
      )
    }
    // Default: images
    return (
      <div className={`mt-3 grid gap-1 ${mediaUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
        {mediaUrls.slice(0, 4).map((url, index) => (
          <img
            key={index}
            src={url || "/placeholder.svg"}
            alt="Post media"
            className="w-full h-32 lg:h-48 object-cover cursor-pointer hover:opacity-90 rounded"
            onClick={(e) => {
              e.stopPropagation()
              window.open(url, "_blank")
            }}
          />
        ))}
      </div>
    )
  }

  // Click to go to post
  const handlePostClick = () => {
    const pathParts = pathname.split("/")
    const currentPostId = pathParts[1] === "post" && pathParts[2] ? pathParts[2] : null
    if(currentPostId !== post.id){
    router.push(`/post/${post.id}`)
    }
  }

  return (
    <>
      <div className="border-b hover:bg-gray-50 transition-colors cursor-pointer" onClick={handlePostClick}>
        <div className="p-4">
          {/* Show repost header if this is a repost */}
          {post.is_repost && (
            <div className="flex items-center gap-2 mb-3 text-gray-500 text-sm">
              <Repeat2 className="h-4 w-4" />
              <span>
                Reposted by{" "}
                <Link href={`/profile/${post.reposted_by}`} className="text-blue-600 hover:underline">
                  @{post.reposted_by}
                </Link>
              </span>
            </div>
          )}

          {/* Pin indicator */}
          {post.is_pinned && (
            <div className="flex items-center gap-2 mb-3 text-blue-600 text-sm">
              <Pin className="h-4 w-4" />
              <span>Pinned Post</span>
            </div>
          )}

          <div className="flex gap-3">
            <Link href={`/profile/${post.username}`} className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <Avatar className="cursor-pointer h-10 w-10 lg:h-12 lg:w-12">
                <AvatarImage src={post.avatar_url || undefined} />
                <AvatarFallback>{post.display_name?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col items-left gap-1">
                <Link
                  href={`/profile/${post.username}`}
                  className="hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="font-semibold flex items-center gap-1">
                    {post.display_name}
                    {post.is_verified && <VerificationBadge className="h-4 w-4" size={15} />}
                  </span>
                </Link>
                <div className="flex flex-row items-center gap-1 -mt-2">
                  <span className="text-gray-500 text-[10px]">@{post.username}</span>
                  <span className="text-gray-500 text-[10px]">·</span>
                  <span className="text-gray-500 text-[10px]">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
              {post.content && (
                <div
                  className="text-gray-900 mt-2 mb-3 whitespace-pre-wrap text-sm lg:text-base leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formatContent(post.content) }}
                />
              )}
              {shouldTrim && isPostPage==false && (
  <button
    className="text-blue-600 hover:underline text-sm"
    onClick={e => {
      e.stopPropagation();
      router.push(`/post/${post.id}`);
    }}
  >
    Show More
  </button>
)}
              {isPostPage && trans==null && (
                 <span className="text-sm flex flex-row gap-1" onClick ={(e)=>
                   
                   handlePostTranslate()
                 }>
                   <Languages className="h-3 w-3 text-gray-700"/>
                   <small>Translate</small>
                 </span>
              )}
              {!hasMedia && postUrl && <LinkPreview url={postUrl} variant="compact" />}
              {renderMedia(post.media_urls, post.media_type)}
              <div className="flex items-center justify-between max-w-sm lg:max-w-md mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleReplyClick()
                  }}
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  <span className="text-xs lg:text-sm">{post.replies_count || 0}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`${post.is_reposted ? "text-green-600 bg-green-50" : "text-gray-500 hover:text-green-600 hover:bg-green-50"} p-2 rounded-full`}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRepostClick()
                  }}
                  disabled={repostLoading}
                >
                  {repostLoading ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Repeat2 className={`h-4 w-4 mr-1 ${post.is_reposted ? "fill-current" : ""}`} />
                  )}
                  <span className="text-xs lg:text-sm">{post.reposts_count || 0}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`${post.is_liked ? "text-red-600 bg-red-50" : "text-gray-500 hover:text-red-600 hover:bg-red-50"} p-2 rounded-full`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onLike(post.id, post.is_liked)
                  }}
                >
                  <Heart className={`h-4 w-4 mr-1 ${post.is_liked ? "fill-current" : ""}`} />
                  <span className="text-xs lg:text-sm">{post.likes_count}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Share className="h-4 w-4 mr-1" />
                  <span className="text-xs lg:text-sm">Share</span>
                </Button>
                <PostActionsMenu
                  post={post}
                  currentUserId={currentUserId}
                  onPostUpdated={onReply}
                  onPostDeleted={onReply}
                  onPinPost={handlePinPost}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      
    </>
  )
}
