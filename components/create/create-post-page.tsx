"use client"

import { useState, useRef, useCallback } from "react"
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

      // Validate files first
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
        // Create preview URLs first
        const newMediaFiles: MediaFile[] = validFiles.map((file) => ({
          id: Math.random().toString(36).substr(2, 9),
          file,
          preview: URL.createObjectURL(file),
          type: file.type.startsWith("video/") ? "video" : "image",
          uploading: true,
        }))

        // Update state immediately for better UX
        setMediaFiles((prev) => [...prev, ...newMediaFiles])

        // Upload files to Supabase storage
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

            // Get public URL
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

        // Update URLs with actual Supabase URLs
        setMediaFiles((prev) => {
          const updated = [...prev]
          uploadResults.forEach((result, index) => {
            if (result.status === "fulfilled") {
              const targetIndex = result.value.originalIndex
              if (updated[targetIndex]) {
                // Clean up blob URL
                URL.revokeObjectURL(updated[targetIndex].preview)
                updated[targetIndex].preview = result.value.publicUrl
                updated[targetIndex].uploading = false
              }
            }
          })
          return updated
        })

        // Check for any failed uploads
        const failedUploads = uploadResults.filter((result) => result.status === "rejected")
        if (failedUploads.length > 0) {
          const errorMessages = failedUploads.map((result, index) => `File ${index + 1}: ${result.reason}`)
          setError(`Some uploads failed: ${errorMessages.join("; ")}`)
        }
      } catch (err: any) {
        console.error("Media upload error:", err)
        setError(err.message || "Failed to upload media. Please try again.")

        // Clean up any blob URLs on error
        mediaFiles.forEach((media) => {
          if (media.preview.startsWith("blob:")) {
            URL.revokeObjectURL(media.preview)
          }
        })

        // Reset media files on error
        setMediaFiles([])
      } finally {
        setIsUploadingMedia(false)
        // Reset file input
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

      // Set cursor position after inserted text
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

      // Check if any media is still uploading
      const hasUploadingMedia = mediaFiles.some((media) => media.uploading)
      if (hasUploadingMedia) {
        setError("Please wait for media uploads to complete")
        return
      }

      // Extract hashtags from content
      const hashtags = content.match(/#[a-zA-Z0-9_\u0980-\u09FF]+/g) || []

      // Prepare media URLs (combine uploaded files and Giphy media)
      const uploadedMediaUrls = mediaFiles.filter((media) => !media.uploading).map((media) => media.preview)
      const giphyUrls = giphyMedia.map((gif) => gif.url)
      const allMediaUrls = [...uploadedMediaUrls, ...giphyUrls]

      // Determine media type
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

      // Process hashtags
      for (const hashtag of hashtags) {
        const tagName = hashtag.slice(1) // Remove # symbol
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
          // Don't fail the entire post for hashtag errors
        }
      }

      // Clean up blob URLs
      mediaFiles.forEach((media) => {
        if (media.preview.startsWith("blob:")) {
          URL.revokeObjectURL(media.preview)
        }
      })

      // Redirect to dashboard
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => router.back()} className="hover:bg-gray-100">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">New Post</h1>
                
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="hidden sm:flex">
                Draft
              </Badge>
              <Button
                onClick={handlePost}
                disabled={isPosting || (!content.trim() && totalMediaCount === 0) || isOverLimit}
                className="rounded-full bg-gray-800 text-white font-medium px-6"
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
        {/* Main Compose Card */}
        <Card className="bg-white/70 backdrop-blur-sm border-0">
          <CardHeader className="pb-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12 ring-2 ring-gray-200">
                <AvatarImage src={user?.user_metadata?.avatar_url || "/placeholder.svg"} />
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

                {/* Privacy Selector */}
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
            {/* Text Area */}
            <div className="relative">
              <Textarea
                ref={textareaRef}
                placeholder="What's happening?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[120px] text-lg border-0 resize-none focus-visible:ring-0 bg-transparent placeholder:text-gray-400"
                disabled={isPosting}
              />

              {/* Character Count */}
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <div className="relative w-8 h-8">
                  <Progress value={Math.min(progressPercentage, 100)} className="w-8 h-8 rotate-[-90deg]" />
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

            {/* Media Preview */}
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
                  {/* Regular media files */}
                  {mediaFiles.map((media) => (
                    <div key={media.id} className="relative group">
                      <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                        {media.type === "image" ? (
                          <img
                            src={media.preview || "/placeholder.svg"}
                            alt="Preview"
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                            onClick={() => setSelectedImage(media.preview)}
                          />
                        ) : (
                          <VideoPlayer src={media.preview} className="w-full h-full object-cover" muted={true} />
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

                  {/* Giphy media */}
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

            {/* Giphy Picker */}
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

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            <Separator />

            {/* Action Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertText("#")}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-3 rounded-full transition-colors"
                  disabled={isPosting}
                  title="Add hashtag"
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
                  title="Mention someone"
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
                  title="Add media"
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
                  title="Add GIF"
                >
                  <Smile className="h-5 w-5" />
                </Button>

                {totalMediaCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {totalMediaCount}/4 media
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

        {/* Pro Tips Card 
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">💡 Pro Tips</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Use hashtags (#) to reach more people</li>
                  <li>• Mention others (@) to start conversations</li>
                  <li>• Add media to make your posts more engaging</li>
                  <li>• Keep it under 280 characters for better engagement</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>**/}
      </div>

      {/* Image Viewer */}
      {selectedImage && (
        <ImageViewer
          src={selectedImage || "/placeholder.svg"}
          alt="Preview"
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}

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
