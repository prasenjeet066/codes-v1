"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search } from "lucide-react"

export function SearchBar() {
  const [query, setQuery] = useState("")

  return (
    <Card className="bengali-font">
      <CardHeader>
        <CardTitle className="text-lg">অনুসন্ধান</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="desiiseb অনুসন্ধান করুন"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardContent>
    </Card>
  )
}
