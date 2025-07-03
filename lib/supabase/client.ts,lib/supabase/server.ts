// lib/supabase/client.ts
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "./types"

// These are injected at build-time – make sure you’ve set them in Vercel /
// “NEXT_PUBLIC_SUPABASE_URL”  and  “NEXT_PUBLIC_SUPABASE_ANON_KEY”.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
  )
}

let supabaseClient: ReturnType<typeof createClientComponentClient<Database>> | null = null

export function createClient() {
  if (!supabaseClient) {
    supabaseClient = createClientComponentClient<Database>({
      supabaseUrl,
      supabaseKey: supabaseAnonKey,
    })
  }
  return supabaseClient
}

export const supabase = createClient()

// lib/supabase/server.ts
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { Database } from "./types"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function createServerClient() {
  return createServerComponentClient<Database>(
    { cookies },
    {
      supabaseUrl,
      supabaseKey: supabaseAnonKey,
    },
  )
}
