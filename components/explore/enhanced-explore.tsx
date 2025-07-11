"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Search, 
  UserPlus, 
  UserCheck, 
  Hash, 
  TrendingUp, 
  Clock, 
  X, 
  Filter, 
  SortAsc, 
  Grid, 
  List,
  MapPin,
  Calendar,
  Star,
  Flame,
  Sparkles,
  Eye,
  MessageSquare,
  Repeat,
  Heart,
  Share,
  Users,
  Globe,
  Award,
  Target,
  Zap
} from "lucide-react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { useRouter } from "next/navigation"
import { VerificationBadge } from "@/components/badge/verification-badge"
import { PostCard } from "@/components/dashboard/post-card"
import { AccountSuggestions } from "@/components/dashboard/account-suggestions"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { debounce } from "lodash"
import { toast } from "sonner"

interface UserProfile {
  id: string
  username: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  followers_count: number
  following_count: number
  posts_count: number
  is_following: boolean
  is_verified?: boolean
  location?: string
  created_at: string
  engagement_rate?: number
  trending_score?: number
}

interface Post {
  id: string
  content: string
  created_at: string
  user_id: string
  username: string
  display_name: string
  avatar_url: string | null
  likes_count: number
  reposts_count: number
  replies_count: number
  is_liked: boolean
  is_reposted: boolean
  is_verified: boolean
  media_urls: string[] | null
  media_type: string | null
  engagement_score?: number
}

interface Hashtag {
  tag: string
  count: number
  trending: boolean
  growth_rate?: number
  category?: string
}

interface TrendingTopic {
  id: string
  name: string
  category: string
  posts_count: number
  engagement_rate: number
  growth_percentage: number
  related_tags: string[]
}

export function EnhancedExplore() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [users, setUsers] = useState<UserProfile[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [hashtags, setHashtags] = useState<Hashtag[]>([])
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("trending")
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [sortBy, setSortBy] = useState("relevance")
  const [viewMode, setViewMode] = useState("list")
  const [filterType, setFilterType] = useState("all")
  const [timeFilter, setTimeFilter] = useState("today")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
        setProfile(profile)
      }
    }
    getUser()
    loadSearchHistory()
    fetchTrendingContent()
  }, [])

  const loadSearchHistory = () => {
    const history = localStorage.getItem("searchHistory")
    if (history) {
      setSearchHistory(JSON.parse(history))
    }
  }

  const saveToSearchHistory = (query: string) => {
    if (!query.trim()) return
    const newHistory = [query, ...searchHistory.filter((h) => h !== query)].slice(0, 10)
    setSearchHistory(newHistory)
    localStorage.setItem("searchHistory", JSON.stringify(newHistory))
  }

  const clearSearchHistory = () => {
    setSearchHistory([])
    localStorage.removeItem("searchHistory")
  }

  const fetchTrendingContent = async () => {
    try {
      setIsLoading(true)

      // Fetch trending hashtags with enhanced data
      const { data: hashtagData, error: hashtagError } = await supabase
        .rpc("get_trending_hashtags_enhanced", { 
          limit_count: 20,
          time_filter: timeFilter 
        })

      if (!hashtagError && hashtagData) {
        setHashtags(hashtagData)
      }

      // Fetch trending posts
      const { data: trendingPosts, error: postsError } = await supabase
        .from("posts")
        .select(`
          id,
          content,
          created_at,
          user_id,
          media_urls,
          media_type,
          profiles!posts_user_id_fkey(username, display_name, avatar_url, is_verified)
        `)
        .gte("created_at", getTimeFilterDate())
        .order("created_at", { ascending: false })
        .limit(50)

      if (!postsError && trendingPosts) {
        const postIds = trendingPosts.map(p => p.id)

        // Get engagement data
        const [likesData, repostsData, repliesData] = await Promise.all([
          supabase.from("likes").select("post_id, user_id").in("post_id", postIds),
          supabase.from("posts").select("repost_of, user_id").not("repost_of", "is", null).in("repost_of", postIds),
          supabase.from("posts").select("reply_to").not("reply_to", "is", null).in("reply_to", postIds),
        ])

        const likesMap = new Map()
        const userLikesSet = new Set()
        const repostsMap = new Map()
        const userRepostsSet = new Set()
        const repliesMap = new Map()

        likesData.data?.forEach((like) => {
          likesMap.set(like.post_id, (likesMap.get(like.post_id) || 0) + 1)
          if (like.user_id === user?.id) {
            userLikesSet.add(like.post_id)
          }
        })

        repostsData.data?.forEach((repost) => {
          repostsMap.set(repost.repost_of, (repostsMap.get(repost.repost_of) || 0) + 1)
          if (repost.user_id === user?.id) {
            userRepostsSet.add(repost.repost_of)
          }
        })

        repliesData.data?.forEach((reply) => {
          repliesMap.set(reply.reply_to, (repliesMap.get(reply.reply_to) || 0) + 1)
        })

        const formattedPosts = trendingPosts.map((post) => ({
          id: post.id,
          content: post.content,
          created_at: post.created_at,
          user_id: post.user_id,
          username: post.profiles?.username || "unknown",
          display_name: post.profiles?.display_name || "Unknown User",
          avatar_url: post.profiles?.avatar_url,
          likes_count: likesMap.get(post.id) || 0,
          is_liked: userLikesSet.has(post.id),
          reposts_count: repostsMap.get(post.id) || 0,
          is_reposted: userRepostsSet.has(post.id),
          replies_count: repliesMap.get(post.id) || 0,
          is_verified: post.profiles?.is_verified || false,
          media_urls: post.media_urls,
          media_type: post.media_type,
          engagement_score: (likesMap.get(post.id) || 0) + (repostsMap.get(post.id) || 0) + (repliesMap.get(post.id) || 0)
        }))

        // Sort by engagement score
        const sortedPosts = formattedPosts.sort((a, b) => (b.engagement_score || 0) - (a.engagement_score || 0))
        setPosts(sortedPosts)
      }

      // Fetch suggested users
      await fetchSuggestedUsers()

    } catch (error) {
      console.error("Error fetching trending content:", error)
      toast.error("Failed to load trending content")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSuggestedUsers = async () => {
    if (!user?.id) return

    try {
      const { data: userData, error: userError } = await supabase
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
        .neq("id", user.id)
        .limit(20)

      if (!userError && userData) {
        const userIds = userData.map((u) => u.id)
        
        // Get follow status
        const { data: followData } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user?.id)
          .in("following_id", userIds)

        const followingIds = new Set(followData?.map((f) => f.following_id) || [])

        // Get engagement data
        const { data: followerCounts } = await supabase
          .from("follows")
          .select("following_id")
          .in("following_id", userIds)

        const followerCountMap = new Map()
        followerCounts?.forEach((f) => {
          followerCountMap.set(f.following_id, (followerCountMap.get(f.following_id) || 0) + 1)
        })

        // Get post counts
        const { data: postCounts } = await supabase
          .from("posts")
          .select("user_id")
          .in("user_id", userIds)

        const postCountMap = new Map()
        postCounts?.forEach((p) => {
          postCountMap.set(p.user_id, (postCountMap.get(p.user_id) || 0) + 1)
        })

        const usersWithFollowStatus = userData
          .filter(u => !followingIds.has(u.id))
          .map((u) => ({
            ...u,
            followers_count: followerCountMap.get(u.id) || 0,
            following_count: 0,
            posts_count: postCountMap.get(u.id) || 0,
            is_following: false,
            is_verified: u.is_verified || false,
          }))
          .sort((a, b) => (b.followers_count || 0) - (a.followers_count || 0))

        setUsers(usersWithFollowStatus)
      }
    } catch (error) {
      console.error("Error fetching suggested users:", error)
    }
  }

  const getTimeFilterDate = () => {
    const now = new Date()
    switch (timeFilter) {
      case "hour": 
        return new Date(now.getTime() - 60 * 60 * 1000).toISOString()
      case "today":
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      case "week":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      case "month":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      default:
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    }
  }

  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setUsers([])
        setPosts([])
        setSuggestions([])
        setShowSuggestions(false)
        return
      }

      setIsLoading(true)
      try {
        // Search suggestions
        const { data: suggestionData } = await supabase
          .from("profiles")
          .select("username, display_name")
          .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
          .limit(5)

        if (suggestionData) {
          const suggestions = suggestionData.map((u) => u.username)
          setSuggestions(suggestions)
        }

        // Comprehensive search logic here...
        await performSearch(query)

      } catch (error) {
        console.error("Error searching:", error)
        toast.error("Search failed")
      } finally {
        setIsLoading(false)
      }
    }, 300),
    [user?.id, filterType, sortBy]
  )

  const performSearch = async (query: string) => {
    // Enhanced search implementation
    // This would include users, posts, hashtags, and topics
  }

  const handleFollow = async (userId: string, isFollowing: boolean) => {
    try {
      if (isFollowing) {
        await supabase.from("follows").delete().eq("follower_id", user?.id).eq("following_id", userId)
      } else {
        await supabase.from("follows").insert({ follower_id: user?.id, following_id: userId })
      }

      setUsers(
        users.map((u) =>
          u.id === userId
            ? { ...u, is_following: !isFollowing, followers_count: u.followers_count + (isFollowing ? -1 : 1) }
            : u,
        ),
      )

      toast.success(isFollowing ? "Unfollowed user" : "Following user")

    } catch (error) {
      console.error("Error following/unfollowing user:", error)
      toast.error("Failed to update follow status")
    }
  }

  const handleLike = async (postId: string, isLiked: boolean) => {
    try {
      if (isLiked) {
        await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", user?.id)
      } else {
        await supabase.from("likes").insert({ post_id: postId, user_id: user?.id })
      }

      setPosts(
        posts.map((post) =>
          post.id === postId ? { ...post, is_liked: !isLiked, likes_count: post.likes_count + (isLiked ? -1 : 1) } : post,
        ),
      )
    } catch (error) {
      console.error("Error liking post:", error)
    }
  }

  const handleRepost = async (postId: string, isReposted: boolean) => {
    try {
      if (isReposted) {
        await supabase.from("posts").delete().eq("repost_of", postId).eq("user_id", user?.id)
      } else {
        await supabase.from("posts").insert({
          repost_of: postId,
          user_id: user?.id,
          content: "",
        })
      }

      setPosts(
        posts.map((post) =>
          post.id === postId
            ? {
                ...post,
                is_reposted: !isReposted,
                reposts_count: post.reposts_count + (isReposted ? -1 : 1),
              }
            : post,
        ),
      )
    } catch (error) {
      console.error("Error reposting:", error)
    }
  }

  const renderTrendingSection = () => (
    <div className="space-y-6">
      {/* Time filter */}
      <div className="flex items-center gap-4">
        <Select value={timeFilter} onValueChange={setTimeFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hour">Last Hour</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
        
        <Button 
          variant="outline" 
          onClick={fetchTrendingContent}
          disabled={isLoading}
        >
          Refresh
        </Button>
      </div>

      {/* Trending Topics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Trending Topics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hashtags.slice(0, 6).map((hashtag, index) => (
              <Card
                key={index}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                onClick={() => {
                  setSearchQuery(`#${hashtag.tag}`)
                  setActiveTab("search")
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-gradient-to-r from-orange-100 to-red-100 rounded-full">
                        <Hash className="h-4 w-4 text-orange-600" />
                      </div>
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                    </div>
                    {hashtag.trending && (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Hot
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-lg">#{hashtag.tag}</h3>
                  <p className="text-sm text-gray-500">{hashtag.count} posts</p>
                  {hashtag.growth_rate && hashtag.growth_rate > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      +{hashtag.growth_rate}% growth
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trending Posts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Trending Posts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {posts.slice(0, 10).map((post) => (
              <div key={post.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <PostCard
                  post={post as any}
                  currentUserId={user?.id}
                  currentUser={profile}
                  onLike={handleLike}
                  onRepost={handleRepost}
                  onReply={() => {}}
                />
                {post.engagement_score && post.engagement_score > 10 && (
                  <div className="px-4 pb-2">
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                      <Star className="h-3 w-3 mr-1" />
                      High Engagement
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderSearchResults = () => (
    <div className="space-y-6">
      {searchQuery && (
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">Search results for "{searchQuery}"</h3>
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32">
                <SortAsc className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-28">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="media">With Media</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <Tabs value="top" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="top">Top Results</TabsTrigger>
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
        </TabsList>

        <TabsContent value="top" className="space-y-6">
          {/* Top search results would go here */}
        </TabsContent>

        <TabsContent value="people">
          {/* People search results would go here */}
        </TabsContent>

        <TabsContent value="posts">
          {/* Posts search results would go here */}
        </TabsContent>
      </Tabs>
    </div>
  )

  const renderDiscoverSection = () => (
    <div className="space-y-6">
      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Discover by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {["Technology", "Science", "Art", "Music", "Sports", "Food", "Travel", "Books"].map((category) => (
              <Button
                key={category}
                variant="outline"
                className="h-20 flex flex-col items-center gap-2"
                onClick={() => {
                  setCategoryFilter(category.toLowerCase())
                  setActiveTab("trending")
                }}
              >
                <Globe className="h-6 w-6" />
                <span className="text-sm">{category}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Account suggestions with full view */}
      <AccountSuggestions 
        currentUserId={user?.id} 
        variant="full" 
        limit={12}
      />
    </div>
  )

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="lg:hidden bg-white border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">Explore</h1>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search for people, posts, or hashtags..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                debouncedSearch(e.target.value)
              }}
              onFocus={() => setShowSuggestions(true)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="hidden lg:block w-64 border-r min-h-screen sticky top-0">
          <Sidebar profile={profile} onSignOut={() => supabase.auth.signOut()} />
        </div>

        {/* Main content */}
        <div className="flex-1 max-w-4xl mx-auto">
          <div className="border-x bg-white min-h-screen">
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b z-30">
              <div className="px-6 py-4">
                <div className="hidden lg:block mb-4">
                  <h1 className="text-2xl font-bold mb-2">Explore</h1>
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search for people, posts, or hashtags..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        debouncedSearch(e.target.value)
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="trending" className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Trending
                    </TabsTrigger>
                    <TabsTrigger value="discover" className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Discover
                    </TabsTrigger>
                    <TabsTrigger value="search" className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Search
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            <div className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsContent value="trending">
                  {renderTrendingSection()}
                </TabsContent>

                <TabsContent value="discover">
                  {renderDiscoverSection()}
                </TabsContent>

                <TabsContent value="search">
                  {renderSearchResults()}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="hidden xl:block w-80 p-6 space-y-6">
          <AccountSuggestions 
            currentUserId={user.id} 
            variant="sidebar" 
            limit={5}
          />
        </div>
      </div>
    </div>
  )
}