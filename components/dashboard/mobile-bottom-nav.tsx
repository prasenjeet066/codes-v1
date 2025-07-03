"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Home, Search, Bell, Mail, User } from "lucide-react"

interface MobileBottomNavProps {
  profile: any
  onSearchOpen: () => void
  onNotificationOpen: () => void
}

export function MobileBottomNav({ profile, onSearchOpen, onNotificationOpen }: MobileBottomNavProps) {
  const pathname = usePathname()

  const navItems = [
    { icon: Home, label: "হোম", href: "/dashboard", action: null },
    { icon: Search, label: "খুঁজুন", href: "#", action: onSearchOpen },
    { icon: Bell, label: "বিজ্ঞপ্তি", href: "#", action: onNotificationOpen },
    { icon: Mail, label: "বার্তা", href: "/messages", action: null },
    { icon: User, label: "প্রোফাইল", href: `/profile/${profile?.username}`, action: null },
  ]

  return (
    
    <></>
  )
}
