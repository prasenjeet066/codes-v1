"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, UserPlus, UserCheck, Hash, TrendingUp, Clock, X, Filter, SortAsc, Grid, List } from "lucide-react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { LogOut, Menu } from "lucide-react"
import { useRouter } from "next/navigation"
import { VerificationBadge } from "@/components/badge/verification-badge"
import { PostCard } from "@/components/dashboard/post-card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { debounce } from "lodash"

interface UserProfile {
  id: string
  username: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  followers_count: number
  is_following: boolean
  is_verified?: boolean
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
}

interface Hashtag {
  tag: string
  count: number
  trending: boolean
}

export function ExploreContent() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [users, setUsers] = useState<UserProfile[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [hashtags, setHashtags] = useState<Hashtag[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("top")
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [sortBy, setSortBy] = useState("relevance")
  const [viewMode, setViewMode] = useState("list")
  const [filterType, setFilterType] = useState("all")
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
    fetchTrendingHashtags()
    fetchSuggestedUsers()
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

  const fetchTrendingHashtags = async () => {
    try {
      const { data, error } = await supabase.rpc("get_trending_hashtags", { limit_count: 10 })

      if (!error && data) {
        setHashtags(data)
      }
    } catch (error) {
      console.error("Error fetching trending hashtags:", error)
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
          is_verified
        `)
        .neq("id", user.id)
        .limit(5)

      if (!userError && userData) {
        const userIds = userData.map((u) => u.id)
        const { data: followData } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user?.id)
          .in("following_id", userIds)

        const followingIds = new Set(followData?.map((f) => f.following_id) || [])

        const { data: followerCounts } = await supabase
          .from("follows")
          .select("following_id")
          .in("following_id", userIds)

        const followerCountMap = new Map()
        followerCounts?.forEach((f) => {
          followerCountMap.set(f.following_id, (followerCountMap.get(f.following_id) || 0) + 1)
        })

        const usersWithFollowStatus = userData.map((u) => ({
          ...u,
          followers_count: followerCountMap.get(u.id) || 0,
          is_following: followingIds.has(u.id),
          is_verified: u.is_verified || false,
        }))

        setUsers(usersWithFollowStatus)
      }
    } catch (error) {
      console.error("Error fetching suggested users:", error)
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

        // Search users
        const { data: userData, error: userError } = await supabase
          .from("profiles")
          .select(`
            id,
            username,
            display_name,
            bio,
            avatar_url,
            is_verified
          `)
          .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
          .limit(20)

        if (!userError && userData) {
          const userIds = userData.map((u) => u.id)
          const { data: followData } = await supabase
            .from("follows")
            .select("following_id")
            .eq("follower_id", user?.id)
            .in("following_id", userIds)

          const followingIds = new Set(followData?.map((f) => f.following_id) || [])

          const { data: followerCounts } = await supabase
            .from("follows")
            .select("following_id")
            .in("following_id", userIds)

          const followerCountMap = new Map()
          followerCounts?.forEach((f) => {
            followerCountMap.set(f.following_id, (followerCountMap.get(f.following_id) || 0) + 1)
          })

          const usersWithFollowStatus = userData.map((u) => ({
            ...u,
            followers_count: followerCountMap.get(u.id) || 0,
            is_following: followingIds.has(u.id),
            is_verified: u.is_verified || false,
          }))

          setUsers(usersWithFollowStatus)
        }

        // Search posts
        const { data: postData, error: postError } = await supabase
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
          .ilike("content", `%${query}%`)
          .order("created_at", { ascending: false })
          .limit(20)

        if (!postError && postData) {
          const postIds = postData.map((p) => p.id)

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

          const formattedPosts = postData.map((post) => ({
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
          }))

          setPosts(formattedPosts)
        }
      } catch (error) {
        console.error("Error searching:", error)
      } finally {
        setIsLoading(false)
      }
    }, 300),
    [user?.id],
  )

  useEffect(() => {
    debouncedSearch(searchQuery)
    setShowSuggestions(searchQuery.length > 0)
  }, [searchQuery, debouncedSearch])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    saveToSearchHistory(query)
    setShowSuggestions(false)
  }

  const handleFollow = async (userId: string, isFollowing: boolean) => {
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
  }

  const handleLike = async (postId: string, isLiked: boolean) => {
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
  }

  const handleRepost = async (postId: string, isReposted: boolean) => {
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
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 bengali-font">
      {/* Mobile header */}
      <div className="lg:hidden bg-white border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold logo-font">Cōdes</h1>
        <div className="flex flex-row items-center justify-center pl-4 pr-4 py-2 text-lg outline-none border-none gap-2 bg-gray-50 rounded-full">
         
          <input
                      placeholder="Search for people, posts, or hashtags..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="outline-none border-none bg-gray-50 text-sm"
                      onFocus={() => setShowSuggestions(true)}
                    />
                    <Search className="h-4 w-4 text-gray-400" />
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          
        </div>
        
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div
          className={`${sidebarOpen ? "block" : "hidden"} lg:block fixed lg:relative inset-y-0 left-0 z-50 w-64 bg-white border-r lg:border-r-0`}
        >
          <Sidebar profile={profile} onSignOut={handleSignOut} />
        </div>

        {/* Main content */}
        <div className="flex-1 max-w-6xl mx-auto">
          <div className="border-x bg-white min-h-screen">
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b z-30">
              <div className="px-4 py-4">
                
            <div>
                
                </div>

                {/* Search Filters */}
                {searchQuery && (
                  <div className="flex items-center gap-3 mt-4 flex-wrap">
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
                )}
              </div>
            </div>

            <div className="p-4">
              {!searchQuery ? (
                // Default explore content
                <div className="space-y-8">
                  {/* Trending Section */}
                  <section>
                    <div className="flex items-center gap-2 mb-6">
                      <TrendingUp className="h-6 w-6 text-gray-800" />
                      <h3 className="text-md font-bold">Trending Now</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {hashtags.slice(0, 6).map((hashtag, index) => (
                        <Card
                          key={index}
                          className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                          onClick={() => handleSearch(`#${hashtag.tag}`)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-full">
                                  <Hash className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-semibold">#{hashtag.tag}</p>
                                  <p className="text-sm text-gray-500">{hashtag.count} posts</p>
                                </div>
                              </div>
                              {hashtag.trending && (
                                <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  Hot
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </section>

                  <Separator />

                  {/* Suggested Users */}
                  <section>
                    <div className="flex items-center gap-2 mb-6">
                      <UserPlus className="h-6 w-6 text-gray-800" />
                      <h3 className="text-md font-bold">Suggested for you</h3>
                    </div>

                    <div
                      className={`grid gap-4 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}
                    >
                      {users.slice(0, 6).map((suggestedUser) => (
                        <Card key={suggestedUser.id} className="hover:shadow-lg transition-all duration-200">
                          <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                              <Link href={`/profile/${suggestedUser.username}`}>
                                <Avatar className="h-12 w-12 cursor-pointer">
                                  <AvatarImage src={suggestedUser.avatar_url || undefined} />
                                  <AvatarFallback className="text-lg font-semibold">
                                    {suggestedUser.display_name?.charAt(0)?.toUpperCase() || "U"}
                                  </AvatarFallback>
                                </Avatar>
                              </Link>
                              <div className="flex-1 min-w-0">
                                <Link href={`/profile/${suggestedUser.username}`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-semibold truncate hover:underline">
                                      {suggestedUser.display_name}
                                    </h4>
                                    {suggestedUser.is_verified && (
                                      <VerificationBadge verified={true} size={16} className="h-4 w-4" />
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-500 truncate">@{suggestedUser.username}</p>
                                </Link>
                                {suggestedUser.bio && (
                                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{suggestedUser.bio}</p>
                                )}
                                <p className="text-xs text-gray-500 mt-2">{suggestedUser.followers_count} followers</p>
                              </div>
                              {suggestedUser.id !== user.id && (
                                <Button
                                  variant={suggestedUser.is_following ? "outline" : "default"}
                                  size="sm"
                                  onClick={() => handleFollow(suggestedUser.id, suggestedUser.is_following)}
                                  className="shrink-0"
                                >
                                  {suggestedUser.is_following ? (
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
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </section>
                </div>
              ) : (
                // Search results
                <div>
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Search results for "{searchQuery}"</h3>
                    {isLoading && (
                      <div className="flex items-center gap-2 text-gray-500">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span>Searching...</span>
                      </div>
                    )}
                  </div>

                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-6">
                      <TabsTrigger value="top" className="text-sm">
                        Top Results
                      </TabsTrigger>
                      <TabsTrigger value="people" className="text-sm">
                        People
                      </TabsTrigger>
                      <TabsTrigger value="posts" className="text-sm">
                        Posts
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="top" className="space-y-8">
                      {!isLoading && (
                        <div className="space-y-8">
                          {users.length > 0 && (
                            <section>
                              <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <UserPlus className="h-5 w-5" />
                                People ({users.length})
                              </h4>
                              <div className="grid gap-4">
                                {users.slice(0, 3).map((searchUser) => (
                                  <Card key={searchUser.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-4">
                                      <div className="flex items-center justify-between">
                                        <Link
                                          href={`/profile/${searchUser.username}`}
                                          className="flex items-center gap-3 flex-1 min-w-0"
                                        >
                                          <Avatar className="h-12 w-12">
                                            <AvatarImage src={searchUser.avatar_url || undefined} />
                                            <AvatarFallback>
                                              {searchUser.display_name?.charAt(0)?.toUpperCase() || "U"}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                              <p className="font-semibold truncate">{searchUser.display_name}</p>
                                              {searchUser.is_verified && (
                                                <VerificationBadge verified={true} size={14} className="h-3.5 w-3.5" />
                                              )}
                                            </div>
                                            <p className="text-sm text-gray-500 truncate">@{searchUser.username}</p>
                                            <p className="text-xs text-gray-500">
                                              {searchUser.followers_count} followers
                                            </p>
                                          </div>
                                        </Link>
                                        {searchUser.id !== user.id && (
                                          <Button
                                            variant={searchUser.is_following ? "outline" : "default"}
                                            size="sm"
                                            onClick={() => handleFollow(searchUser.id, searchUser.is_following)}
                                          >
                                            {searchUser.is_following ? (
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
                                        )}
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </section>
                          )}

                          {posts.length > 0 && (
                            <section>
                              <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Hash className="h-5 w-5" />
                                Posts ({posts.length})
                              </h4>
                              <div className="border rounded-lg overflow-hidden">
                                {posts.slice(0, 3).map((post) => (
                                  <div key={post.id} className="border-b last:border-b-0">
                                    <PostCard
                                      post={post as any}
                                      currentUserId={user.id}
                                      currentUser={profile}
                                      onLike={handleLike}
                                      onRepost={handleRepost}
                                      onReply={() => {}}
                                    />
                                  </div>
                                ))}
                              </div>
                            </section>
                          )}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="people">
                      {!isLoading ? (
                        users.length > 0 ? (
                          <div className="grid gap-4">
                            {users.map((searchUser) => (
                              <Card key={searchUser.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                  <div className="flex items-center justify-between">
                                    <Link
                                      href={`/profile/${searchUser.username}`}
                                      className="flex items-center gap-4 flex-1 min-w-0"
                                    >
                                      <Avatar className="h-14 w-14">
                                        <AvatarImage src={searchUser.avatar_url || undefined} />
                                        <AvatarFallback className="text-lg">
                                          {searchUser.display_name?.charAt(0)?.toUpperCase() || "U"}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <p className="font-semibold truncate text-lg">{searchUser.display_name}</p>
                                          {searchUser.is_verified && (
                                            <VerificationBadge verified={true} size={16} className="h-4 w-4" />
                                          )}
                                        </div>
                                        <p className="text-gray-500 truncate">@{searchUser.username}</p>
                                        {searchUser.bio && (
                                          <p className="text-gray-600 mt-2 line-clamp-2">{searchUser.bio}</p>
                                        )}
                                        <p className="text-sm text-gray-500 mt-2">
                                          {searchUser.followers_count} followers
                                        </p>
                                      </div>
                                    </Link>
                                    {searchUser.id !== user.id && (
                                      <Button
                                        variant={searchUser.is_following ? "outline" : "default"}
                                        onClick={() => handleFollow(searchUser.id, searchUser.is_following)}
                                      >
                                        {searchUser.is_following ? (
                                          <>
                                            <UserCheck className="h-4 w-4 mr-2" />
                                            Following
                                          </>
                                        ) : (
                                          <>
                                            <UserPlus className="h-4 w-4 mr-2" />
                                            Follow
                                          </>
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">No people found for "{searchQuery}"</p>
                            <p className="text-gray-400 text-sm mt-2">Try searching with different keywords</p>
                          </div>
                        )
                      ) : (
                        <div className="flex justify-center py-12">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="posts">
                      {!isLoading ? (
                        posts.length > 0 ? (
                          <div className="border rounded-lg overflow-hidden">
                            {posts.map((post) => (
                              <div key={post.id} className="border-b last:border-b-0">
                                <PostCard
                                  post={post as any}
                                  currentUserId={user.id}
                                  currentUser={profile}
                                  onLike={handleLike}
                                  onRepost={handleRepost}
                                  onReply={() => {}}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <Hash className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">No posts found for "{searchQuery}"</p>
                            <p className="text-gray-400 text-sm mt-2">Try searching with different keywords</p>
                          </div>
                        )
                      ) : (
                        <div className="flex justify-center py-12">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}
