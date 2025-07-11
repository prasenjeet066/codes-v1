export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  // Define your Supabase schema here as needed.
  // This stub keeps TypeScript satisfied without enforcing any particular structure.
  public: Record<string, unknown>
}
