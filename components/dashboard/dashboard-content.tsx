"use client"

import { useState, useEffect } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase/client"
import Spinner from "@/components/loader/spinner"
import { Sidebar } from "./sidebar"
import { Timeline } from "./timeline"
import { TrendingHashtags } from "./trending-hashtags"
import { MobileBottomNav } from "./mobile-bottom-nav"
import { SearchDialog } from "./search-dialog"
import { NotificationDialog } from "./notification-dialog"
import { Button } from "@/components/ui/button"
import { Menu, UserIcon, Plus } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"

interface DashboardContentProps {
  user: User
}

export function DashboardContent({ user }: DashboardContentProps) {
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchProfile()
  }, [user.id])

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error("Error fetching profile:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <Spinner/>
    </div>
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 border-b bg-white bg-white/50 z-30 backdrop-blur-md px-4 py-2">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold logo-font">Cōdes</h1>
          <div className="flex flex-row w-full items-center justify-end">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-80">
              <Sidebar profile={profile} onSignOut={handleSignOut} />
            </SheetContent>
          </Sheet>

        
          <Link href={`/profile/${profile?.username}`}>
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url || "/placeholder.svg"} />
              <AvatarFallback>
                <UserIcon className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
      </div>

      <div className="flex">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-64 xl:w-80 border-r min-h-screen sticky top-0">
          <Sidebar profile={profile} onSignOut={handleSignOut} />
        </div>

        {/* Main Content */}
        <div className="flex-1 max-w-2xl border-r">
          <Timeline userId={user.id} />
        </div>

        {/* Right Sidebar */}
        <div className="hidden xl:block w-80 p-4">
          <TrendingHashtags />
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden">
        <MobileBottomNav profile={profile} />
      </div>

      {/* Mobile Create Post FAB */}
      <div className="lg:hidden fixed bottom-20 right-4 z-40">
        <Link href="/create">
          <Button size="icon" className="h-14 w-14 rounded-full shadow-lg">
            <Plus className="h-6 w-6" />
          </Button>
        </Link>
      </div>

      <SearchDialog />
      <NotificationDialog />
    </div>
  )
}
