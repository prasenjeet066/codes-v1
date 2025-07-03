"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase/client"
import { createPostSchema } from "@/lib/validations/post"
import { Loader2, ImageIcon, Smile, Hash, AtSign, X, AlertCircle } from "lucide-react"
import { VideoPlayer } from "@/components/media/video-player"
import { ImageViewer } from "@/components/media/image-viewer"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { GiphyPicker } from "@/components/giphy/giphy-picker"

interface CreatePostProps {
  userId: string
  replyTo?: string
  onPostCreated?: () => void
}

interface MediaFile {
  file: File
  url: string
  type: "image" | "video"
}

interface GiphyMedia {
  url: string
  type: "gif" | "sticker"
  id: string
}

export function CreatePost({ userId, replyTo, onPostCreated }: CreatePostProps) {
  const [content, setContent] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [giphyMedia, setGiphyMedia] = useState<GiphyMedia[]>([])
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const [showGiphyPicker, setShowGiphyPicker] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  // Improved media validation
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

  // Handle Giphy selection
  const handleGiphySelect = (gif: any, type: "gif" | "sticker") => {
    const giphyItem: GiphyMedia = {
      url: gif.images.original.url,
      type,
      id: gif.id,
    }

    // Check if we already have 4 media items (files + giphy)
    if (mediaFiles.length + giphyMedia.length >= 4) {
      setError("You can only add up to 4 media items")
      return
    }

    setGiphyMedia((prev) => [...prev, giphyItem])
    setShowGiphyPicker(false)
    setError("")
  }

  // Remove Giphy media
  const removeGiphyMedia = (index: number) => {
    setGiphyMedia((prev) => prev.filter((_, i) => i !== index))
  }

  // Improved handleMediaUpload with better error handling
  const handleMediaUpload = async (files: FileList) => {
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

    if (mediaFiles.length + giphyMedia.length + validFiles.length > 4) {
      setError("You can only upload up to 4 media files")
      return
    }

    setIsUploadingMedia(true)
    setError("")

    try {
      // Create preview URLs first
      const newMediaFiles: MediaFile[] = validFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file),
        type: file.type.startsWith("video/") ? "video" : "image",
      }))

      // Update state immediately for better UX
      setMediaFiles((prev) => [...prev, ...newMediaFiles])

      // Upload files to Supabase storage
      const uploadPromises = validFiles.map(async (file, index) => {
        try {
          const fileExt = file.name.split(".").pop()?.toLowerCase()
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
          const filePath = `posts/${userId}/${fileName}`

          console.log(`Uploading file: ${fileName}, Size: ${file.size}, Type: ${file.type}`)

          const { data, error: uploadError } = await supabase.storage.from("post-media").upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          })

          if (uploadError) {
            console.error(`Upload error for file ${fileName}:`, uploadError)
            throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`)
          }

          console.log(`Upload successful for ${fileName}:`, data)

          // Get public URL
          const { data: urlData } = supabase.storage.from("post-media").getPublicUrl(filePath)

          if (!urlData?.publicUrl) {
            throw new Error(`Failed to get public URL for ${file.name}`)
          }

          console.log(`Public URL for ${fileName}:`, urlData.publicUrl)

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
              URL.revokeObjectURL(updated[targetIndex].url)
              updated[targetIndex].url = result.value.publicUrl
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
        if (media.url.startsWith("blob:")) {
          URL.revokeObjectURL(media.url)
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
  }

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => {
      const updated = [...prev]
      const mediaToRemove = updated[index]

      // Clean up blob URL if it exists
      if (mediaToRemove.url.startsWith("blob:")) {
        URL.revokeObjectURL(mediaToRemove.url)
      }

      return updated.filter((_, i) => i !== index)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const validatedData = createPostSchema.parse({ content, replyTo })

      // Check if any media is still uploading
      const hasUploadingMedia = mediaFiles.some((media) => media.url.startsWith("blob:"))
      if (hasUploadingMedia) {
        setError("Please wait for media uploads to complete")
        return
      }

      // Extract hashtags from content
      const hashtags = content.match(/#[a-zA-Z0-9_\u0980-\u09FF]+/g) || []

      // Prepare media URLs (combine uploaded files and Giphy media)
      const uploadedMediaUrls = mediaFiles.filter((media) => !media.url.startsWith("blob:")).map((media) => media.url)
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
          user_id: userId,
          content: validatedData.content,
          reply_to: validatedData.replyTo || null,
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
        if (media.url.startsWith("blob:")) {
          URL.revokeObjectURL(media.url)
        }
      })

      // Reset form
      setContent("")
      setMediaFiles([])
      setGiphyMedia([])
      setError("")
      onPostCreated?.()
    } catch (err: any) {
      console.error("Post submission error:", err)
      setError(err.message || "An error occurred while submitting the post.")
    } finally {
      setIsLoading(false)
    }
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

  const remainingChars = 280 - content.length
  const totalMediaCount = mediaFiles.length + giphyMedia.length

  return (
    <div className="flex flex-col w-full">
    <div className="border-b p-3 lg:p-4 bengali-font h-auto bg-white">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-2 lg:gap-3">
          <Avatar className="cursor-pointer h-10 w-10 lg:h-12 lg:w-12">
            <AvatarFallback>{"U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            {replyTo && (
              <div className="mb-2 text-sm text-gray-600">
                <span>Replying to </span>
                <a href={`/profile/${replyTo}`} className="text-blue-600 hover:underline">
                  @{replyTo}
                </a>
              </div>
            )}

            <Textarea
              ref={textareaRef}
              placeholder="কী ঘটছে?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="border-none resize-none text-lg lg:text-xl placeholder:text-lg lg:placeholder:text-xl focus-visible:ring-0 p-0"
              rows={3}
              disabled={isLoading}
            />

            {/* Media preview */}
            {(mediaFiles.length > 0 || giphyMedia.length > 0) && (
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg overflow-hidden">
                {/* Regular media files */}
                {mediaFiles.map((media, index) => (
                  <div key={`media-${index}`} className="relative">
                    {media.type === "video" ? (
                      <VideoPlayer src={media.url} className="w-full h-32 rounded" muted={true} />
                    ) : (
                      <img
                        src={media.url || "/placeholder.svg"}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-32 object-cover rounded cursor-pointer hover:opacity-90"
                        onClick={() => setSelectedImage(media.url)}
                      />
                    )}
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => removeMedia(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    {media.url.startsWith("blob:") && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded">
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Giphy media */}
                {giphyMedia.map((gif, index) => (
                  <div key={`gif-${index}`} className="relative">
                    <img
                      src={gif.url || "/placeholder.svg"}
                      alt={`${gif.type} ${index + 1}`}
                      className="w-full h-32 object-cover rounded cursor-pointer hover:opacity-90"
                      onClick={() => setSelectedImage(gif.url)}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => removeGiphyMedia(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1 rounded">
                      {gif.type.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Image Viewer */}
            {selectedImage && (
              <ImageViewer
                src={selectedImage || "/placeholder.svg"}
                alt="Preview"
                isOpen={!!selectedImage}
                onClose={() => setSelectedImage(null)}
              />
            )}

            {/* Giphy Picker */}
            

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="mt-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between mt-3 lg:mt-4">
              <div className="flex items-center gap-1 lg:gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertText("#")}
                  className="text-blue-600 hover:bg-blue-50 p-2"
                  disabled={isLoading}
                >
                  <Hash className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertText("@")}
                  className="text-blue-600 hover:bg-blue-50 p-2"
                  disabled={isLoading}
                >
                  <AtSign className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:bg-blue-50 p-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingMedia || totalMediaCount >= 4 || isLoading}
                >
                  {isUploadingMedia ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:bg-blue-50 p-2"
                  onClick={() => setShowGiphyPicker(!showGiphyPicker)}
                  disabled={totalMediaCount >= 4 || isLoading}
                >
                  <Smile className="h-4 w-4" />
                </Button>
                <span className={`text-sm ml-2 ${remainingChars < 20 ? "text-red-500" : "text-gray-500"}`}>
                  {remainingChars}
                </span>
              </div>

              <Button
                type="submit"
                disabled={!content.trim() || remainingChars < 0 || isLoading || isUploadingMedia}
                className="rounded-full ml-2 px-4 lg:px-6 text-sm lg:text-base"
                size="sm"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                পোস্ট করুন
              </Button>
            </div>
          </div>
        </div>
      </form>

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
      {showGiphyPicker && (
              <div className="mt-3 w-full h-full">
                <GiphyPicker
                  onGifSelect={(gif) => handleGiphySelect(gif, "gif")}
                  onStickerSelect={(sticker) => handleGiphySelect(sticker, "sticker")}
                  onClose={() => setShowGiphyPicker(false)}
                />
              </div>
            )}
    </div>
  )
}
