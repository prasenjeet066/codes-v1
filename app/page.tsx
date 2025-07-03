import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl font-bold text-gray-900 mb-6" style={{ fontFamily: "Alkatra, cursive" }}>
            Cōdes
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto" style={{ fontFamily: "Tiro Bangla, serif" }}>
            কথোপকথনে যোগ দিন। আপনার চিন্তাভাবনা শেয়ার করুন। অন্যদের সাথে সংযুক্ত হন। আধুনিক বিশ্বের জন্য পুনর্কল্পিত মাইক্রোব্লগিং অভিজ্ঞতা।
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button asChild size="lg" className="text-lg px-8 py-3">
              <Link href="/auth/sign-up">শুরু করুন</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8 py-3 bg-white text-black">
              <Link href="/auth/sign-in">সাইন ইন</Link>
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <Card>
              <CardHeader>
                <CardTitle>নিজেকে প্রকাশ করুন</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  ২৮০ অক্ষর বা তার কম সময়ে আপনার চিন্তাভাবনা শেয়ার করুন। প্রতিটি শব্দকে গুরুত্বপূর্ণ করে তুলুন।
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>সংযুক্ত হন ও ফলো করুন</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>আকর্ষণীয় মানুষদের ফলো করুন এবং তাদের সর্বশেষ পোস্টের সাথে আপডেট থাকুন।</CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>কন্টেন্ট আবিষ্কার করুন</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>ট্রেন্ডিং হ্যাশট্যাগ অন্বেষণ করুন এবং নতুন কথোপকথন আবিষ্কার করুন।</CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
