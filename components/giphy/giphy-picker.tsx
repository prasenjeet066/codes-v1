"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, X, Loader2 } from "lucide-react"

interface GiphyPickerProps {
  onGifSelect: (gif: any) => void
  onStickerSelect: (sticker: any) => void
  onClose: () => void
}

const GIPHY_API_KEY = "j5e65Yg6H9qAOCKrZYyJr9Odyo9oGY9L"
const GIPHY_BASE_URL = "https://api.giphy.com/v1"

export function GiphyPicker({ onGifSelect, onStickerSelect, onClose }: GiphyPickerProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [gifs, setGifs] = useState<any[]>([])
  const [stickers, setStickers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("gifs")

  // Fetch trending GIFs and stickers on mount
  useEffect(() => {
    fetchTrending()
  }, [])

  // Search when search term changes
  useEffect(() => {
    if (searchTerm.trim()) {
      const debounceTimer = setTimeout(() => {
        searchMedia(searchTerm)
      }, 500)
      return () => clearTimeout(debounceTimer)
    } else {
      fetchTrending()
    }
  }, [searchTerm])

  const fetchTrending = async () => {
    setIsLoading(true)
    try {
      // Fetch trending GIFs
      const gifsResponse = await fetch(`${GIPHY_BASE_URL}/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`)
      const gifsData = await gifsResponse.json()

      // Fetch trending stickers
      const stickersResponse = await fetch(
        `${GIPHY_BASE_URL}/stickers/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`,
      )
      const stickersData = await stickersResponse.json()

      setGifs(gifsData.data || [])
      setStickers(stickersData.data || [])
    } catch (error) {
      console.error("Error fetching trending media:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const searchMedia = async (query: string) => {
    setIsLoading(true)
    try {
      // Search GIFs
      const gifsResponse = await fetch(
        `${GIPHY_BASE_URL}/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=g`,
      )
      const gifsData = await gifsResponse.json()

      // Search stickers
      const stickersResponse = await fetch(
        `${GIPHY_BASE_URL}/stickers/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=g`,
      )
      const stickersData = await stickersResponse.json()

      setGifs(gifsData.data || [])
      setStickers(stickersData.data || [])
    } catch (error) {
      console.error("Error searching media:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGifClick = (gif: any) => {
    if (activeTab === "gifs") {
      onGifSelect(gif)
    } else {
      onStickerSelect(gif)
    }
  }

  return (
    <div className="bg-white p-4 w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-left">Add GIF or Sticker</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Search input */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder="Search GIFs and stickers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs for GIFs and Stickers */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="gifs">GIFs</TabsTrigger>
          <TabsTrigger value="stickers">Stickers</TabsTrigger>
        </TabsList>

        <TabsContent value="gifs" className="mt-4">
          <div className="h-64 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {gifs.map((gif) => (
                  <div
                    key={gif.id}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleGifClick(gif)}
                  >
                    <img
                      src={gif.images.fixed_height_small.url || "/placeholder.svg"}
                      alt={gif.title}
                      className="w-full h-20 object-cover rounded"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="stickers" className="mt-4">
          <div className="h-64 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {stickers.map((sticker) => (
                  <div
                    key={sticker.id}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleGifClick(sticker)}
                  >
                    <img
                      src={sticker.images.fixed_height_small.url || "/placeholder.svg"}
                      alt={sticker.title}
                      className="w-full h-20 object-cover rounded"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Powered by Giphy */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">Powered by GIPHY</p>
      </div>
    </div>
  )
}
