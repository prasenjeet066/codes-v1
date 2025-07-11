"use client"

import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Settings, Shield, ArrowRight } from "lucide-react"

export function SettingsNavigation() {
  const router = useRouter()
  const pathname = usePathname()

  const navigationItems = [
    {
      title: "Account Settings",
      description: "Manage your profile, security, and account preferences",
      icon: Settings,
      href: "/settings",
      active: pathname === "/settings",
    },
    {
      title: "Privacy & Data",
      description: "Control your privacy settings and data management",
      icon: Shield,
      href: "/privacy",
      active: pathname === "/privacy",
    },
  ]

  return (
    <div className="space-y-4">
      {navigationItems.map((item) => {
        const Icon = item.icon
        return (
          <Card
            key={item.href}
            className={`cursor-pointer transition-all hover:shadow-md ${
              item.active ? "ring-2 ring-blue-500 bg-blue-50" : ""
            }`}
            onClick={() => router.push(item.href)}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${item.active ? "bg-blue-100" : "bg-gray-100"}`}>
                    <Icon className={`h-6 w-6 ${item.active ? "text-blue-600" : "text-gray-600"}`} />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${item.active ? "text-blue-900" : "text-gray-900"}`}>
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}