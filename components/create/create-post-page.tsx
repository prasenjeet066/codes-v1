"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { 
  X, 
  Camera, 
  BarChart3, 
  Heart, 
  AlertCircle, 
  Calendar,
  Plus,
  Loader2,
  Hash,
  AtSign,
  Smile,
  ImageIcon,
  Video,
  Globe,
  Users,
  Lock
} from "lucide-react"
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
const MAX_CHARACTERS = 280
const MAX_MEDIA_FILES = 4

interface MediaFile {
  id: string
  file: File
  preview: string
  type: "image" | "video"
  uploading: boolean
  uploadProgress: number
}

interface GiphyMedia {
  url: string
  type: "gif" | "sticker"
  id: string
}

interface User {
  id: string
  user_metadata: {
    full_name: string
    username: string
    avatar_url: string | null
  }
}

export default function CreatePostPage({user}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const contentEditableRef = useRef<HTMLDivElement>(null)
  const giphySearchRef = useRef<HTMLInputElement>(null)

  const [content, setContent] = useState("")
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [giphyMedia, setGiphyMedia] = useState<GiphyMedia[]>([])
  const [isPosting, setIsPosting] = useState(false)
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const [error, setError] = useState("")
  const [showGiphyPicker, setShowGiphyPicker] = useState(false)
  const [giphySearch, setGiphySearch] = useState("")
  const [giphyResults, setGiphyResults] = useState<GiphyMedia[]>([])
  const [privacy, setPrivacy] = useState<"public" | "followers" | "private">("public")

  const characterCount = content.length
  const isOverLimit = characterCount > MAX_CHARACTERS
  const progressPercentage = (characterCount / MAX_CHARACTERS) * 100
  const totalMediaCount = mediaFiles.length + giphyMedia.length

  const user: User = {
    id: "1",
    user_metadata: {
      full_name: "Martin Kenter",
      username: "martinkenter",
      avatar_url: null
    }
  }

  const postOptions = [
    { 
      icon: Camera, 
      label: 'Photo/Video', 
      color: 'bg-blue-100 text-blue-600', 
      action: () => fileInputRef.current?.click(),
      ariaLabel: 'Add photo or video'
    },
    { 
      icon: BarChart3, 
      label: 'Poll', 
      color: 'bg-green-100 text-green-600', 
      action: () => console.log('Poll clicked'),
      ariaLabel: 'Create poll'
    },
    { 
      icon: Heart, 
      label: 'Adoption', 
      color: 'bg-red-100 text-red-600', 
      action: () => console.log('Adoption clicked'),
      ariaLabel: 'Create adoption post'
    },
    { 
      icon: AlertCircle, 
      label: 'Lost Notice', 
      color: 'bg-yellow-100 text-yellow-600', 
      action: () => console.log('Lost Notice clicked'),
      ariaLabel: 'Create lost notice'
    },
    { 
      icon: Calendar, 
      label: 'Event', 
      color: 'bg-purple-100 text-purple-600', 
      action: () => console.log('Event clicked'),
      ariaLabel: 'Create event'
    }
  ]

  const privacyOptions = [
    { value: "public", label: "Public", icon: Globe, ariaLabel: "Set post visibility to public" },
    { value: "followers", label: "Followers", icon: Users, ariaLabel: "Set post visibility to followers only" },
    { value: "private", label: "Private", icon: Lock, ariaLabel: "Set post visibility to private" }
  ]

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
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
          type: file.type.startsWith("video/") ? "video" : "image",
          uploading: true,
          uploadProgress: 0
        }))

        setMediaFiles((prev) => [...prev, ...newMediaFiles])

        newMediaFiles.forEach((media) => {
          let progress = 0
          const interval = setInterval(() => {
            progress += 10
            setMediaFiles((prev) =>
              prev.map((m) =>
                m.id === media.id ? { ...m, uploadProgress: progress } : m
              )
            )
            if (progress >= 100) {
              setMediaFiles((prev) =>
                prev.map((m) =>
                  m.id === media.id ? { ...m, uploading: false } : m
                )
              )
              clearInterval(interval)
            }
          }, 200)
        })
      } catch (err: any) {
        setError(err.message || "Failed to upload media. Please try again.")
      } finally {
        setIsUploadingMedia(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }
    },
    [totalMediaCount]
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

  const handleGiphySelect = (gif: GiphyMedia) => {
    if (totalMediaCount >= MAX_MEDIA_FILES) {
      setError("You can only add up to 4 media items")
      return
    }

    setGiphyMedia((prev) => [...prev, gif])
    setShowGiphyPicker(false)
    setGiphySearch("")
    setError("")
  }

  const removeGiphyMedia = (id: string) => {
    setGiphyMedia((prev) => prev.filter((gif) => gif.id !== id))
  }

  const insertText = (text: string) => {
    if (contentEditableRef.current) {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        range.insertNode(document.createTextNode(text))
        setContent(contentEditableRef.current.textContent || "")
        range.collapse(false)
        selection.removeAllRanges()
        selection.addRange(range)
        contentEditableRef.current.focus()
      }
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
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const hashtags = content.match(/#[a-zA-Z0-9_\u0980-\u09FF]+/g) || []
      const mentions = content.match(/@[a-zA-Z0-9_\u0980-\u09FF]+/g) || []

      setContent("")
      setMediaFiles([])
      setGiphyMedia([])
      setError("")
      
      if (contentEditableRef.current) {
        contentEditableRef.current.innerHTML = ""
      }
      
      alert("Post created successfully!")
    } catch (err: any) {
      setError(err.message || "An error occurred while submitting the post.")
    } finally {
      setIsPosting(false)
    }
  }

  const highlightText = (text: string) => {
    if (!text) return text
    
    return text
      .replace(
        /#[a-zA-Z0-9_\u0980-\u09FF]+/g,
        (match) => `<span class="text-blue-600 font-medium">${match}</span>`
      )
      .replace(
        /@[a-zA-Z0-9_\u0980-\u09FF]+/g,
        (match) => `<span class="text-green-600 font-medium">${match}</span>`
      )
  }

  const handleContentChange = () => {
    if (contentEditableRef.current) {
      const text = contentEditableRef.current.textContent || ""
      setContent(text)
      contentEditableRef.current.innerHTML = highlightText(text)
      
      // Restore cursor position
      const selection = window.getSelection()
      if (selection) {
        const range = document.createRange()
        if (contentEditableRef.current.lastChild) {
          range.selectNodeContents(contentEditableRef.current.lastChild)
          range.collapse(false)
          selection.removeAllRanges()
          selection.addRange(range)
        }
      }
    }
  }

  useEffect(() => {
    if (showGiphyPicker && giphySearch) {
      const mockGiphyResults: GiphyMedia[] = Array.from({ length: 6 }, (_, i) => ({
        id: crypto.randomUUID(),
        url: `https://placekitten.com/200/200?image=${i + 1}`,
        type: i % 2 === 0 ? "gif" : "sticker"
      }))
      setGiphyResults(mockGiphyResults)
    } else {
      setGiphyResults([])
    }
  }, [giphySearch, showGiphyPicker])

  const remainingChars = MAX_CHARACTERS - characterCount

  return (
    <div className="bg-white max-w-md mx-auto min-h-screen shadow-lg">
      <header className="flex items-center justify-between p-4 border-b border-gray-200">
        <button 
          aria-label="Close post creator"
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-6 h-6 text-gray-600" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900">Create Post</h2>
        <button
          onClick={handlePost}
          disabled={isPosting || (!content.trim() && totalMediaCount === 0) || isOverLimit}
          className="px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Submit post"
        >
          {isPosting ? (
            <div className="flex items-center">
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              Posting...
            </div>
          ) : (
            "Post"
          )}
        </button>
      </header>

      <main className="p-4">
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-gray-600 font-medium text-base" aria-hidden="true">
              {user.user_metadata.full_name.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className="font-medium text-gray-900 text-base">
                {user.user_metadata.full_name}
              </span>
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs" aria-label="Verified user">✓</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1 mb-4">
              {privacyOptions.map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.value}
                    onClick={() => setPrivacy(option.value as any)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      privacy === option.value 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    aria-label={option.ariaLabel}
                  >
                    <Icon className="w-3 h-3" />
                    {option.label}
                  </button>
                )
              })}
            </div>

            <div className="mb-6 relative">
              <div
                ref={contentEditableRef}
                contentEditable={!isPosting}
                onInput={handleContentChange}
                className="w-full text-gray-700 placeholder-gray-400 border-none outline-none text-base leading-relaxed min-h-[100px] bg-transparent focus:ring-2 focus:ring-blue-500 rounded-lg p-2"
                role="textbox"
                aria-label="Post content"
                aria-multiline="true"
                dangerouslySetInnerHTML={{ __html: highlightText(content) }}
              />
              
              <div className="absolute bottom-2 right-2 flex items-center gap-2">
                <span className={`text-xs font-medium ${
                  isOverLimit ? 'text-red-600' : 
                  progressPercentage > 80 ? 'text-yellow-600' : 
                  'text-gray-500'
                }`}>
                  {remainingChars}
                </span>
                <div className="relative w-6 h-6">
                  <div className={`absolute inset-0 rounded-full ${
                    isOverLimit ? 'bg-red-100' : 
                    progressPercentage > 80 ? 'bg-yellow-100' : 
                    'bg-gray-100'
                  }`} />
                  <div 
                    className={`absolute inset-0 rounded-full transition-all duration-300 ${
                      isOverLimit ? 'bg-red-500' : 
                      progressPercentage > 80 ? 'bg-yellow-500' : 
                      'bg-green-500'
                    }`}
                    style={{ 
                      clipPath: `inset(0 ${100 - Math.min(progressPercentage, 100)}% 0 0)` 
                    }}
                  />
                </div>
              </div>
            </div>

            {(mediaFiles.length > 0 || giphyMedia.length > 0) && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">
                    Media ({totalMediaCount}/{MAX_MEDIA_FILES})
                  </span>
                  <div className="text-xs text-gray-500">
                    {mediaFiles.filter((f) => f.type === "image").length} images,{" "}
                    {mediaFiles.filter((f) => f.type === "video").length} videos,{" "}
                    {giphyMedia.length} GIFs
                  </div>
                </div>

                <div className={`grid gap-2 ${
                  totalMediaCount === 1 ? "grid-cols-1" :
                  totalMediaCount === 2 ? "grid-cols-2" :
                  "grid-cols-2 sm:grid-cols-3"
                }`}>
                  {mediaFiles.map((media) => (
                    <div key={media.id} className="relative group">
                      <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                        {media.type === "image" ? (
                          <img
                            src={media.preview}
                            alt="Media preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <video
                            src={media.preview}
                            className="w-full h-full object-cover"
                            muted
                            controls
                          />
                        )}

                        {media.uploading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="w-full h-1 bg-gray-200 mx-4">
                              <div 
                                className="h-full bg-blue-500 transition-all duration-200"
                                style={{ width: `${media.uploadProgress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() => removeMediaFile(media.id)}
                          className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-white"
                          aria-label={`Remove ${media.type}`}
                        >
                          <X className="w-4 h-4" />
                        </button>

                        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                          {media.type.charAt(0).toUpperCase() + media.type.slice(1)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {giphyMedia.map((gif) => (
                    <div key={gif.id} className="relative group">
                      <div className="relative aspect-square rounded-lg overflow-hidden">
                        <img
                          src={gif.url}
                          alt={`${gif.type} preview`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => removeGiphyMedia(gif.id)}
                          className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-white"
                          aria-label={`Remove ${gif.type}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                          {gif.type.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showGiphyPicker && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <input
                  ref={giphySearchRef}
                  type="text"
                  value={giphySearch}
                  onChange={(e) => setGiphySearch(e.target.value)}
                  placeholder="Search GIFs..."
                  className="w-full p-2 mb-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Search GIFs"
                />
                <div className="grid grid-cols-3 gap-2">
                  {giphyResults.map((gif) => (
                    <button
                      key={gif.id}
                      onClick={() => handleGiphySelect(gif)}
                      className="relative aspect-square rounded-lg overflow-hidden hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label={`Select ${gif.type}`}
                    >
                      <img
                        src={gif.url}
                        alt={`${gif.type} preview`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-sm text-red-800">{error}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => insertText("#")}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isPosting}
                  aria-label="Add hashtag"
                >
                  <Hash className="w-5 h-5" />
                </button>
                <button
                  onClick={() => insertText("@")}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isPosting}
                  aria-label="Mention someone"
                >
                  <AtSign className="w-5 h-5" />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-purple-600 hover:bg-purple-50 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isUploadingMedia || totalMediaCount >= MAX_MEDIA_FILES || isPosting}
                  aria-label="Add media"
                >
                  {isUploadingMedia ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ImageIcon className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => setShowGiphyPicker(!showGiphyPicker)}
                  className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={totalMediaCount >= MAX_MEDIA_FILES || isPosting}
                  aria-label={showGiphyPicker ? "Close GIF picker" : "Open GIF picker"}
                >
                  <Smile className="w-5 h-5" />
                </button>
              </div>

              {totalMediaCount > 0 && (
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {totalMediaCount}/4 media
                </div>
              )}
            </div>

            <section>
              <h3 className="text-sm font-medium text-gray-600 mb-4">Add to your post</h3>
              <div className="grid grid-cols-2 gap-3">
                {postOptions.map((option, index) => (
                  <button
                    key={index}
                    onClick={option.action}
                    disabled={isPosting}
                    className={`${option.color} p-4 rounded-xl flex items-center space-x-3 hover:scale-105 transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                    aria-label={option.ariaLabel}
                  >
                    <option.icon className="w-5 h-5" />
                    <span className="text-sm font-medium flex-1 text-left">{option.label}</span>
                    <Plus className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>

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
          aria-hidden="true"
        />
      </main>
    </div>
  )
}
