export interface Post {
  id: string
  content: string
  created_at: string
  user_id: string
  username: string
  display_name: string
  avatar_url: string | null
  likes_count: number
  is_liked: boolean
  reposts_count: number
  is_reposted: boolean
  replies_count: number
  reply_to: string | null
  media_urls: string[] | null
  media_type: string | null
  is_repost: boolean
  repost_of: string | null
  reposted_by: string | null
  post_user_id: string | null
  post_username: string | null
  post_display_name: string | null
  post_created_at: string | null
  repost_created_at: string | null
  is_verified: boolean
  is_pinned?: boolean
}
