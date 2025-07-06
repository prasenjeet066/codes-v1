import type { Post } from "@/types/post"

interface UserInteraction {
  user_id: string
  target_user_id: string
  interaction_type: 'like' | 'repost' | 'reply' | 'follow' | 'view'
  weight: number
  created_at: string
}

export const calculateEngagementScore = (post: Post): number => {
  const now = new Date()
  const postTime = new Date(post.repost_created_at || post.created_at)
  const hoursOld = (now.getTime() - postTime.getTime()) / (1000 * 60 * 60)
  
  // Time decay factor (newer posts get higher scores)
  const timeDecayFactor = Math.exp(-hoursOld / 24) // Decay over 24 hours
  
  // Engagement metrics
  const totalEngagements = post.likes_count + post.reposts_count + (post.replies_count * 2)
  const engagementRate = totalEngagements / Math.max(post.views_count || 1, 1)
  
  // Base engagement score
  let engagementScore = (
    post.likes_count * 1 +
    post.reposts_count * 3 +
    post.replies_count * 5 +
    engagementRate * 10
  ) * timeDecayFactor
  
  // Boost for verified users
  if (post.is_verified) {
    engagementScore *= 1.2
  }
  
  return engagementScore
}

export const calculateUserAffinityScore = (post: Post, userInteractions: UserInteraction[], followingUsers: string[]): number => {
  let affinityScore = 0
  
  // Following bonus
  if (followingUsers.includes(post.user_id)) {
    affinityScore += 10
  }
  
  // Interaction history with this user
  const userInteractionHistory = userInteractions.filter(
    interaction => interaction.target_user_id === post.user_id
  )
  
  const interactionWeights = {
    like: 1,
    repost: 2,
    reply: 3,
    follow: 5,
    view: 0.1
  }
  
  userInteractionHistory.forEach(interaction => {
    const recency = (Date.now() - new Date(interaction.created_at).getTime()) / (1000 * 60 * 60 * 24)
    const decayFactor = Math.exp(-recency / 30) // Decay over 30 days
    affinityScore += (interactionWeights[interaction.interaction_type] || 0) * decayFactor
  })
  
  return affinityScore
}

export const calculateContentRelevanceScore = (post: Post, userInteractions: UserInteraction[]): number => {
  let relevanceScore = 0
  
  // Content type preferences based on user history
  const userLikedContentTypes = userInteractions
    .filter(i => i.interaction_type === 'like')
    .map(i => i.target_user_id)
  
  // Boost posts from users the current user frequently interacts with
  if (userLikedContentTypes.includes(post.user_id)) {
    relevanceScore += 5
  }
  
  // Media content typically gets more engagement
  if (post.media_urls && post.media_urls.length > 0) {
    relevanceScore += 3
  }
  
  // Longer content might be more valuable
  if (post.content && post.content.length > 100) {
    relevanceScore += 2
  }
  
  return relevanceScore
}

export const calculateViralityScore = (post: Post): number => {
  const now = new Date()
  const postTime = new Date(post.repost_created_at || post.created_at)
  const hoursOld = (now.getTime() - postTime.getTime()) / (1000 * 60 * 60)
  
  // Virality is based on engagement velocity
  const engagementVelocity = (post.likes_count + post.reposts_count + post.replies_count) / Math.max(hoursOld, 1)
  
  // Viral threshold - posts gaining engagement quickly
  const viralityMultiplier = engagementVelocity > 5 ? 2 : 1
  
  return engagementVelocity * viralityMultiplier
}

export const calculateDiversityScore = (post: Post, index: number, posts: Post[]): number => {
  // Promote diversity by reducing score for consecutive posts from same user
  const recentPosts = posts.slice(Math.max(0, index - 5), index)
  const sameUserPosts = recentPosts.filter(p => p.user_id === post.user_id).length
  
  return Math.max(0, 1 - (sameUserPosts * 0.2))
}

export const calculateAlgorithmicScore = (
  post: Post,
  index: number,
  posts: Post[],
  userInteractions: UserInteraction[],
  followingUsers: string[]
): number => {
  const engagementScore = calculateEngagementScore(post)
  const affinityScore = calculateUserAffinityScore(post, userInteractions, followingUsers)
  const relevanceScore = calculateContentRelevanceScore(post, userInteractions)
  const viralityScore = calculateViralityScore(post)
  const diversityScore = calculateDiversityScore(post, index, posts)
  
  // Weighted combination of all factors
  const totalScore = (
    engagementScore * 0.3 +
    affinityScore * 0.25 +
    relevanceScore * 0.2 +
    viralityScore * 0.15 +
    diversityScore * 0.1
  )
  
  return totalScore
}

export const sortPostsAlgorithmically = (
  posts: Post[],
  algorithmMode: 'chronological' | 'algorithmic',
  userInteractions: UserInteraction[],
  followingUsers: string[]
): Post[] => {
  return posts
    .map((post, index) => ({
      ...post,
      algorithmicScore: calculateAlgorithmicScore(post, index, posts, userInteractions, followingUsers)
    }))
    .sort((a, b) => {
      if (algorithmMode === 'chronological') {
        const timeA = new Date(a.repost_created_at || a.created_at).getTime()
        const timeB = new Date(b.repost_created_at || b.created_at).getTime()
        return timeB - timeA
      } else {
        return (b.algorithmicScore || 0) - (a.algorithmicScore || 0)
      }
    })
}