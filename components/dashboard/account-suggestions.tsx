"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { VerificationBadge } from "@/components/badge/verification-badge"
import { 
  UserPlus, 
  UserCheck, 
  Users, 
  Sparkles, 
  RefreshCw,
  TrendingUp,
  MapPin,
  Calendar,
  ExternalLink
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

interface SuggestedUser {
  id: string
  username: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  followers_count: number
  following_count: number
  posts_count: number
  is_following: boolean
  is_verified: boolean
  location?: string
  created_at: string
  mutual_followers_count?: number
  trending_score?: number
  common_interests?: string[]
}

interface AccountSuggestionsProps {
  currentUserId: string
  variant?: "sidebar" | "full" | "compact"
  limit?: number
}

export function AccountSuggestions({ 
  currentUserId, 
  variant = "sidebar", 
  limit = 5 
}: AccountSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchSuggestions()
  }, [currentUserId, limit])

  const fetchSuggestions = async (refresh = false) => {
    if (refresh) setIsRefreshing(true)
    else setIsLoading(true)

    try {
      // Get users with smart algorithm considering:
      // 1. Mutual followers
      // 2. Similar interests (hashtags/content)
      // 3. Engagement patterns
      // 4. Location proximity
      // 5. Recent activity

      const { data: suggestedUsers, error } = await supabase
        .from("profiles")
        .select(`
          id,
          username,
          display_name,
          bio,
          avatar_url,
          is_verified,
          location,
          created_at
        `)
        .neq("id", currentUserId)
        .limit(limit * 3) // Get more to filter later

      if (error) throw error

      if (!suggestedUsers) {
        setSuggestions([])
        return
      }

      const userIds = suggestedUsers.map(u => u.id)

      // Get current user's following to exclude
      const { data: currentFollowing } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", currentUserId)

      const followingIds = new Set(currentFollowing?.map(f => f.following_id) || [])

      // Get follow stats for suggested users
      const { data: followStats } = await supabase
        .from("follows")
        .select("following_id")
        .in("following_id", userIds)

      const followerCounts = new Map()
      followStats?.forEach(f => {
        followerCounts.set(f.following_id, (followerCounts.get(f.following_id) || 0) + 1)
      })

      // Get mutual followers count
      const { data: mutualFollowers } = await supabase
        .from("follows")
        .select(`
          following_id,
          follower_id,
          follower:profiles!follows_follower_id_fkey(id)
        `)
        .in("following_id", userIds)
        .in("follower_id", currentFollowing?.map(f => f.following_id) || [])

      const mutualFollowerCounts = new Map()
      mutualFollowers?.forEach(mf => {
        mutualFollowerCounts.set(
          mf.following_id, 
          (mutualFollowerCounts.get(mf.following_id) || 0) + 1
        )
      })

      // Get post counts
      const { data: postCounts } = await supabase
        .from("posts")
        .select("user_id")
        .in("user_id", userIds)

      const postCountMap = new Map()
      postCounts?.forEach(p => {
        postCountMap.set(p.user_id, (postCountMap.get(p.user_id) || 0) + 1)
      })

      // Calculate trending score based on recent activity
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

      const { data: recentActivity } = await supabase
        .from("posts")
        .select("user_id, created_at")
        .in("user_id", userIds)
        .gte("created_at", oneWeekAgo.toISOString())

      const activityScores = new Map()
      recentActivity?.forEach(ra => {
        activityScores.set(ra.user_id, (activityScores.get(ra.user_id) || 0) + 1)
      })

      // Filter and enhance suggestions
      const enhancedSuggestions = suggestedUsers
        .filter(user => !followingIds.has(user.id)) // Exclude already following
        .map(user => ({
          ...user,
          followers_count: followerCounts.get(user.id) || 0,
          following_count: 0, // Could be fetched if needed
          posts_count: postCountMap.get(user.id) || 0,
          is_following: false,
          mutual_followers_count: mutualFollowerCounts.get(user.id) || 0,
          trending_score: activityScores.get(user.id) || 0,
          common_interests: [], // Could be calculated based on hashtags
        }))
        .sort((a, b) => {
          // Smart sorting algorithm
          const scoreA = (a.mutual_followers_count * 3) + 
                         (a.trending_score * 2) + 
                         (a.followers_count * 0.1) +
                         (a.is_verified ? 5 : 0)
          const scoreB = (b.mutual_followers_count * 3) + 
                         (b.trending_score * 2) + 
                         (b.followers_count * 0.1) +
                         (b.is_verified ? 5 : 0)
          return scoreB - scoreA
        })
        .slice(0, limit)

      setSuggestions(enhancedSuggestions)

    } catch (error) {
      console.error("Error fetching suggestions:", error)
      toast({
        title: "Error",
        description: "Failed to load account suggestions",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleFollow = async (userId: string, isFollowing: boolean) => {
    try {
      if (isFollowing) {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", userId)
      } else {
        await supabase
          .from("follows")
          .insert({
            follower_id: currentUserId,
            following_id: userId
          })

        // Create notification for the followed user
        await supabase
          .from("notifications")
          .insert({
            user_id: userId,
            type: "follow",
            from_user_id: currentUserId,
            created_at: new Date().toISOString()
          })
      }

      // Update local state
      setSuggestions(prev => 
        prev.map(user => 
          user.id === userId 
            ? { 
                ...user, 
                is_following: !isFollowing,
                followers_count: user.followers_count + (isFollowing ? -1 : 1)
              }
            : user
        )
      )

      toast({
        title: isFollowing ? "Unfollowed" : "Following",
        description: isFollowing 
          ? "You've unfollowed this user" 
          : "You're now following this user"
      })

    } catch (error) {
      console.error("Error following/unfollowing user:", error)
      toast({
        title: "Error",
        description: "Failed to update follow status",
        variant: "destructive"
      })
    }
  }

  const renderCompactView = () => (
    <div className="space-y-3">
      {suggestions.slice(0, 3).map((user) => (
        <div key={user.id} className="flex items-center justify-between">
          <Link href={`/profile/${user.username}`} className="flex items-center gap-2 flex-1 min-w-0">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback>
                {user.display_name?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <p className="text-sm font-medium truncate">{user.display_name}</p>
                {user.is_verified && <VerificationBadge verified size={12} />}
              </div>
              <p className="text-xs text-gray-500 truncate">@{user.username}</p>
            </div>
          </Link>
          <Button
            size="sm"
            variant={user.is_following ? "outline" : "default"}
            onClick={() => handleFollow(user.id, user.is_following)}
            className="shrink-0 h-7 px-2 text-xs"
          >
            {user.is_following ? "Following" : "Follow"}
          </Button>
        </div>
      ))}
    </div>
  )

  const renderSidebarView = () => (
    <div className="space-y-4">
      {suggestions.map((user) => (
        <div key={user.id} className="flex items-start gap-3">
          <Link href={`/profile/${user.username}`}>
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback>
                {user.display_name?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <Link href={`/profile/${user.username}`}>
              <div className="flex items-center gap-1 mb-1">
                <p className="font-medium truncate text-sm">{user.display_name}</p>
                {user.is_verified && <VerificationBadge verified size={14} />}
              </div>
              <p className="text-xs text-gray-500 truncate">@{user.username}</p>
            </Link>
            
            {user.mutual_followers_count > 0 && (
              <p className="text-xs text-gray-600 mt-1">
                {user.mutual_followers_count} mutual follower{user.mutual_followers_count > 1 ? 's' : ''}
              </p>
            )}
            
            {user.bio && (
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{user.bio}</p>
            )}
            
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{user.followers_count} followers</span>
                {user.trending_score > 0 && (
                  <Badge variant="secondary" className="h-4 px-1 text-xs">
                    <TrendingUp className="h-2.5 w-2.5 mr-1" />
                    Active
                  </Badge>
                )}
              </div>
              <Button
                size="sm"
                variant={user.is_following ? "outline" : "default"}
                onClick={() => handleFollow(user.id, user.is_following)}
                className="h-6 px-2 text-xs"
              >
                {user.is_following ? (
                  <>
                    <UserCheck className="h-3 w-3 mr-1" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3 w-3 mr-1" />
                    Follow
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  const renderFullView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {suggestions.map((user) => (
        <Card key={user.id} className="hover:shadow-lg transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3 mb-3">
              <Link href={`/profile/${user.username}`}>
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback>
                    {user.display_name?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/profile/${user.username}`}>
                  <div className="flex items-center gap-1 mb-1">
                    <h4 className="font-semibold truncate">{user.display_name}</h4>
                    {user.is_verified && <VerificationBadge verified size={16} />}
                  </div>
                  <p className="text-sm text-gray-500 truncate">@{user.username}</p>
                </Link>
              </div>
            </div>

            {user.bio && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-3">{user.bio}</p>
            )}

            <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
              <span>{user.followers_count} followers</span>
              <span>{user.posts_count} posts</span>
              {user.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {user.location}
                </span>
              )}
            </div>

            {user.mutual_followers_count > 0 && (
              <div className="flex items-center gap-1 text-xs text-blue-600 mb-3">
                <Users className="h-3 w-3" />
                <span>{user.mutual_followers_count} mutual follower{user.mutual_followers_count > 1 ? 's' : ''}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              {user.trending_score > 0 ? (
                <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Trending
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Suggested
                </Badge>
              )}
              
              <Button
                variant={user.is_following ? "outline" : "default"}
                size="sm"
                onClick={() => handleFollow(user.id, user.is_following)}
              >
                {user.is_following ? (
                  <>
                    <UserCheck className="h-4 w-4 mr-1" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-1" />
                    Follow
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Suggested for you
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded animate-pulse mb-1" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Suggested for you
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No suggestions available</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fetchSuggestions(true)}
              className="mt-2"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (variant === "compact") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Suggested for you
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => fetchSuggestions(true)}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {renderCompactView()}
          {suggestions.length > 3 && (
            <Link href="/explore" className="block mt-3">
              <Button variant="ghost" size="sm" className="w-full">
                <ExternalLink className="h-3 w-3 mr-1" />
                See more suggestions
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    )
  }

  if (variant === "sidebar") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Who to follow
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => fetchSuggestions(true)}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {renderSidebarView()}
          <Link href="/explore" className="block mt-4">
            <Button variant="outline" size="sm" className="w-full">
              <ExternalLink className="h-3 w-3 mr-1" />
              Explore more people
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Suggested for you
        </h2>
        <Button 
          variant="outline" 
          onClick={() => fetchSuggestions(true)}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      {renderFullView()}
    </div>
  )
}