"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { supabase } from "@/lib/supabase/client"
import { Loader2, X, Quote } from "lucide-react"
import type { Post } from "@/types/post"

interface RepostDialogProps {
  isOpen: boolean
  onClose: () => void
  post: Post
  currentUser: any
  onRepost: () => void
}

export function RepostDialog({ isOpen, onClose, post, currentUser, onRepost }: RepostDialogProps) {
  const [content, setContent] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

  const handleSimpleRepost = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase.from("posts").insert({
        user_id: currentUser.id,
        content: "",
        repost_of: post.id,
      })

      if (!error) {
        onRepost()
        onClose()
      }
    } catch (error) {
      console.error("Error reposting:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuoteRepost = async () => {
    if (!content.trim()) return

    setIsLoading(true)
    try {
      const { error } = await supabase.from("posts").insert({
        user_id: currentUser.id,
        content: content.trim(),
        repost_of: post.id,
      })

      if (!error) {
        onRepost()
        onClose()
        setContent("")
      }
    } catch (error) {
      console.error("Error quote reposting:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Repost</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            {/* Simple Repost Button */}
            <Button
              onClick={handleSimpleRepost}
              disabled={isLoading}
              className="w-full bg-transparent"
              variant="outline"
            >
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Quote className="h-4 w-4 mr-2" />}
              Repost
            </Button>

            {/* Quote Repost Section */}
            <div className="border-t pt-4">
              <div className="flex gap-3 mb-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={currentUser?.avatar_url || "/placeholder.svg"} />
                  <AvatarFallback>{currentUser?.display_name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Textarea
                    placeholder="Add a comment..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[100px] resize-none"
                  />
                </div>
              </div>

              {/* Original Post Preview */}
              <div className="border rounded-lg p-3 bg-gray-50">
                <div className="flex gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={post.avatar_url || undefined} />
                    <AvatarFallback>{post.display_name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-1 text-sm">
                      <span className="font-semibold">{post.display_name}</span>
                      <span className="text-gray-500">@{post.username}</span>
                    </div>
                    <p className="text-sm mt-1">{post.content}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleQuoteRepost} disabled={isLoading || !content.trim()}>
                  {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Quote Repost
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
