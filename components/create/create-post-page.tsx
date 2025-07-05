"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase/client"
import { createPostSchema } from "@/lib/validations/post"
import { VideoPlayer } from "@/components/media/video-player"
import { ImageViewer } from "@/components/media/image-viewer"
import { GiphyPicker } from "@/components/giphy/giphy-picker"
import {
  ArrowLeft,
  ImageIcon,
  Video,
  Smile,
  Hash,
  AtSign,
  X,
  Loader2,
  Sparkles,
  Users,
  Globe,
  Lock,
  AlertCircle,
} from "lucide-react"

const MAX_CHARACTERS = 280
const MAX_MEDIA_FILES = 4

interface CreatePostPageProps {
  user: any
}

interface MediaFile {
  id: string
  file: File
  preview: string
  type: "image" | "video"
  uploading?: boolean
}

interface GiphyMedia {
  url: string
  type: "gif" | "sticker"
  id: string
}

export function CreatePostPage({ user }: CreatePostPageProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [content, setContent] = useState("")
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [giphyMedia, setGiphyMedia] = useState<GiphyMedia[]>([])
  const [isPosting, setIsPosting] = useState(false)
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const [error, setError] = useState("")
  const [showGiphyPicker, setShowGiphyPicker] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [privacy, setPrivacy] = useState<"public" | "followers" | "private">("public")

  const characterCount = content.length
  const isOverLimit = characterCount > MAX_CHARACTERS
  const progressPercentage = (characterCount / MAX_CHARACTERS) * 100
  const totalMediaCount = mediaFiles.length + giphyMedia.length

  const getProgressColor = () => {
    if (progressPercentage < 70) return "bg-green-500"
    if (progressPercentage < 90) return "bg-yellow-500"
    return "bg-red-500"
  }

  const validateMediaFile = (file: File): string | null => {
    const maxSize = 50 * 1024 * 1024 // 50MB
    const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    const allowedVideoTypes = ["video/mp4", "video/webm", "video/mov", "video/avi"]

    if (file.size > maxSize) {
      return "File size must be less than 50MB"
    }

    if (!allowedImageTypes.includes(file.type) && !allowedVideoTypes.includes(file.type)) {
      return "Only images (JPEG, PNG, GIF, WebP) and videos (MP4, WebM, MOV, AVI) are allowed"
    }

    return null
  }

  const handleMediaUpload = useCallback(
    async (files: FileList) => {
      if (files.length === 0) return

      const validationErrors: string[] = []
      const validFiles: File[] = []

      Array.from(files).forEach((file, index) => {
        const error = validateMediaFile(file)
        if (error) {
          validationErrors.push(`File ${index + 1}: ${error}`)
        } else {
          validFiles.push(file)
        }
      })

      if (validationErrors.length > 0) {
        setError(validationErrors.join("; "))
        return
      }

      if (totalMediaCount + validFiles.length > MAX_MEDIA_FILES) {
        setError("You can only upload up to 4 media files")
        return
      }

      setIsUploadingMedia(true)
      setError("")

      try {
        const newMediaFiles: MediaFile[] = validFiles.map((file) => ({
          id: Math.random().toString(36).substr(2, 9),
          file,
          preview: URL.createObjectURL(file),
          type: file.type.startsWith("video/") ? "video" : "image",
          uploading: true,
        }))

        setMediaFiles((prev) => [...prev, ...newMediaFiles])

        const uploadPromises = validFiles.map(async (file, index) => {
          try {
            const fileExt = file.name.split(".").pop()?.toLowerCase()
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
            const filePath = `posts/${user.id}/${fileName}`

            const { data, error: uploadError } = await supabase.storage.from("post-media").upload(filePath, file, {
              cacheControl: "3600",
              upsert: false,
            })

            if (uploadError) {
              throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`)
            }

            const { data: urlData } = supabase.storage.from("post-media").getPublicUrl(filePath)

            if (!urlData?.publicUrl) {
              throw new Error(`Failed to get public URL for ${file.name}`)
            }

            return {
              originalIndex: mediaFiles.length + index,
              publicUrl: urlData.publicUrl,
            }
          } catch (err) {
            console.error(`Error processing file ${file.name}:`, err)
            throw err
          }
        })

        const uploadResults = await Promise.allSettled(uploadPromises)

        setMediaFiles((prev) => {
          const updated = [...prev]
          uploadResults.forEach((result, index) => {
            if (result.status === "fulfilled") {
              const targetIndex = result.value.originalIndex
              if (updated[targetIndex]) {
                URL.revokeObjectURL(updated[targetIndex].preview)
                updated[targetIndex].preview = result.value.publicUrl
                updated[targetIndex].uploading = false
              }
            }
          })
          return updated
        })

        const failedUploads = uploadResults.filter((result) => result.status === "rejected")
        if (failedUploads.length > 0) {
          const errorMessages = failedUploads.map((result, index) => `File ${index + 1}: ${result.reason}`)
          setError(`Some uploads failed: ${errorMessages.join("; ")}`)
        }
      } catch (err: any) {
        console.error("Media upload error:", err)
        setError(err.message || "Failed to upload media. Please try again.")

        mediaFiles.forEach((media) => {
          if (media.preview.startsWith("blob:")) {
            URL.revokeObjectURL(media.preview)
          }
        })

        setMediaFiles([])
      } finally {
        setIsUploadingMedia(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }
    },
    [mediaFiles.length, totalMediaCount, user.id],
  )

  const removeMediaFile = (id: string) => {
    setMediaFiles((prev) => {
      const file = prev.find((f) => f.id === id)
      if (file && file.preview.startsWith("blob:")) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter((f) => f.id !== id)
    })
  }

  const handleGiphySelect = (gif: any, type: "gif" | "sticker") => {
    const giphyItem: GiphyMedia = {
      url: gif.images.original.url,
      type,
      id: gif.id,
    }

    if (totalMediaCount >= MAX_MEDIA_FILES) {
      setError("You can only add up to 4 media items")
      return
    }

    setGiphyMedia((prev) => [...prev, giphyItem])
    setShowGiphyPicker(false)
    setError("")
  }

  const removeGiphyMedia = (index: number) => {
    setGiphyMedia((prev) => prev.filter((_, i) => i !== index))
  }

  const insertText = (text: string) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart
      const end = textareaRef.current.selectionEnd

      const newContent = content.substring(0, start) + text + content.substring(end)
      setContent(newContent)

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + text.length
          textareaRef.current.focus()
        }
      }, 0)
    }
  }

  const handlePost = async () => {
    if (!content.trim() && totalMediaCount === 0) {
      setError("Please add some content or media to your post.")
      return
    }

    if (isOverLimit) {
      setError(`Please keep your post under ${MAX_CHARACTERS} characters.`)
      return
    }

    setIsPosting(true)
    setError("")

    try {
      const validatedData = createPostSchema.parse({ content })

      const hasUploadingMedia = mediaFiles.some((media) => media.uploading)
      if (hasUploadingMedia) {
        setError("Please wait for media uploads to complete")
        return
      }

      const hashtags = content.match(/#[a-zA-Z0-9_\u0980-\u09FF]+/g) || []

      const uploadedMediaUrls = mediaFiles.filter((media) => !media.uploading).map((media) => media.preview)
      const giphyUrls = giphyMedia.map((gif) => gif.url)
      const allMediaUrls = [...uploadedMediaUrls, ...giphyUrls]

      let mediaType = null
      if (allMediaUrls.length > 0) {
        if (mediaFiles.some((media) => media.type === "video")) {
          mediaType = "video"
        } else if (giphyMedia.length > 0) {
          mediaType = "gif"
        } else {
          mediaType = "image"
        }
      }

      const { data: postData, error: postError } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          content: validatedData.content,
          media_urls: allMediaUrls.length > 0 ? allMediaUrls : null,
          media_type: mediaType,
        })
        .select()
        .single()

      if (postError) {
        console.error("Post creation error:", postError)
        setError(postError.message)
        return
      }

      for (const hashtag of hashtags) {
        const tagName = hashtag.slice(1)
        try {
          const { data: hashtagData, error: hashtagError } = await supabase
            .from("hashtags")
            .upsert({ name: tagName }, { onConflict: "name" })
            .select()
            .single()

          if (!hashtagError && hashtagData) {
            await supabase.from("post_hashtags").insert({ post_id: postData.id, hashtag_id: hashtagData.id })
          }
        } catch (hashtagErr) {
          console.error(`Error processing hashtag ${tagName}:`, hashtagErr)
        }
      }

      mediaFiles.forEach((media) => {
        if (media.preview.startsWith("blob:")) {
          URL.revokeObjectURL(media.preview)
        }
      })

      router.push("/dashboard")
    } catch (err: any) {
      console.error("Post submission error:", err)
      setError(err.message || "An error occurred while submitting the post.")
    } finally {
      setIsPosting(false)
    }
  }

  const privacyOptions = [
    { value: "public", label: "Public", icon: Globe, description: "Anyone can see this post" },
    { value: "followers", label: "Followers", icon: Users, description: "Only your followers can see this" },
    { value: "private", label: "Private", icon: Lock, description: "Only you can see this post" },
  ]

  const remainingChars = MAX_CHARACTERS - characterCount

  // Highlight hashtags, mentions, and URLs
  const highlightContent = (text: string) => {
    // Match hashtags
    text = text.replace(/#([a-zA-Z0-9_\u0980-\u09FF]+)/g, '<span style="color: #1DA1F2; font-weight: bold;">$&</span>')
    // Match mentions
    text = text.replace(/@([a-zA-Z0-9_]+)/g, '<span style="color: #1DA1F2; font-weight: bold;">$&</span>')
    // Match URLs
    text = text.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: #1DA1F2; text-decoration: underline;">$&</a>'
    )
    return text
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-3 flex justify-between items-center">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Create Post</h1>
          <Button
            onClick={handlePost}
            disabled={isPosting || (!content.trim() && totalMediaCount === 0) || isOverLimit}
            className="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600"
          >
            {isPosting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Post"}
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {/* Main Compose Card */}
        <Card className="border-0 shadow-none">
          <CardHeader className="p-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.user_metadata?.avatar_url || "/placeholder.svg"} />
                <AvatarFallback>{user?.user_metadata?.full_name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{user?.user_metadata?.full_name || "Anonymous User"}</span>
                  <span className="text-gray-500 text-sm">@{user?.user_metadata?.username || "user"}</span>
                </div>
                <div className="flex gap-2 mt-2">
                  {privacyOptions.map((option) => {
                    const Icon = option.icon
                    return (
                      <Button
                        key={option.value}
                        variant={privacy === option.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPrivacy(option.value as any)}
                        className="text-xs"
                      >
                        <Icon className="h-4 w-4 mr-1" />
                        {option.label}
                      </Button>
                    )
                  })}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div
              className="w-full border-0 resize-none text-base placeholder-gray-500 focus:ring-0"
              style={{ minHeight: "72px" }}
              dangerouslySetInnerHTML={{ __html: highlightContent(content) }}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => setContent(e.currentTarget.textContent || "")}
            />
            <div className="flex justify-end mt-2">
              <span className={`text-sm ${isOverLimit ? "text-red-500" : "text-gray-500"}`}>
                {remainingChars}/{MAX_CHARACTERS}
              </span>
            </div>
            <div className="mt-4 flex justify-between items-center">
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploadingMedia || totalMediaCount >= MAX_MEDIA_FILES}>
                  <ImageIcon className="h-5 w-5 text-blue-500" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowGiphyPicker(true)} disabled={totalMediaCount >= MAX_MEDIA_FILES}>
                  <Smile className="h-5 w-5 text-blue-500" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => insertText("#")}>
                  <Hash className="h-5 w-5 text-blue-500" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => insertText("@")}>
                  <AtSign className="h-5 w-5 text-blue-500" />
                </Button>
              </div>
              <Button variant="outline" size="sm">Add to your post</Button>
            </div>
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleMediaUpload(e.target.files)
          }
        }}
      />
    </div>
  )
}
