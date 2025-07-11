import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { SupabaseDatabase } from "./types"

let supabaseClient: ReturnType<typeof createClientComponentClient<SupabaseDatabase>> | null = null

export function createClient() {
  if (!supabaseClient) {
    supabaseClient = createClientComponentClient<SupabaseDatabase>({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    })
  }
  return supabaseClient
}

export const supabase = createClient()

// Helper function to handle auth errors
export function handleAuthError(error: any): string {
  if (!error) return "অজানা ত্রুটি ঘটেছে"

  const message = error.message || error.error_description || error.toString()

  // Common error mappings
  const errorMappings: Record<string, string> = {
    "User already registered": "এই ইমেইল ঠিকানা দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট রয়েছে",
    "Invalid login credentials": "ভুল ইমেইল বা পাসওয়ার্ড",
    "Email not confirmed": "আপনার ইমেইল এখনও কনফার্ম করা হয়নি",
    "Password should be at least 6 characters": "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে",
    "Unable to validate email address": "ইমেইল ঠিকানা যাচাই করা যায়নি",
    "Signup requires a valid password": "বৈধ পাসওয়ার্ড প্রয়োজন",
    "Email address is invalid": "ইমেইল ঠিকানা বৈধ নয়",
    "Password is too weak": "পাসওয়ার্ড খুবই দুর্বল",
  }

  // Check for exact matches first
  for (const [key, value] of Object.entries(errorMappings)) {
    if (message.includes(key)) {
      return value
    }
  }

  // Return original message if no mapping found
  return message
}

// Helper function to configure Google OAuth
export const configureGoogleAuth = () => {
  return {
    provider: "google" as const,
    options: {
      redirectTo: `${window.location.origin}/dashboard`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  }
}
