"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase/client"
import { Search, UserPlus, UserCheck } from "lucide-react"
import Link from "next/link"
import { VerificationBadge } from "@/components/badge/verification-badge"

interface SearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface User {
  id: string
  username: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  followers_count: number
  is_following: boolean
  is_verified: boolean
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    getUser()
  }, [])

  const searchUsers = async () => {
    if (!searchQuery.trim() || !currentUser) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          username,
          display_name,
          bio,
          avatar_url,
          is_verified
        `)
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .limit(20)

      if (error) {
        console.error("Error searching users:", error)
      } else {
        // Check if current user is following each user
        const userIds = data?.map((u) => u.id) || []
        const { data: followData } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", currentUser.id)
          .in("following_id", userIds)

        const followingIds = new Set(followData?.map((f) => f.following_id) || [])

        // Get follower counts
        const { data: followerCounts } = await supabase
          .from("follows")
          .select("following_id")
          .in("following_id", userIds)

        const followerCountMap = new Map()
        followerCounts?.forEach((f) => {
          followerCountMap.set(f.following_id, (followerCountMap.get(f.following_id) || 0) + 1)
        })

        const usersWithFollowStatus =
          data?.map((u) => ({
            ...u,
            followers_count: followerCountMap.get(u.id) || 0,
            is_following: followingIds.has(u.id),
            is_verified: u.is_verified || false,
          })) || []

        setUsers(usersWithFollowStatus)
      }
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFollow = async (userId: string, isFollowing: boolean) => {
    if (!currentUser) return

    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", currentUser.id).eq("following_id", userId)
    } else {
      await supabase.from("follows").insert({ follower_id: currentUser.id, following_id: userId })
    }

    // Update local state
    setUsers(
      users.map((u) =>
        u.id === userId
          ? { ...u, is_following: !isFollowing, followers_count: u.followers_count + (isFollowing ? -1 : 1) }
          : u,
      ),
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bengali-font max-w-sm lg:max-w-md mx-4 lg:mx-auto">
        <DialogHeader>
          <DialogTitle className="text-lg lg:text-xl">ব্যবহারকারী খুঁজুন</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="নাম বা ইউজারনেম দিয়ে খুঁজুন"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-sm lg:text-base"
                onKeyPress={(e) => e.key === "Enter" && searchUsers()}
              />
            </div>
            <Button onClick={searchUsers} disabled={isLoading} size="sm" className="px-3 lg:px-4">
              {isLoading ? "খুঁজছি..." : "খুঁজুন"}
            </Button>
          </div>

          {users.length > 0 && (
            <div className="space-y-3 max-h-80 lg:max-h-96 overflow-y-auto">
              {users.map((searchUser) => (
                <div key={searchUser.id} className="flex items-center justify-between p-2 lg:p-3 border rounded-lg">
                  <Link
                    href={`/profile/${searchUser.username}`}
                    className="flex items-center gap-2 lg:gap-3 flex-1 min-w-0"
                    onClick={() => onOpenChange(false)}
                  >
                    <Avatar className="h-10 w-10 lg:h-12 lg:w-12 flex-shrink-0">
                      <AvatarImage src={searchUser.avatar_url || undefined} />
                      <AvatarFallback>{searchUser.display_name?.charAt(0)?.toUpperCase() || "ব"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm lg:text-base truncate flex items-center gap-1">
                        {searchUser.display_name}
                        {searchUser.is_verified && <VerificationBadge verified={true} size={12} className="h-3 w-3" />}
                      </p>
                      <p className="text-xs lg:text-sm text-gray-500 truncate">@{searchUser.username}</p>
                      {searchUser.bio && (
                        <p className="text-xs lg:text-sm text-gray-600 mt-1 line-clamp-1">{searchUser.bio}</p>
                      )}
                      <p className="text-xs text-gray-500">{searchUser.followers_count} অনুসরণকারী</p>
                    </div>
                  </Link>
                  {searchUser.id !== currentUser?.id && (
                    <Button
                      variant={searchUser.is_following ? "outline" : "default"}
                      size="sm"
                      className="ml-2 text-xs lg:text-sm px-2 lg:px-3"
                      onClick={() => handleFollow(searchUser.id, searchUser.is_following)}
                    >
                      {searchUser.is_following ? (
                        <>
                          <UserCheck className="h-3 w-3 lg:h-4 lg:w-4 mr-1" />
                          অনুসরণ করছেন
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-3 w-3 lg:h-4 lg:w-4 mr-1" />
                          অনুসরণ করুন
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
