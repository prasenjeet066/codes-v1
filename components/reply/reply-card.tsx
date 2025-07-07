"use client"

import { useState, useCallback, useMemo } from "react"
import { formatDistanceToNow } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Heart, Loader2, MessageCircle, Languages, Repeat2, Share, Pin, AlertCircle } from "lucide-react"
import Link from "next/link"
//import { ReplyDialog } from "@/components/dashboard/reply-dialog"
//import { PostActionsMenu } from "@/components/dashboard/post-actions-menu"
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
  
  // Try to break at sentence boundary
  const sentences = text.match(/[^\.!?]+[\.!?]+/g)
  if (sentences) {
    let truncated = ""
    for (const sentence of sentences) {
      if ((truncated + sentence).length > maxLength) break
      truncated += sentence
    }
    if (truncated.length > 0) return truncated.trim() + "..."
  }
  
  // Fallback to word boundary
  const words = text.split(' ')
  let truncated = ""
  for (const word of words) {
    if ((truncated + word + " ").length > maxLength) break
    truncated += word + " "
  }
  
  return truncated.trim() + "..."
}

export function ReplyCard({ post, currentUserId, currentUser }) {
  const [showReplyDialog, setShowReplyDialog] = useState(false)
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
  
  const MAX_LENGTH = 100
  const shouldTrim = !isPostPage && post.content.length > MAX_LENGTH
  const displayContent = shouldTrim ? smartTruncate(post.content, MAX_LENGTH) : post.content
  
  // Translation function with better error handling
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

  // Enhanced content formatting with better security
  const formatContent = useCallback((content: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g

    // Sanitize content first
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

  // Enhanced translation handler
  const handlePostTranslate = useCallback(async () => {
    if (translation.isTranslating) return
    
    setTranslation(prev => ({
      ...prev,
      isTranslating: true,
      error: null
    }))

    try {
      const translatedText = await translateText(post.content, translation.targetLang)
      setTranslation(prev => ({
        ...prev,
        isTranslating: false,
        translatedText,
        error: null
      }))
    } catch (error) {
      setTranslation(prev => ({
        ...prev,
        isTranslating: false,
        error: error instanceof Error ? error.message : "Translation failed"
      }))
    }
  }, [post.content, translation.targetLang, translation.isTranslating, translateText])

  // Toggle between original and translated text
  const handleToggleTranslation = useCallback(() => {
    if (translation.translatedText) {
      setTranslation(prev => ({
        ...prev,
        translatedText: null,
        error: null
      }))
    } else {
      handlePostTranslate()
    }
  }, [translation.translatedText, handlePostTranslate])

  // Reply handler
  const handleReplyClick = useCallback(() => {
    router.push(`/post/${post.id}`)
  }, [router, post.id])

  // Enhanced repost handler with better error handling
  
  // Enhanced media rendering with loading states
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
              // You might want to show a fallback image here
            }}
          />
        </div>
      )
    }

    if (mediaType === "gif") {
      return (
        <div className={`mt-3 grid gap-2 ${mediaUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {mediaUrls.slice(0, 4).map((url, index) => (
            <div key={index} className="relative group">
              <img
                src={url || "/placeholder.svg"}
                alt={`GIF media ${index + 1}`}
                className="w-full h-32 lg:h-48 object-cover cursor-pointer hover:opacity-90 rounded transition-opacity"
                onClick={(e) => handleMediaClick(url, e)}
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = "/placeholder.svg"
                }}
              />
              {url.includes("giphy.com") && (
                <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  GIF
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded" />
            </div>
          ))}
        </div>
      )
    }

    // Default: images
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

  // Enhanced post click handler
  
  // Determine what content to display
  const contentToDisplay = translation.translatedText || displayContent

  return (
    <>
      <article 
        className="hover:bg-gray-50 transition-colors cursor-pointer"
        
        aria-label={`Post by ${post.display_name}`}
      >
        <div className="p-4">
          {/* Repost header */}
         

          <div className="flex gap-3">
            <Link 
              href={`/profile/${post.username}`} 
              className="flex-shrink-0" 
              onClick={(e) => e.stopPropagation()}
            >
              <Avatar className="cursor-pointer h-10 w-10 lg:h-12 lg:w-12 ring-2 ring-transparent hover:ring-blue-200 transition-all">
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
                <div className="flex flex-row items-center gap-1 -mt-2">
                  <span className="text-gray-500 text-[10px]">@{post.username}</span>
                  <span className="text-gray-500 text-[10px]">·</span>
                  <time className="text-gray-500 text-[10px]" dateTime={post.created_at}>
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </time>
                </div>
              </div>
              <div className="flex flex-row items-center justify-start h-full">
                <hr className="h-[50px] w-[5px] border-none bg-none border-l-4 border-gray-600 rounded-bl-lg -ml-4"/>
              
              <div>
                
                
              {/* Post content */}
              {post.content && (
                <div className="mt-2 mb-3">
                  <div
                    className="text-gray-900 whitespace-pre-wrap text-sm lg:text-base leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: formatContent(contentToDisplay) }}
                  />
                  
                  {/* Show more button */}
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

              {/* Translation controls */}
              

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
               
              </div>
              </div>
              </div>
            </div>
          </div>

        <div className="text-sm p-2 pl-4 ">
          Show more replies…
        </div>
        </div>
        
      </article>
    </>
  )
  }
