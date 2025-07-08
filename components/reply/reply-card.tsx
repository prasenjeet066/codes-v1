"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { formatDistanceToNow } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Heart, Loader2, MessageCircle, Languages, Repeat2, Share, Pin, AlertCircle } from "lucide-react"
import Link from "next/link"
import { VerificationBadge } from "@/components/badge/verification-badge"
import LinkPreview from "@/components/link-preview"
import DOMPurify from "dompurify"
import { useRouter, usePathname } from "next/navigation"
import type { Post } from "@/types/post"

interface PostCardProps {
  post: Post
  currentUserId: string
  currentUser: any
  onLike: (postId: string, isLiked: boolean) => void
  onRepost: (postId: string, isReposted: boolean) => void
  onReply?: () => void
}

interface TranslationState {
  isTranslating: boolean
  translatedText: string | null
  originalText: string
  targetLang: string
  error: string | null
}

// Utility functions
const extractFirstUrl = (text: string): string | null => {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const match = text.match(urlRegex)
  return match ? match[0] : null
}

const smartTruncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  
  const sentences = text.match(/[^\.!?]+[\.!?]+/g)
  if (sentences) {
    let truncated = ""
    for (const sentence of sentences) {
      if ((truncated + sentence).length > maxLength) break
      truncated += sentence
    }
    if (truncated.length > 0) return truncated.trim() + "..."
  }
  
  const words = text.split(' ')
  let truncated = ""
  for (const word of words) {
    if ((truncated + word + " ").length > maxLength) break
    truncated += word + " "
  }
  
  return truncated.trim() + "..."
}

// Reply Preview Component
const ReplyPreview = ({ reply, index, total }) => {
  return (
    <div className="rounded-lg p-3 mb-2 last:mb-0">
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={reply.profiles.avatar_url || undefined} alt={`${reply.profiles.display_name}'s avatar`} />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
            {reply.profiles.display_name?.charAt(0)?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{reply.profiles.display_name}</span>
          
            <span className="text-gray-500 text-xs">·</span>
            <time className="text-gray-500 text-xs" dateTime={reply.created_at}>
              {formatDistanceToNow(new Date(reply.created_at), { addSuffix: false })}
            </time>
          </div>
          <p className="text-sm text-gray-700 mt-1 line-clamp-2">
            {reply.content}
          </p>
        </div>
      </div>
    </div>
  )
}

export function ReplyCard({ post, currentUserId, currentUser, onLike, onRepost }) {
  const [showReplyDialog, setShowReplyDialog] = useState(false)
  const [replies, setReplies] = useState([])
  const [showAllReplies, setShowAllReplies] = useState(false)
  const [repostLoading, setRepostLoading] = useState(false)
  const [translation, setTranslation] = useState<TranslationState>({
    isTranslating: false,
    translatedText: null,
    originalText: post.content,
    targetLang: "bn",
    error: null
  })
  
  const router = useRouter()
  const pathname = usePathname()
  
  // Memoized values
  const postUrl = useMemo(() => extractFirstUrl(post.content), [post.content])
  const hasMedia = useMemo(() => post.media_urls && post.media_urls.length > 0, [post.media_urls])
  const isPostPage = useMemo(() => pathname.startsWith("/post"), [pathname])
  
  const fetchReplies = async () => {
    try {
      const { data, error } = await supabase
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
        .eq("reply_to", post.id)
        .order("created_at", { ascending: true })
      
      if (error) throw error
      setReplies(data || [])
    } catch (error) {
      console.error("Error fetching replies:", error)
    }
  }
  
  useEffect(() => {
    fetchReplies()
  }, [post.id])
  
  const MAX_LENGTH = 100
  const shouldTrim = !isPostPage && post.content.length > MAX_LENGTH
  const displayContent = shouldTrim ? smartTruncate(post.content, MAX_LENGTH) : post.content
  
  // Translation function
  const translateText = useCallback(async (text: string, targetLang: string = "bn"): Promise<string> => {
    try {
      const res = await fetch("https://libretranslate.com/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          source: "auto",
          target: targetLang,
          format: "text"
        })
      })
      
      if (!res.ok) {
        throw new Error(`Translation failed: ${res.status}`)
      }
      
      const data = await res.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      return data.translatedText || text
    } catch (error) {
      console.error("Translation error:", error)
      throw new Error("Translation service unavailable")
    }
  }, [])
   
  // Enhanced content formatting
  const formatContent = useCallback((content: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const sanitizedContent = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    })
    
    return sanitizedContent
      .replace(
        urlRegex,
        '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline break-all hover:text-blue-800 transition-colors">$1</a>',
      )
      .replace(
        /#([a-zA-Z0-9_\u0980-\u09FF]+)/g,
        '<span class="text-blue-600 hover:underline cursor-pointer font-medium transition-colors">#$1</span>',
      )
      .replace(
        /@([a-zA-Z0-9_]+)/g, 
        '<span class="text-blue-600 hover:underline cursor-pointer font-medium transition-colors">@$1</span>'
      )
  }, [])

  // Media rendering
  const renderMedia = useCallback((mediaUrls: string[] | null, mediaType: string | null) => {
    if (!mediaUrls || mediaUrls.length === 0) return null

    const handleMediaClick = (url: string, e: React.MouseEvent) => {
      e.stopPropagation()
      window.open(url, "_blank", "noopener,noreferrer")
    }

    if (mediaType === "video") {
      return (
        <div className="mt-3 rounded-lg overflow-hidden border">
          <video 
            src={mediaUrls[0]} 
            className="w-full max-h-96 object-cover" 
            controls
            preload="metadata"
            onError={(e) => {
              console.error("Video load error:", e)
            }}
          />
        </div>
      )
    }

    return (
      <div className={`mt-3 grid gap-2 ${mediaUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
        {mediaUrls.slice(0, 4).map((url, index) => (
          <div key={index} className="relative group">
            <img
              src={url || "/placeholder.svg"}
              alt={`Post media ${index + 1}`}
              className="w-full h-32 lg:h-48 object-cover cursor-pointer hover:opacity-90 rounded transition-opacity"
              onClick={(e) => handleMediaClick(url, e)}
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = "/placeholder.svg"
              }}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded" />
            {mediaUrls.length > 4 && index === 3 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded">
                <span className="text-white text-lg font-semibold">
                  +{mediaUrls.length - 4}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }, [])

  const contentToDisplay = translation.translatedText || displayContent
  const previewReplies = replies.slice(0, 2)
  const hasMoreReplies = replies.length > 2

  return (
    <article 
      className="hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-200"
      aria-label={`Post by ${post.display_name}`}
    >
      <div className="p-4">
        <div className="flex gap-3 relative">
          {/* Thread line */}
          {replies.length > 0 && (
            <div className="absolute left-6 top-14 w-[5px] bg-none border-l-2 border-b-2 rounded-bl-lg h-full"></div>
          )}
          
          <Link 
            href={`/profile/${post.username}`} 
            className="flex-shrink-0 relative z-10" 
            onClick={(e) => e.stopPropagation()}
          >
            <Avatar className="cursor-pointer h-12 w-12 ring-2 ring-white border-2 border-gray-200 hover:ring-blue-200 transition-all">
              <AvatarImage src={post.avatar_url || undefined} alt={`${post.display_name}'s avatar`} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {post.display_name?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </Link>
          
          <div className="flex-1 min-w-0">
            <div className="flex flex-col items-left gap-1">
              <Link
                href={`/profile/${post.username}`}
                className="hover:underline transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="font-semibold flex items-center gap-1">
                  {post.display_name}
                  {post.is_verified && <VerificationBadge className="h-4 w-4" size={15} />}
                </span>
              </Link>
              <div className="flex flex-row items-center gap-1 -mt-1">
                <span className="text-gray-500 text-sm">@{post.username}</span>
                <span className="text-gray-500 text-sm">·</span>
                <time className="text-gray-500 text-sm" dateTime={post.created_at}>
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </time>
              </div>
            </div>
            
            {/* Post content */}
            {post.content && (
              <div className="mt-2 mb-3">
                <div
                  className="text-gray-900 whitespace-pre-wrap text-sm lg:text-base leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formatContent(contentToDisplay) }}
                />
                
                {shouldTrim && (
                  <button
                    className="text-blue-600 hover:text-blue-800 hover:underline text-sm mt-2 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/post/${post.id}`)
                    }}
                  >
                    Show More
                  </button>
                )}
              </div>
            )}

            {/* Link preview */}
            {!hasMedia && postUrl && (
              <div className="mb-3">
                <LinkPreview url={postUrl} variant="compact" />
              </div>
            )}

            {/* Media */}
            {renderMedia(post.media_urls, post.media_type)}

            {/* Action buttons */}
            <div className="flex items-center justify-between max-w-sm lg:max-w-md mt-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  router.push('/post/' + post.id)
                }}
                aria-label={`Reply to post. ${replies.length || 0} replies`}
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                <span className="text-xs lg:text-sm">{replies.length || 0}</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  onRepost?.(post.id, post.is_reposted)
                }}
                disabled={repostLoading}
                aria-label={`Repost. ${post.reposts_count || 0} reposts`}
              >
                {repostLoading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Repeat2 className="h-4 w-4 mr-1" />
                )}
                <span className="text-xs lg:text-sm">{post.reposts_count || 0}</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className={`rounded-full transition-colors ${
                  post.is_liked 
                    ? 'text-red-500 hover:text-red-600 hover:bg-red-50' 
                    : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                }`}
                onClick={(e) => {
                  e.stopPropagation()
                  onLike?.(post.id, post.is_liked)
                }}
                aria-label={`Like post. ${post.likes_count || 0} likes`}
              >
                <Heart className={`h-4 w-4 mr-1 ${post.is_liked ? 'fill-current' : ''}`} />
                <span className="text-xs lg:text-sm">{post.likes_count || 0}</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  // Share functionality
                }}
                aria-label="Share post"
              >
                <Share className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Reply previews */}
        {replies.length > 0 && (
          <div className="mt-2 ml-[10px] pl-3">
            <div className="space-y-2">
              {previewReplies.map((reply, index) => (
                <ReplyPreview 
                  key={reply.id} 
                  reply={reply} 
                  index={index}
                  total={replies.length}
                />
              ))}
            </div>
            
            {hasMoreReplies && (
              <button
                className="text-blue-600 hover:text-blue-800 hover:underline text-sm mt-3 flex items-center gap-1 transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  router.push(`/post/${post.id}`)
                }}
              >
                <MessageCircle className="h-4 w-4" />
                See {replies.length - 2} more replies...
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  )
}