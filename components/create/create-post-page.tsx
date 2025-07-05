"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
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
  ChevronDown, // Added ChevronDown for toggle
  ChevronUp,   // Added ChevronUp for toggle
} from "lucide-react"

const MAX_CHARACTERS = 280
const MAX_MEDIA_FILES = 4

interface CreatePostPageProps {
  user: {
    id: string;
    user_metadata: {
      avatar_url?: string;
      full_name?: string;
      username?: string;
    };
  };
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
  const contentEditableRef = useRef<HTMLDivElement>(null);

  const [content, setContent] = useState("")
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [giphyMedia, setGiphyMedia] = useState<GiphyMedia[]>([])
  const [isPosting, setIsPosting] = useState(false)
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const [error, setError] = useState("")
  const [showGiphyPicker, setShowGiphyPicker] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const [isEnhancingText, setIsEnhancingText] = useState(false);
  const [enhancedTextSuggestion, setEnhancedTextSuggestion] = useState<string | null>(null);
  const [showEnhanceModal, setShowEnhanceModal] = useState(false);

  // New state for showing/hiding "Add to your post" options
  const [showAddOptions, setShowAddOptions] = useState(false);

  // State to store cursor position before re-render
  const cursorPositionRef = useRef<{ node: Node | null; offset: number } | null>(null);

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

        await new Promise((resolve) => setTimeout(resolve, 1500))

        setMediaFiles((prev) => {
          return prev.map((media) => ({ ...media, uploading: false }));
        });

      } catch (err: any) {
        console.error("Media upload error (simulated):", err)
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
    [totalMediaCount, mediaFiles],
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
      url: gif.images?.original?.url || "https://media.giphy.com/media/efg1234/giphy.gif",
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
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        contentEditableRef.current.focus();
        document.execCommand('insertText', false, text);
      }
      // Update content state from the div's textContent after insertion
      setContent(contentEditableRef.current.textContent || "");
    }
  };


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
      await new Promise((resolve) => setTimeout(resolve, 1000))

      console.log("Post content:", content);
      console.log("Media files:", mediaFiles.map(m => m.preview));
      console.log("Giphy media:", giphyMedia.map(g => g.url));

      alert("Post simulated successfully!");

      mediaFiles.forEach((media) => {
        if (media.preview.startsWith("blob:")) {
          URL.revokeObjectURL(media.preview)
        }
      })
      setMediaFiles([]);
      setGiphyMedia([]);
      setContent("");
      if (contentEditableRef.current) {
        contentEditableRef.current.textContent = ''; // Clear the content editable div
        contentEditableRef.current.classList.add('placeholder-shown'); // Show placeholder
      }

    } catch (err: any) {
      console.error("Post submission error (simulated):", err)
      setError(err.message || "An error occurred while submitting the post.")
    } finally {
      setIsPosting(false)
    }
  }

  const handleEnhanceText = async () => {
    if (!content.trim()) {
      setError("Please write some text to enhance first.");
      return;
    }

    setIsEnhancingText(true);
    setError("");
    setEnhancedTextSuggestion(null);

    try {
      const prompt = `Enhance the following text to be more engaging and descriptive for a social media post. Keep it concise and within 280 characters if possible. Here's the text: "${content}"`;
      let chatHistory = [];
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });
      const payload = { contents: chatHistory };
      const apiKey = ""
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        setEnhancedTextSuggestion(text);
        setShowEnhanceModal(true);
      } else {
        setError("Failed to get a text suggestion. Please try again.");
      }
    } catch (err: any) {
      console.error("Gemini API error:", err);
      setError("Failed to enhance text. Please check your network connection or try again later.");
    } finally {
      setIsEnhancingText(false);
    }
  };

  const useEnhancedSuggestion = () => {
    if (enhancedTextSuggestion) {
      setContent(enhancedTextSuggestion);
      if (contentEditableRef.current) {
        contentEditableRef.current.textContent = enhancedTextSuggestion; // Update the div's content
        // Manually set cursor to end after using suggestion
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(contentEditableRef.current);
        range.collapse(false); // Collapse to the end
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      setShowEnhanceModal(false);
      setEnhancedTextSuggestion(null);
    }
  };

  const remainingChars = MAX_CHARACTERS - characterCount

  const highlightContent = (text: string) => {
    // Escape HTML to prevent XSS and ensure plain text is processed
    let escapedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

    // Match hashtags
    escapedText = escapedText.replace(/#([a-zA-Z0-9_\u0980-\u09FF]+)/g, '<span style="color: #1DA1F2; font-weight: bold;">#$1</span>');
    // Match mentions
    escapedText = escapedText.replace(/@([a-zA-Z0-9_]+)/g, '<span style="color: #1DA1F2; font-weight: bold;">@$1</span>');
    // Match URLs - ensure they are clickable
    escapedText = escapedText.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: #1DA1F2; text-decoration: underline;">$1</a>'
    );
    return escapedText;
  }

  const featureOptions = [
    { icon: ImageIcon, label: "Photo/Video", onClick: () => fileInputRef.current?.click(), disabled: isUploadingMedia || totalMediaCount >= MAX_MEDIA_FILES },
    { icon: Smile, label: "Gif", onClick: () => setShowGiphyPicker(true), disabled: totalMediaCount >= MAX_MEDIA_FILES },
    { icon: Vote, label: "Poll", onClick: () => console.log("Poll clicked") },
    { icon: HandHelping, label: "Adoption", onClick: () => console.log("Adoption clicked") },
    { icon: FileWarning, label: "Lost Notice", onClick: () => console.log("Lost Notice clicked") },
    { icon: Calendar, label: "Event", onClick: () => console.log("Event clicked") },
  ];

  // Function to get the current cursor position (offset within plain text)
  const getCaretCharacterOffset = useCallback((element: HTMLElement) => {
    let caretOffset = 0;
    const doc = element.ownerDocument;
    const win = doc.defaultView;
    const sel = win?.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      caretOffset = preCaretRange.toString().length;
    }
    return caretOffset;
  }, []);

  // Function to set the caret position based on a character offset
  const setCaretPosition = useCallback((element: HTMLElement, offset: number) => {
    const range = document.createRange();
    const selection = window.getSelection();

    let currentNode: Node | null = element;
    let currentOffset = 0;
    let found = false;

    // Traverse child nodes to find the text node and offset
    const walk = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
    while (currentNode = walk.nextNode()) {
      const nodeTextLength = currentNode.textContent?.length || 0;
      if (currentOffset + nodeTextLength >= offset) {
        range.setStart(currentNode, offset - currentOffset);
        range.collapse(true);
        found = true;
        break;
      }
      currentOffset += nodeTextLength;
    }

    if (!found) {
      // If offset is beyond all text, set to the end of the last text node or element
      range.selectNodeContents(element);
      range.collapse(false);
    }

    selection?.removeAllRanges();
    selection?.addRange(range);
  }, []);

  // Effect to restore cursor position after re-render
  useEffect(() => {
    if (contentEditableRef.current && cursorPositionRef.current) {
      const { offset } = cursorPositionRef.current;
      setCaretPosition(contentEditableRef.current, offset);
      cursorPositionRef.current = null; // Clear the stored position
    }
  }, [content, setCaretPosition]); // Re-run when content changes

  // useEffect to handle initial placeholder display for contentEditable div
  useEffect(() => {
    if (contentEditableRef.current && !content.trim()) {
      contentEditableRef.current.textContent = contentEditableRef.current.dataset.placeholder || '';
      contentEditableRef.current.classList.add('placeholder-shown');
    }
  }, []); // Run once on mount

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-3 flex justify-between items-center">
          <Button variant="ghost" size="icon" onClick={() => console.log("Close button clicked")}>
            <X className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Create Post</h1>
          <Button
            onClick={handlePost}
            disabled={isPosting || (!content.trim() && totalMediaCount === 0) || isOverLimit || isUploadingMedia}
            className="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 font-semibold"
          >
            {isPosting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Post"}
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {/* User Info */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user?.user_metadata?.avatar_url || "https://placehold.co/48x48/aabbcc/ffffff?text=U"} />
            <AvatarFallback>{user?.user_metadata?.full_name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <div>
            <span className="font-semibold text-lg">{user?.user_metadata?.full_name || "Martin Kenter"}</span>
          </div>
        </div>

        {/* Main Compose Area - contentEditable div */}
        <div className="mb-4">
          <div
            ref={contentEditableRef}
            className="w-full border-0 resize-none text-lg focus:ring-0 outline-none"
            style={{ minHeight: "120px" }}
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => {
              // Store cursor position before state update
              if (contentEditableRef.current) {
                const offset = getCaretCharacterOffset(contentEditableRef.current);
                cursorPositionRef.current = { node: null, offset: offset };
              }
              // Update content state from the div's textContent
              setContent(e.currentTarget.textContent || "");
            }}
            // Placeholder logic
            data-placeholder="What do you want to talk about?"
            onFocus={(e) => {
              if (e.target.textContent === e.target.dataset.placeholder) {
                e.target.textContent = '';
                e.target.classList.remove('placeholder-shown');
              }
            }}
            onBlur={(e) => {
              if (!e.target.textContent?.trim()) {
                e.target.textContent = e.target.dataset.placeholder || '';
                e.target.classList.add('placeholder-shown');
              }
            }}
            // Set initial content if not empty, otherwise show placeholder
            dangerouslySetInnerHTML={{ __html: content ? highlightContent(content) : '' }}
          />
          {/* Custom CSS for placeholder in contentEditable div */}
          <style jsx>{`
            [contenteditable][data-placeholder]:empty:before {
              content: attr(data-placeholder);
              color: #9ca3af; /* Tailwind gray-400 */
              pointer-events: none;
              display: block; /* For multiline placeholder */
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

        {/* Media Previews */}
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
            
