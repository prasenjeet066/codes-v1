"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, ZoomIn, ZoomOut, RotateCw, Download } from "lucide-react"

interface ImageViewerProps {
  src: string
  alt: string
  isOpen: boolean
  onClose: () => void
}

export function ImageViewer({ src, alt, isOpen, onClose }: ImageViewerProps) {
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3))
  }

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.25))
  }

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = src
    link.download = alt || "image"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const resetTransform = () => {
    setScale(1)
    setRotation(0)
  }

  if (!isOpen) return null

  return (
    <div className="image-viewer-overlay animate-fade-in" onClick={onClose}>
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={handleZoomOut}
          className="bg-black/50 text-white hover:bg-black/70"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={handleZoomIn}
          className="bg-black/50 text-white hover:bg-black/70"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={handleRotate}
          className="bg-black/50 text-white hover:bg-black/70"
        >
          <RotateCw className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={handleDownload}
          className="bg-black/50 text-white hover:bg-black/70"
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" onClick={onClose} className="bg-black/50 text-white hover:bg-black/70">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
        <Button variant="secondary" onClick={resetTransform} className="bg-black/50 text-white hover:bg-black/70">
          Reset View
        </Button>
      </div>

      <img
        src={src || "/placeholder.svg"}
        alt={alt}
        className="image-viewer-content cursor-zoom-in"
        style={{
          transform: `scale(${scale}) rotate(${rotation}deg)`,
          transition: "transform 0.3s ease",
        }}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={handleZoomIn}
      />
    </div>
  )
}
