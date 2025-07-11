import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { SupabaseDatabase } from "./types"

export function createServerClient() {
  return createServerComponentClient<SupabaseDatabase>({ cookies })
}
