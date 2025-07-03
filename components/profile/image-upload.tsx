"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"
import { Camera, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface ImageUploadProps {
  userId: string
  currentImageUrl?: string | null
  type: "avatar" | "cover"
  onUploadComplete: (url: string) => void
  className?: string
  children?: React.ReactNode
}

export function ImageUpload({
  userId,
  currentImageUrl,
  type,
  onUploadComplete,
  className = "",
  children,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.")
      }

      const file = event.target.files[0]

      // Validate file type
      if (!file.type.startsWith("image/")) {
        throw new Error("Please select an image file.")
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Image size should be less than 5MB.")
      }

      const fileExt = file.name.split(".").pop()
      const fileName = `${userId}/${Date.now()}.${fileExt}`
      const bucket = type === "avatar" ? "avatars" : "covers"

      // Delete old image if exists
      if (currentImageUrl) {
        const oldPath = currentImageUrl.split("/").pop()
        if (oldPath) {
          await supabase.storage.from(bucket).remove([`${userId}/${oldPath}`])
        }
      }

      // Upload new image
      const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file)

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data } = supabase.storage.from(bucket).getPublicUrl(fileName)

      onUploadComplete(data.publicUrl)
    } catch (error) {
      console.error("Error uploading image:", error)
      alert(error instanceof Error ? error.message : "Error uploading image")
    } finally {
      setUploading(false)
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  if (type === "avatar") {
    return (
      <div className={`relative ${className}`}>
        <Avatar className="w-20 h-20 cursor-pointer" onClick={handleClick}>
          <AvatarImage src={currentImageUrl || undefined} />
          <AvatarFallback className="text-2xl">{children}</AvatarFallback>
        </Avatar>
        <Button
          size="sm"
          variant="secondary"
          className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
          onClick={handleClick}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={uploadImage}
          className="hidden"
          disabled={uploading}
        />
      </div>
    )
  }

  // Cover image
  return (
    <div className={`relative ${className}`}>
      <div
        className="w-full h-48 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg cursor-pointer flex items-center justify-center overflow-hidden"
        onClick={handleClick}
        style={{
          backgroundImage: currentImageUrl ? `url(${currentImageUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {!currentImageUrl && (
          <div className="text-white text-center">
            <Camera className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">কভার ছবি যোগ করুন</p>
          </div>
        )}
        <Button
          size="sm"
          variant="secondary"
          className="absolute top-2 right-2 rounded-full"
          onClick={handleClick}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={uploadImage}
        className="hidden"
        disabled={uploading}
      />
    </div>
  )
}
