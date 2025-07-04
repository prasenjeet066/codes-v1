"use client"

import { useState, useRef, useCallback, useMemo } from "react"
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

interface User {
  id: string
  user_metadata: {
    avatar_url?: string
    full_name?: string
    username?: string
  }
}

interface CreatePostPageProps {
  user: User
}

interface MediaFile {
  id: string
  file?: File
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

  const characterCount = useMemo(() => content.length, [content])
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
        setError(`You can only upload up to ${MAX_MEDIA_FILES} media files`)
        return
      }

      setIsUploadingMedia(true)
      setError("")

      try {
        const newMediaFiles: MediaFile[] = validFiles.map((file) => ({
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
          type: file.type.startsWith("video/") ? "video" : "image",
          uploading: true,
        }))

        setMediaFiles((prev) => [...prev, ...newMediaFiles])

        const uploadPromises = validFiles.map(async (file, index) => {
          const fileExt = file.name.split(".").pop()?.toLowerCase()
          const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`
          const filePath = `posts/${user.id}/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from("post-media")
            .upload(filePath, file, {
              cacheControl: "3600",
              upsert: false,
            })

          if (uploadError) {
            throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`)
          }

          const { data: urlData } = supabase.storage
            .from("post-media")
            .getPublicUrl(filePath)

          if (!urlData?.publicUrl) {
            throw new Error(`Failed to get public URL for ${file.name}`)
          }

          return {
            originalIndex: mediaFiles.length + index,
            publicUrl: urlData.publicUrl,
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
                delete updated[targetIndex].file // Remove file to reduce memory usage
              }
            }
          })
          return updated
        })

        const failedUploads = uploadResults.filter((result) => result.status === "rejected")
        if (failedUploads.length > 0) {
          const errorMessages = failedUploads.map((result: any, index) => `File ${index + 1}: ${result.reason}`)
          setError(`Some uploads failed: ${errorMessages.join("; ")}`)
        }
      } catch (err: any) {
        setError(err.message || "Failed to upload media. Please try again.")
        setMediaFiles((prev) => {
          prev.forEach((media) => {
            if (media.preview.startsWith("blob:")) {
              URL.revokeObjectURL(media.preview)
            }
          })
          return []
        })
      } finally {
        setIsUploadingMedia(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }
    },
    [mediaFiles.length, totalMediaCount, user.id],
  )

  const removeMediaFile = useCallback((id: string) => {
    setMediaFiles((prev) => {
      const file = prev.find((f) => f.id === id)
      if (file && file.preview.startsWith("blob:")) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter((f) => f.id !== id)
    })
  }, [])

  const handleGiphySelect = useCallback((gif: any, type: "gif" | "sticker") => {
    if (totalMediaCount >= MAX_MEDIA_FILES) {
      setError(`You can only add up to ${MAX_MEDIA_FILES} media items`)
      return
    }

    setGiphyMedia((prev) => [
      ...prev,
      {
        url: gif.images.original.url,
        type,
        id: gif.id,
      },
    ])
    setShowGiphyPicker(false)
    setError("")
  }, [totalMediaCount])

  const removeGiphyMedia = useCallback((index: number) => {
    setGiphyMedia((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const insertText = useCallback((text: string) => {
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
  }, [content])

  const handlePost = useCallback(async () => {
    if (!content.trim() && totalMediaCount === 0) {
      setError("Please add some content or media to your post.")
      return
    }

    if (isOverLimit) {
      setError(`Please keep your post under ${MAX_CHARACTERS} characters.`)
      return
    }

    if (mediaFiles.some((media) => media.uploading)) {
      setError("Please wait for media uploads to complete")
      return
    }

    setIsPosting(true)
    setError("")

    try {
      const validatedData = createPostSchema.parse({ content })
      const hashtags = content.match(/#[a-zA-Z0-9_\u0980-\u09FF]+/g) || []
      const uploadedMediaUrls = mediaFiles.filter((media) => !media.uploading).map((media) => media.preview)
      const giphyUrls = giphyMedia.map((gif) => gif.url)
      const allMediaUrls = [...uploadedMediaUrls, ...giphyUrls]

      const mediaType = allMediaUrls.length > 0
        ? mediaFiles.some((media) => media.type === "video")
          ? "video"
          : giphyMedia.length > 0
            ? "gif"
            : "image"
        : null

      const { data: postData, error: postError } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          content: validatedData.content,
          media_urls: allMediaUrls.length > 0 ? allMediaUrls : null,
          media_type: mediaType,
          privacy,
        })
        .select()
        .single()

      if (postError) {
        throw new Error(postError.message)
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
            await supabase
              .from("post_hashtags")
              .insert({ post_id: postData.id, hashtag_id: hashtagData.id })
          }
        } catch (hashtagErr) {
          console.warn(`Error processing hashtag ${tagName}:`, hashtagErr)
        }
      }

      mediaFiles.forEach((media) => {
        if (media.preview.startsWith("blob:")) {
          URL.revokeObjectURL(media.preview)
        }
      })

      router.push("/dashboard")
    } catch (err: any) {
      setError(err.message || "An error occurred while submitting the post.")
    } finally {
      setIsPosting(false)
    }
  }, [content, mediaFiles, giphyMedia, privacy, router, user.id, isOverLimit, totalMediaCount])

  const privacyOptions = useMemo(() => [
    { value: "public", label: "Public", icon: Globe, description: "Anyone can see this post" },
    { value: "followers", label: "Followers", icon: Users, description: "Only your followers can see this" },
    { value: "private", label: "Private", icon: Lock, description: "Only you can see this post" },
  ], [])

  const remainingChars = MAX_CHARACTERS - characterCount

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="hover:bg-gray-100"
                aria-label="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Create Post</h1>
                <p className="text-sm text-gray-500">Share what's on your mind</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="hidden sm:flex">
                Draft
              </Badge>
              <Button
                onClick={handlePost}
                disabled={isPosting || (!content.trim() && totalMediaCount === 0) || isOverLimit}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium px-6"
                aria-label="Post content"
              >
                {isPosting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  "Post"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12 ring-2 ring-gray-200">
                <AvatarImage src={user?.user_metadata?.avatar_url || "/placeholder.svg"} alt="User avatar" />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                  {user?.user_metadata?.full_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-gray-900">
                    {user?.user_metadata?.full_name || "Anonymous User"}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    @{user?.user_metadata?.username || "user"}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  {privacyOptions.map((option) => {
                    const Icon = option.icon
                    return (
                      <Button
                        key={option.value}
                        variant={privacy === option.value ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setPrivacy(option.value as any)}
                        className="h-7 px-2 text-xs"
                        aria-label={`Set privacy to ${option.label}`}
                        title={option.description}
                      >
                        <Icon className="h-3 w-3 mr-1" />
                        {option.label}
                      </Button>
                    )
                  })}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                placeholder="What's happening?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[120px] text-lg border-0 resize-none focus-visible:ring-0 bg-transparent placeholder:text-gray-400"
                disabled={isPosting}
                aria-label="Post content"
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <div className="relative w-8 h-8">
                  <Progress
                    value={Math.min(progressPercentage, 100)}
                    className={`w-8 h-8 rotate-[-90deg] ${getProgressColor()}`}
                    aria-label="Character count progress"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span
                      className={`text-xs font-medium ${
                        isOverLimit ? "text-red-600" : progressPercentage > 80 ? "text-yellow-600" : "text-gray-500"
                      }`}
                    >
                      {remainingChars}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {(mediaFiles.length > 0 || giphyMedia.length > 0) && (
              <div className="space-y-3">
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Media ({totalMediaCount}/{MAX_MEDIA_FILES})
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {mediaFiles.filter((f) => f.type === "image").length} images,{" "}
                    {mediaFiles.filter((f) => f.type === "video").length} videos, {giphyMedia.length} GIFs
                  </Badge>
                </div>
                <div
                  className={`grid gap-3 ${
                    totalMediaCount === 1
                      ? "grid-cols-1"
                      : totalMediaCount === 2
                        ? "grid-cols-2"
                        : "grid-cols-2 sm:grid-cols-3"
                  }`}
                >
                  {mediaFiles.map((media) => (
                    <div key={media.id} className="relative group">
                      <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                        {media.type === "image" ? (
                          <img
                            src={media.preview || "/placeholder.svg"}
                            alt="Media preview"
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                            onClick={() => setSelectedImage(media.preview)}
                          />
                        ) : (
                          <VideoPlayer
                            src={media.preview}
                            className="w-full h-full object-cover"
                            muted={true}
                            aria-label="Video preview"
                          />
                        )}
                        {media.uploading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="text-center text-white">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                              <p className="text-sm">Uploading...</p>
                            </div>
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeMediaFile(media.id)}
                          aria-label="Remove media"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <Badge
                          variant="secondary"
                          className="absolute bottom-2 left-2 text-xs bg-black/70 text-white border-0"
                        >
                          {media.type === "video" ? <Video className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {giphyMedia.map((gif, index) => (
                    <div key={`gif-${index}`} className="relative group">
                      <div className="relative aspect-square rounded-lg overflow-hidden">
                        <img
                          src={gif.url || "/placeholder.svg"}
                          alt={`${gif.type} ${index + 1}`}
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                          onClick={() => setSelectedImage(gif.url)}
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeGiphyMedia(index)}
                          aria-label="Remove GIF"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <Badge className="absolute bottom-2 left-2 bg-black/70 text-white border-0 text-xs">
                          {gif.type.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showGiphyPicker && (
              <div className="space-y-3">
                <Separator />
                <div className="rounded-xl border bg-gray-50 p-4">
                  <GiphyPicker
                    onGifSelect={(gif) => handleGiphySelect(gif, "gif")}
                    onStickerSelect={(sticker) => handleGiphySelect(sticker, "sticker")}
                    onClose={() => setShowGiphyPicker(false)}
                  />
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertText("#")}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-3 rounded-full transition-colors"
                  disabled={isPosting}
                  aria-label="Add hashtag"
                >
                  <Hash className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertText("@")}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-3 rounded-full transition-colors"
                  disabled={isPosting}
                  aria-label="Mention someone"
                >
                  <AtSign className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-3 rounded-full transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingMedia || totalMediaCount >= MAX_MEDIA_FILES || isPosting}
                  aria-label="Add media"
                >
                  {isUploadingMedia ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-3 rounded-full transition-colors"
                  onClick={() => setShowGiphyPicker(!showGiphyPicker)}
                  disabled={totalMediaCount >= MAX_MEDIA_FILES || isPosting}
                  aria-label="Add GIF"
                >
                  <Smile className="h-5 w-5" />
                </Button>
                {totalMediaCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {totalMediaCount}/{MAX_MEDIA_FILES} media
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {characterCount > 0 && (
                  <Badge variant={isOverLimit ? "destructive" : "secondary"} className="text-xs">
                    {characterCount}/{MAX_CHARACTERS}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">💡 Pro Tips</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>Use hashtags (#) to reach more people</li>
                  <li>Mention others (@) to start conversations</li>
                  <li>Add media to make your posts more engaging</li>
                  <li>Keep it under 280 characters for better engagement</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedImage && (
        <ImageViewer
          src={selectedImage || "/placeholder.svg"}
          alt="Preview"
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}

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
        aria-label="Upload media files"
      />
    </div>
  )
}