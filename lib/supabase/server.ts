import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { Database } from "./types"

export function createServerClient() {
  return createServerComponentClient<Database>({ cookies })
}
