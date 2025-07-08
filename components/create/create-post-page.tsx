"use client"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import LinkPreview from "@/components/link-preview"
import { createPostSchema } from "@/lib/validations/post"
import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  ArrowLeft,
  ImageIcon,
  Video,
  Smile,
  Hash,
  AtSign,
  CircleCheck,
  X,
  Loader2,
  Sparkles,
  Users,
  Globe,
  Lock,
  AlertCircle,
  Plus,
  Vote,
  HandHelping,
  FileWarning,
  Calendar,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react"

const MAX_CHARACTERS = 280
const MAX_MEDIA_FILES = 4
const MIN_POLL_OPTIONS = 2
const MAX_POLL_OPTIONS = 4
const GIPHY_API_KEY = "j5e65Yg6H9qAOCKrZYyJr9Odyo9oGY9L"
const GIPHY_BASE_URL = "https://api.giphy.com/v1"

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

export default function CreatePostPage({ user }: CreatePostPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const contentEditableRef = useRef<HTMLDivElement>(null)
  const [content, setContent] = useState("")
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [giphyMedia, setGiphyMedia] = useState<GiphyMedia[]>([])
  const [gifs, setGifs] = useState<any[]>([])
  const [isPosting, setIsPosting] = useState(false)
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const [error, setError] = useState("")
  const [showGiphyPicker, setShowGiphyPicker] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const userx = user.user_metadata
  const [isEnhancingText, setIsEnhancingText] = useState(false)
  const [enhancedTextSuggestion, setEnhancedTextSuggestion] = useState<string | null>(null)
  const [showEnhanceModal, setShowEnhanceModal] = useState(false)
  const [isPosted, setIsPosted] = useState(false)
  const [showPollCreator, setShowPollCreator] = useState(false)
  const [pollQuestion, setPollQuestion] = useState("")
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""])
  const [pollDuration, setPollDuration] = useState("1 day")
  const [showAddOptions, setShowAddOptions] = useState(false)
  const cursorPositionRef = useRef<{ node: Node | null; offset: number } | null>(null)
  const [postUrl , setPostUrl] = useState()
  
  const characterCount = content.length
  const isOverLimit = characterCount > MAX_CHARACTERS
  const progressPercentage = (characterCount / MAX_CHARACTERS) * 100
  const totalMediaCount = mediaFiles.length + giphyMedia.length

  const getProgressColor = () => {
    if (progressPercentage < 70) return "bg-green-500"
    if (progressPercentage < 90) return "bg-yellow-500"
    return "bg-red-500"
  }

  useEffect(() => {
    fetchTrending()
  }, [])

  const fetchTrending = async () => {
    try {
      const gifsResponse = await fetch(
        `${GIPHY_BASE_URL}/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`
      )
      const gifsData = await gifsResponse.json()
      setGifs(gifsData.data.map((gif: any) => ({
        id: gif.id,
        url: gif.images?.original?.url,
      })) || [])
    } catch (error) {
      console.error("Error fetching trending media:", error)
      setError("Failed to load trending GIFs")
    }
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

  const handleAddPollOption = () => {
    if (pollOptions.length < MAX_POLL_OPTIONS) {
      setPollOptions([...pollOptions, ""])
    }
  }

  const handleRemovePollOption = (index: number) => {
    if (pollOptions.length > MIN_POLL_OPTIONS) {
      setPollOptions(pollOptions.filter((_, i) => i !== index))
    }
  }

  const handlePollOptionChange = (index: number, value: string) => {
    const newOptions = [...pollOptions]
    newOptions[index] = value
    setPollOptions(newOptions)
  }

  const handleCancelPoll = () => {
    setShowPollCreator(false)
    setPollQuestion("")
    setPollOptions(["", ""])
    setPollDuration("1 day")
    setError("")
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
            const filePath = `${user.id}/${fileName}`

            const { data, error: uploadError } = await supabase.storage
              .from("post-media")
              .upload(filePath, file, {
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
          const errorMessages = failedUploads.map((result: any, index) => `File ${index + 1}: ${result.reason}`)
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
    [mediaFiles.length, totalMediaCount, user.id]
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
      url: gif.url || "https://media.giphy.com/media/efg1234/giphy.gif",
      type,
      id: gif.id || Math.random().toString(36).substr(2, 9),
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
    if (contentEditableRef.current) {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        const textNode = document.createTextNode(text)
        range.insertNode(textNode)
        range.setStartAfter(textNode)
        range.setEndAfter(textNode)
        selection.removeAllRanges()
        selection.addRange(range)
      } else {
        contentEditableRef.current.focus()
        document.execCommand("insertText", false, text)
      }
      setContent(contentEditableRef.current.textContent || "")
    }
  }

  const handlePost = async () => {
    if (!content.trim() && totalMediaCount === 0 && !showPollCreator) {
      setError("Please add some content, media, or a poll to your post.")
      return
    }

    if (isOverLimit) {
      setError(`Please keep your post under ${MAX_CHARACTERS} characters.`)
      return
    }

    if (showPollCreator) {
      if (!pollQuestion.trim()) {
        setError("Poll question cannot be empty.")
        return
      }
      const trimmedOptions = pollOptions.filter((opt) => opt.trim())
      if (trimmedOptions.length < MIN_POLL_OPTIONS) {
        setError(`Please provide at least ${MIN_POLL_OPTIONS} non-empty poll options.`)
        return
      }
      if (!pollDuration) {
        setError("Please select a poll duration.")
        return
      }
    }
    
    setIsPosting(true)
    setError("")

    try {
      const validatedData = createPostSchema.parse({ content })

      if (mediaFiles.some((media) => media.uploading)) {
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

      let pollData = null
      if (showPollCreator) {
        const now = new Date()
        const createdAt = now.toISOString()
        let endsAt = new Date(now)
        if (pollDuration === "1 day") {
          endsAt.setDate(now.getDate() + 1)
        } else if (pollDuration === "3 days") {
          endsAt.setDate(now.getDate() + 3)
        } else if (pollDuration === "1 week") {
          endsAt.setDate(now.getDate() + 7)
        }

        pollData = {
          question: pollQuestion.trim(),
          status: "active",
          created_at: createdAt,
          ends_at: endsAt.toISOString(),
          options: pollOptions
            .filter((opt) => opt.trim())
            .map((optionText, index) => ({
              option_id: index + 1,
              text: optionText,
              votes: 0,
            })),
        }
      }
      
      const { data: postData, error: postError } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          content: validatedData.content,
          media_urls: allMediaUrls.length > 0 ? allMediaUrls : null,
          media_type: mediaType,
         // in_post_poll: pollData ? [pollData] : null,
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

      setMediaFiles([])
      setGiphyMedia([])
      setContent("")
      setShowPollCreator(false)
      setPollQuestion("")
      setPollOptions(["", ""])
      setPollDuration("1 day")
      if (contentEditableRef.current) {
        contentEditableRef.current.textContent = ""
        contentEditableRef.current.classList.add("placeholder-shown")
      }
    } catch (err: any) {
      console.error("Post submission error:", err)
      setError(err.message || "An error occurred while submitting the post.")
    } finally {
      toast("Post has been created", {
          
          action: {
            label: "View",
            onClick: () => router.push('/dashboard'),
          },
        })
      }
      setIsPosted(true)
      setIsPosting(false)
    }
  
  

  const handleEnhanceText = async () => {
    if (!content.trim()) {
      setError("Please write some text to enhance first.")
      return
    }

    setIsEnhancingText(true)
    setError("")
    setEnhancedTextSuggestion(null)

    try {
      const prompt = `Enhance the following text to be more engaging and descriptive for a social media post. Keep it concise and within 280 characters if possible. Here's the text: "${content}"`
      let chatHistory = []
      chatHistory.push({ role: "user", parts: [{ text: prompt }] })
      const payload = { contents: chatHistory }
      const apiKey = ""
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (
        result.candidates &&
        result.candidates.length > 0 &&
        result.candidates[0].content &&
        result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0
      ) {
        const text = result.candidates[0].content.parts[0].text
        setEnhancedTextSuggestion(text)
        setShowEnhanceModal(true)
      } else {
        setError("Failed to get a text suggestion. Please try again.")
      }
    } catch (err: any) {
      console.error("Gemini API error:", err)
      setError("Failed to enhance text. Please check your network connection or try again later.")
    } finally {
      setIsEnhancingText(false)
    }
  }

  const useEnhancedSuggestion = () => {
    if (enhancedTextSuggestion) {
      setContent(enhancedTextSuggestion)
      if (contentEditableRef.current) {
        contentEditableRef.current.textContent = enhancedTextSuggestion
        const range = document.createRange()
        const selection = window.getSelection()
        range.selectNodeContents(contentEditableRef.current)
        range.collapse(false)
        selection?.removeAllRanges()
        selection?.addRange(range)
      }
      setShowEnhanceModal(false)
      setEnhancedTextSuggestion(null)
    }
  }

  const remainingChars = MAX_CHARACTERS - characterCount

  const highlightContent = (text: string) => {
    // Sanitize text to prevent XSS
    const div = document.createElement("div")
    div.textContent = text
    let escapedText = div.innerHTML
    
    escapedText = escapedText.replace(/#([a-zA-Z0-9_\u0980-\u09FF]+)/g, '<span style="color: #1DA1F2; font-weight: bold;">#$1</span>')
    escapedText = escapedText.replace(/@([a-zA-Z0-9_]+)/g, '<span style="color: #1DA1F2; font-weight: bold;">@$1</span>')
    escapedText = escapedText.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: #1DA1F2; text-decoration: underline;">$1</a>'
    )
    return escapedText
  }

  const featureOptions = [
    {
      icon: ImageIcon,
      label: "Photo/Video",
      onClick: () => fileInputRef.current?.click(),
      disabled: isUploadingMedia || totalMediaCount >= MAX_MEDIA_FILES,
    },
    {
      icon: Smile,
      label: "Gif",
      onClick: () => setShowGiphyPicker(true),
      disabled: totalMediaCount >= MAX_MEDIA_FILES,
    },
    {
      icon: Vote,
      label: "Poll",
      onClick: () => {
        if (totalMediaCount === 0) {
          setShowPollCreator(true)
          setShowAddOptions(true)
          setContent("")
          if (contentEditableRef.current) {
            contentEditableRef.current.textContent = ""
            contentEditableRef.current.classList.add("placeholder-shown")
          }
        } else {
          setError("You cannot add a poll when media is already attached to your post.")
        }
      },
      disabled: totalMediaCount > 0 || showPollCreator,
    },
    { icon: HandHelping, label: "Adoption", onClick: () => console.log("Adoption clicked") },
    { icon: FileWarning, label: "Lost Notice", onClick: () => console.log("Lost Notice clicked") },
    { icon: Calendar, label: "Event", onClick: () => console.log("Event clicked") },
  ]

  const getCaretCharacterOffset = useCallback((element: HTMLElement) => {
    let caretOffset = 0
    const doc = element.ownerDocument
    const win = doc.defaultView
    const sel = win?.getSelection()
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      const preCaretRange = range.cloneRange()
      preCaretRange.selectNodeContents(element)
      preCaretRange.setEnd(range.endContainer, range.endOffset)
      caretOffset = preCaretRange.toString().length
    }
    return caretOffset
  }, [])

  const setCaretPosition = useCallback((element: HTMLElement, offset: number) => {
    const range = document.createRange()
    const selection = window.getSelection()

    let currentNode: Node | null = element
    let currentOffset = 0
    let found = false

    const walk = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null)
    while ((currentNode = walk.nextNode())) {
      const nodeTextLength = currentNode.textContent?.length || 0
      if (currentOffset + nodeTextLength >= offset) {
        range.setStart(currentNode, offset - currentOffset)
        range.collapse(true)
        found = true
        break
      }
      currentOffset += nodeTextLength
    }

    if (!found) {
      range.selectNodeContents(element)
      range.collapse(false)
    }

    selection?.removeAllRanges()
    selection?.addRange(range)
  }, [])

  useEffect(() => {
    if (contentEditableRef.current && cursorPositionRef.current) {
      const { offset } = cursorPositionRef.current
      setCaretPosition(contentEditableRef.current, offset)
      cursorPositionRef.current = null
    }
  }, [content, setCaretPosition])

  useEffect(() => {
    if (contentEditableRef.current && !content.trim()) {
      contentEditableRef.current.textContent = contentEditableRef.current.dataset.placeholder || ""
      contentEditableRef.current.classList.add("placeholder-shown")
    }
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-3 flex justify-between items-center">
          <Button variant="ghost" size="icon" onClick={() => console.log("Close button clicked")}>
            <X className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Create Post</h1>
          <Button
            onClick={handlePost}
            disabled={isPosting || (!content.trim() && totalMediaCount === 0 && !showPollCreator) || isOverLimit || isUploadingMedia}
            className="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 font-semibold"
          >
            {isPosting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Post"}
          </Button>
        </div>
      </div>
    
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={"https://placehold.co/48x48/aabbcc/ffffff?text=U"} />
            <AvatarFallback>{"+"}</AvatarFallback>
          </Avatar>
          <div>
            <span className="font-semibold text-lg">{userx.display_name}</span>
            <span className="text-sm text-gray-700">@{userx.username}</span>
          </div>
        </div>

        <div className="mb-4">
          {!showPollCreator ? (
          <>
            <div
              ref={contentEditableRef}
              className="w-full border-0 resize-none text-lg focus:ring-0 outline-none"
              style={{ minHeight: "120px" }}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => {
                if (contentEditableRef.current) {
                
                  const offset = getCaretCharacterOffset(contentEditableRef.current)
                  cursorPositionRef.current = { node: null, offset: offset }
                }
                setContent(e.currentTarget.textContent || "")
              }}
              data-placeholder="What do you want to talk about?"
              onFocus={(e) => {
                if (e.target.textContent === e.target.dataset.placeholder) {
                  e.target.textContent = ""
                  e.target.classList.remove("placeholder-shown")
                }
              }}
              onBlur={(e) => {
                if (!e.target.textContent?.trim()) {
                  //callSetParams()
                  e.target.textContent = e.target.dataset.placeholder || ""
                  e.target.classList.add("placeholder-shown")
                }
              }}
              dangerouslySetInnerHTML={{ __html: content ? highlightContent(content) : "" }}
            />
              
            
            
            </>
          ) : (
            <Card className="mb-4 shadow-none border">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <h3 className="text-lg font-semibold">Create Poll</h3>
                <Button variant="ghost" size="sm" onClick={handleCancelPoll}>
                  Cancel Poll
                </Button>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="mb-4">
                  <label htmlFor="poll-question" className="block text-sm font-medium text-gray-700 mb-1">
                    Poll Question
                  </label>
                  <Input
                    id="poll-question"
                    placeholder="Ask a question..."
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    className="w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Poll Options</label>
                  {pollOptions.map((option, index) => (
                    <div key={index} className="flex items-center gap-2 mb-2">
                      <Input
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={(e) => handlePollOptionChange(index, e.target.value)}
                        className="flex-1 rounded-md border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                      />
                      {pollOptions.length > MIN_POLL_OPTIONS && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemovePollOption(index)}
                          className="text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < MAX_POLL_OPTIONS && (
                    <Button
                      variant="outline"
                      className="w-full mt-2 border-dashed border-gray-300 hover:bg-gray-50"
                      onClick={handleAddPollOption}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add Option
                    </Button>
                  )}
                </div>
                <div>
                  <label htmlFor="poll-duration" className="block text-sm font-medium text-gray-700 mb-1">
                    Poll Duration
                  </label>
                  <Select value={pollDuration} onValueChange={setPollDuration}>
                    <SelectTrigger className="w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1 day">1 Day</SelectItem>
                      <SelectItem value="3 days">3 Days</SelectItem>
                      <SelectItem value="1 week">1 Week</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}
          <style jsx>{`
            [contenteditable][data-placeholder]:empty:before {
              content: attr(data-placeholder);
              color: #9ca3af;
              pointer-events: none;
              display: block;
            }
            [contenteditable]:empty.placeholder-shown:before {
              content: attr(data-placeholder);
              color: #9ca3af;
              pointer-events: none;
              display: block;
            }
          `}</style>
          <div className="flex justify-between items-center mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEnhanceText}
              disabled={isEnhancingText || !content.trim()}
              className="text-purple-500"
            >
              {isEnhancingText ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5 mr-1" />}
              Enhance Text
            </Button>
            <span className={`text-sm ${isOverLimit ? "text-red-500" : "text-gray-500"}`}>
              {remainingChars}/{MAX_CHARACTERS}
            </span>
          </div>
        </div>

        {(mediaFiles.length > 0 || giphyMedia.length > 0) && (
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {mediaFiles.map((media) => (
              <div key={media.id} className="relative aspect-video rounded-lg overflow-hidden border border-gray-200">
                {media.type === "image" ? (
                  <img src={media.preview} alt="Media preview" className="w-full h-full object-cover" />
                ) : (
                  <video src={media.preview} controls className="w-full h-full object-cover" />
                )}
                {media.uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full h-6 w-6"
                  onClick={() => removeMediaFile(media.id)}
                  disabled={media.uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {giphyMedia.map((gif, index) => (
              <div key={gif.id} className="relative aspect-video rounded-lg overflow-hidden border border-gray-200">
                <img src={gif.url} alt="Giphy media" className="w-full h-full object-cover" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full h-6 w-6"
                  onClick={() => removeGiphyMedia(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Separator className="my-6" />
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Add to your post</h2>
          <Button variant="ghost" size="icon" onClick={() => setShowAddOptions(!showAddOptions)}>
            {showAddOptions ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </Button>
        </div>

        {showAddOptions && (
          <div className="grid grid-cols-2 gap-4">
            {featureOptions.map((option, index) => {
              const Icon = option.icon
              return (
                <Card
                  key={index}
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors shadow-none"
                  onClick={option.onClick}
                  tabIndex={option.disabled ? -1 : 0}
                  aria-disabled={option.disabled}
                  style={option.disabled ? { opacity: 0.6, cursor: "not-allowed" } : {}}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-gray-800" />
                    <span className="font-medium text-gray-800">{option.label}</span>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
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
      />

      {showGiphyPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <Card className="w-full max-w-lg shadow-none border">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
              <h2 className="text-lg font-semibold">Select a GIF or Sticker</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowGiphyPicker(false)}>
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="pt-2 p-4">
              <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                {gifs.map((gif) => (
                  <div
                    key={gif.id}
                    className="relative aspect-video rounded-lg overflow-hidden cursor-pointer"
                    onClick={() => handleGiphySelect(gif, "gif")}
                  >
                    <img src={gif.url} alt="Giphy" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-4">
                Powered by Giphy API
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {showEnhanceModal && enhancedTextSuggestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <Card className="w-full max-w-lg shadow-none border">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
              <h2 className="text-lg font-semibold">✨ Text Enhancement Suggestion</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowEnhanceModal(false)}>
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="pt-2 p-4">
              <p className="text-gray-700 mb-4">{enhancedTextSuggestion}</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEnhanceModal(false)}>
                  Cancel
                </Button>
                <Button onClick={useEnhancedSuggestion}>Use Suggestion</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
