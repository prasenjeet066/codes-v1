"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Tag,
  Eye,
  EyeOff,
  Settings,
  Send,
  Draft,
  Mic,
  MicOff,
  Palette,
  Type,
  Link2,
  Zap,
  Target,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

const MAX_CHARACTERS = 280
const MAX_MEDIA_FILES = 4

interface EnhancedCreatePostProps {
  user: any
}

interface MediaFile {
  id: string
  file: File
  preview: string
  type: "image" | "video"
  uploading?: boolean
  altText?: string
}

interface PostDraft {
  id: string
  content: string
  mediaFiles: MediaFile[]
  scheduledDate?: Date
  audience: "public" | "followers" | "private"
  allowComments: boolean
  allowReposts: boolean
  location?: string
  tags: string[]
  createdAt: Date
}

export default function EnhancedCreatePost({ user }: EnhancedCreatePostProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Content state
  const [content, setContent] = useState("")
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [isPosting, setIsPosting] = useState(false)
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const [error, setError] = useState("")

  // Enhanced features state
  const [audience, setAudience] = useState<"public" | "followers" | "private">("public")
  const [allowComments, setAllowComments] = useState(true)
  const [allowReposts, setAllowReposts] = useState(true)
  const [scheduledDate, setScheduledDate] = useState<Date>()
  const [location, setLocation] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [drafts, setDrafts] = useState<PostDraft[]>([])
  const [showDrafts, setShowDrafts] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [currentTab, setCurrentTab] = useState("compose")

  // AI Enhancement
  const [showAIDialog, setShowAIDialog] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState("")
  const [enhancementType, setEnhancementType] = useState<"tone" | "length" | "engagement">("tone")
  const [selectedTone, setSelectedTone] = useState<"professional" | "casual" | "friendly" | "witty">("casual")

  // Analytics
  const characterCount = content.length
  const isOverLimit = characterCount > MAX_CHARACTERS
  const progressPercentage = (characterCount / MAX_CHARACTERS) * 100

  useEffect(() => {
    loadDrafts()
  }, [])

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [content])

  const loadDrafts = () => {
    const savedDrafts = localStorage.getItem(`drafts_${user.id}`)
    if (savedDrafts) {
      setDrafts(JSON.parse(savedDrafts))
    }
  }

  const saveDraft = () => {
    if (!content.trim() && mediaFiles.length === 0) return

    const draft: PostDraft = {
      id: Date.now().toString(),
      content,
      mediaFiles,
      scheduledDate,
      audience,
      allowComments,
      allowReposts,
      location,
      tags,
      createdAt: new Date()
    }

    const updatedDrafts = [draft, ...drafts.slice(0, 9)] // Keep only 10 drafts
    setDrafts(updatedDrafts)
    localStorage.setItem(`drafts_${user.id}`, JSON.stringify(updatedDrafts))
    
    toast.success("Draft saved!")
  }

  const loadDraft = (draft: PostDraft) => {
    setContent(draft.content)
    setMediaFiles(draft.mediaFiles)
    setScheduledDate(draft.scheduledDate)
    setAudience(draft.audience)
    setAllowComments(draft.allowComments)
    setAllowReposts(draft.allowReposts)
    setLocation(draft.location || "")
    setTags(draft.tags)
    setShowDrafts(false)
    toast.success("Draft loaded!")
  }

  const deleteDraft = (draftId: string) => {
    const updatedDrafts = drafts.filter(d => d.id !== draftId)
    setDrafts(updatedDrafts)
    localStorage.setItem(`drafts_${user.id}`, JSON.stringify(updatedDrafts))
  }

  const handleMediaUpload = useCallback(async (files: FileList) => {
    if (files.length === 0) return
    
    if (mediaFiles.length + files.length > MAX_MEDIA_FILES) {
      setError(`You can only upload up to ${MAX_MEDIA_FILES} media files`)
      return
    }

    setIsUploadingMedia(true)
    setError("")

    try {
      const newMediaFiles: MediaFile[] = Array.from(files).map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview: URL.createObjectURL(file),
        type: file.type.startsWith("video/") ? "video" : "image",
        uploading: true
      }))

      setMediaFiles(prev => [...prev, ...newMediaFiles])

      // Upload to Supabase storage
      const uploadPromises = Array.from(files).map(async (file, index) => {
        try {
          const fileExt = file.name.split(".").pop()?.toLowerCase()
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
          const filePath = `${user.id}/${fileName}`

          const { data, error: uploadError } = await supabase.storage
            .from("post-media")
            .upload(filePath, file)

          if (uploadError) throw uploadError

          const { data: urlData } = supabase.storage
            .from("post-media")
            .getPublicUrl(filePath)

          return {
            index: mediaFiles.length + index,
            publicUrl: urlData.publicUrl
          }
        } catch (err) {
          throw err
        }
      })

      const uploadResults = await Promise.allSettled(uploadPromises)

      setMediaFiles(prev => {
        const updated = [...prev]
        uploadResults.forEach((result, index) => {
          if (result.status === "fulfilled") {
            const targetIndex = result.value.index
            if (updated[targetIndex]) {
              URL.revokeObjectURL(updated[targetIndex].preview)
              updated[targetIndex].preview = result.value.publicUrl
              updated[targetIndex].uploading = false
            }
          }
        })
        return updated
      })

    } catch (err: any) {
      console.error("Media upload error:", err)
      setError(err.message || "Failed to upload media")
    } finally {
      setIsUploadingMedia(false)
    }
  }, [mediaFiles.length, user.id])

  const removeMediaFile = (id: string) => {
    setMediaFiles(prev => {
      const file = prev.find(f => f.id === id)
      if (file && file.preview.startsWith("blob:")) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter(f => f.id !== id)
    })
  }

  const updateMediaAltText = (id: string, altText: string) => {
    setMediaFiles(prev => 
      prev.map(file => 
        file.id === id ? { ...file, altText } : file
      )
    )
  }

  const enhanceWithAI = async () => {
    if (!content.trim()) {
      setError("Please write some content first")
      return
    }

    setIsEnhancing(true)
    try {
      let prompt = ""
      
      switch (enhancementType) {
        case "tone":
          prompt = `Rewrite this social media post to have a ${selectedTone} tone: "${content}"`
          break
        case "length":
          prompt = `Make this social media post more engaging and detailed while keeping it under 280 characters: "${content}"`
          break
        case "engagement":
          prompt = `Rewrite this social media post to be more engaging and likely to get interactions: "${content}"`
          break
      }

      // Simulate AI enhancement (replace with actual AI API)
      setTimeout(() => {
        const suggestions = {
          tone: {
            professional: content.replace(/!/g, ".").replace(/amazing/gi, "excellent"),
            casual: content + " 🔥",
            friendly: "Hey everyone! " + content + " 😊",
            witty: content + " (or so I've heard 😉)"
          },
          length: content + " What do you think? Would love to hear your thoughts!",
          engagement: content + " Drop a 💙 if you agree!"
        }
        
        if (enhancementType === "tone") {
          setAiSuggestion(suggestions.tone[selectedTone])
        } else {
          setAiSuggestion(suggestions[enhancementType])
        }
        
        setShowAIDialog(true)
        setIsEnhancing(false)
      }, 2000)

    } catch (error) {
      console.error("AI enhancement error:", error)
      setError("Failed to enhance content")
      setIsEnhancing(false)
    }
  }

  const useAISuggestion = () => {
    setContent(aiSuggestion)
    setShowAIDialog(false)
    setAiSuggestion("")
  }

  const handlePost = async () => {
    if (!content.trim() && mediaFiles.length === 0) {
      setError("Please add some content or media to your post")
      return
    }

    if (isOverLimit) {
      setError(`Please keep your post under ${MAX_CHARACTERS} characters`)
      return
    }

    if (mediaFiles.some(file => file.uploading)) {
      setError("Please wait for media uploads to complete")
      return
    }

    setIsPosting(true)
    setError("")

    try {
      const mediaUrls = mediaFiles.map(file => file.preview)
      const mediaType = mediaFiles.length > 0 ? 
        (mediaFiles.some(f => f.type === "video") ? "video" : "image") : null

      const postData = {
        user_id: user.id,
        content: content.trim(),
        media_urls: mediaUrls.length > 0 ? mediaUrls : null,
        media_type: mediaType,
        scheduled_for: scheduledDate?.toISOString(),
        audience,
        allow_comments: allowComments,
        allow_reposts: allowReposts,
        location: location || null,
        tags: tags.length > 0 ? tags : null
      }

      const { data, error: postError } = await supabase
        .from("posts")
        .insert(postData)
        .select()
        .single()

      if (postError) throw postError

      // Process hashtags
      const hashtags = content.match(/#[a-zA-Z0-9_\u0980-\u09FF]+/g) || []
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
              .insert({ post_id: data.id, hashtag_id: hashtagData.id })
          }
        } catch (hashtagErr) {
          console.error(`Error processing hashtag ${tagName}:`, hashtagErr)
        }
      }

      // Clear form
      setContent("")
      setMediaFiles([])
      setScheduledDate(undefined)
      setLocation("")
      setTags([])
      setAudience("public")
      setAllowComments(true)
      setAllowReposts(true)

      // Clean up blob URLs
      mediaFiles.forEach(file => {
        if (file.preview.startsWith("blob:")) {
          URL.revokeObjectURL(file.preview)
        }
      })

      if (scheduledDate) {
        toast.success("Post scheduled successfully!")
      } else {
        toast.success("Post created successfully!")
      }

      setTimeout(() => {
        router.push("/dashboard")
      }, 1000)

    } catch (err: any) {
      console.error("Post creation error:", err)
      setError(err.message || "Failed to create post")
    } finally {
      setIsPosting(false)
    }
  }

  const getProgressColor = () => {
    if (progressPercentage < 70) return "bg-green-500"
    if (progressPercentage < 90) return "bg-yellow-500"
    return "bg-red-500"
  }

  const getAudienceIcon = () => {
    switch (audience) {
      case "public": return <Globe className="h-4 w-4" />
      case "followers": return <Users className="h-4 w-4" />
      case "private": return <Lock className="h-4 w-4" />
    }
  }

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags(prev => [...prev, tag])
    }
  }

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex justify-between items-center">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              {getAudienceIcon()}
              {audience}
            </Badge>
            
            {scheduledDate && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Scheduled
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={saveDraft}
              disabled={!content.trim() && mediaFiles.length === 0}
            >
              <Draft className="h-4 w-4 mr-1" />
              Save Draft
            </Button>
            
            <Button
              onClick={handlePost}
              disabled={isPosting || (!content.trim() && mediaFiles.length === 0) || isOverLimit || isUploadingMedia}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {isPosting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : scheduledDate ? (
                <Clock className="h-4 w-4 mr-1" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              {isPosting ? "Posting..." : scheduledDate ? "Schedule" : "Post"}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="compose" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              Compose
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Media
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-4">
            {/* User info */}
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback>
                  {user?.user_metadata?.display_name?.[0] || user?.email?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{user?.user_metadata?.display_name || "User"}</h3>
                <p className="text-sm text-gray-500">@{user?.user_metadata?.username || "username"}</p>
              </div>
            </div>

            {/* Content textarea */}
            <div className="space-y-3">
              <Textarea
                ref={textareaRef}
                placeholder="What's happening?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[120px] text-lg border-0 shadow-none resize-none focus-visible:ring-0"
                style={{ overflow: 'hidden' }}
              />

              {/* Character count and progress */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={enhanceWithAI}
                    disabled={isEnhancing || !content.trim()}
                    className="text-purple-600 hover:text-purple-700"
                  >
                    {isEnhancing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-1" />
                    )}
                    Enhance with AI
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8">
                    <Progress
                      value={Math.min(progressPercentage, 100)}
                      className={cn("w-8 h-8 rounded-full", getProgressColor())}
                    />
                    <span className={cn(
                      "absolute inset-0 flex items-center justify-center text-xs font-medium",
                      isOverLimit ? "text-red-600" : "text-gray-600"
                    )}>
                      {MAX_CHARACTERS - characterCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {tag}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => removeTag(tag)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Location */}
            {location && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4" />
                {location}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0"
                  onClick={() => setLocation("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="media" className="space-y-4">
            {/* Media upload */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add Media</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingMedia || mediaFiles.length >= MAX_MEDIA_FILES}
                    className="h-20 flex flex-col items-center gap-2"
                  >
                    <ImageIcon className="h-6 w-6" />
                    <span className="text-sm">Photos</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingMedia || mediaFiles.length >= MAX_MEDIA_FILES}
                    className="h-20 flex flex-col items-center gap-2"
                  >
                    <Video className="h-6 w-6" />
                    <span className="text-sm">Videos</span>
                  </Button>
                </div>

                {/* Media preview */}
                {mediaFiles.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    {mediaFiles.map((media) => (
                      <div key={media.id} className="relative aspect-video rounded-lg overflow-hidden border">
                        {media.type === "image" ? (
                          <img src={media.preview} alt="Media preview" className="w-full h-full object-cover" />
                        ) : (
                          <video src={media.preview} className="w-full h-full object-cover" controls />
                        )}
                        
                        {media.uploading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                            <Loader2 className="h-6 w-6 animate-spin text-white" />
                          </div>
                        )}
                        
                        <div className="absolute top-2 right-2 flex gap-1">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              const altText = prompt("Enter alt text for this image:")
                              if (altText) updateMediaAltText(media.id, altText)
                            }}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => removeMediaFile(media.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        {media.altText && (
                          <div className="absolute bottom-2 left-2">
                            <Badge variant="secondary" className="text-xs">ALT</Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            {/* Audience settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Audience & Privacy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Who can see this post</Label>
                  <Select value={audience} onValueChange={(value: "public" | "followers" | "private") => setAudience(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Public - Anyone can see
                        </div>
                      </SelectItem>
                      <SelectItem value="followers">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Followers only
                        </div>
                      </SelectItem>
                      <SelectItem value="private">
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          Only me
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="allow-comments">Allow comments</Label>
                  <Switch
                    id="allow-comments"
                    checked={allowComments}
                    onCheckedChange={setAllowComments}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="allow-reposts">Allow reposts</Label>
                  <Switch
                    id="allow-reposts"
                    checked={allowReposts}
                    onCheckedChange={setAllowReposts}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Scheduling */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Schedule Post
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={scheduledDate}
                      onSelect={setScheduledDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                {scheduledDate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setScheduledDate(undefined)}
                    className="w-full"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove schedule
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Location & Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="Add location..."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    placeholder="Add tags..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault()
                        const value = e.currentTarget.value.trim()
                        if (value) {
                          addTag(value)
                          e.currentTarget.value = ""
                        }
                      }
                    }}
                  />
                  <p className="text-xs text-gray-500">Press Enter or comma to add tags</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Error */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Drafts dialog */}
        <Dialog open={showDrafts} onOpenChange={setShowDrafts}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Drafts</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {drafts.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No drafts saved</p>
              ) : (
                drafts.map((draft) => (
                  <div key={draft.id} className="p-3 border rounded-lg">
                    <p className="text-sm truncate mb-2">{draft.content || "Media only"}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{format(draft.createdAt, "MMM d, HH:mm")}</span>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => loadDraft(draft)}
                        >
                          Load
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteDraft(draft.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* AI Enhancement dialog */}
        <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                AI Enhancement Suggestion
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium mb-1">Original:</p>
                <p className="text-sm text-gray-600">{content}</p>
              </div>
              
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-sm font-medium mb-1">Enhanced:</p>
                <p className="text-sm">{aiSuggestion}</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowAIDialog(false)} className="flex-1">
                  Keep Original
                </Button>
                <Button onClick={useAISuggestion} className="flex-1">
                  Use Enhancement
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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

        {/* Quick actions */}
        <div className="fixed bottom-4 right-4 flex flex-col gap-2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full shadow-lg"
            onClick={() => setShowDrafts(true)}
          >
            <Draft className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}