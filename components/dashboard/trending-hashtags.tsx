"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function TrendingHashtags() {
  const trendingTags = [
    { tag: "প্রযুক্তি", posts: 1234 },
    { tag: "ডিজাইন", posts: 856 },
    { tag: "স্টার্টআপ", posts: 642 },
    { tag: "কোডিং", posts: 523 },
    { tag: "কৃত্রিমবুদ্ধিমত্তা", posts: 445 },
  ]

  return (
    <Card className="bengali-font">
      <CardHeader>
        <CardTitle className="text-lg">কী ঘটছে</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {trendingTags.map((item, index) => (
          <div key={item.tag} className="cursor-pointer hover:bg-gray-50 p-2 rounded">
            <div className="text-sm text-gray-500">ট্রেন্ডিং #{index + 1}</div>
            <div className="font-semibold">#{item.tag}</div>
            <div className="text-sm text-gray-500">{item.posts.toLocaleString()} পোস্ট</div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
