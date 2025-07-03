import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

interface TermsAndConditionsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TermsAndConditions({ open, onOpenChange }: TermsAndConditionsProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">শর্তাবলী এবং গোপনীয়তা নীতি</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6 text-sm">
            <section>
              <h3 className="text-lg font-semibold mb-3">১. সেবার শর্তাবলী</h3>
              <div className="space-y-2 text-gray-700">
                <p>
                  Cōdes প্ল্যাটফর্ম ব্যবহার করে আপনি এই শর্তাবলীতে সম্মত হচ্ছেন। আমাদের সেবা ব্যবহারের জন্য আপনাকে অবশ্যই ১৩ বছর বা তার
                  বেশি বয়সী হতে হবে।
                </p>
                <p>আপনি দায়বদ্ধ থাকবেন আপনার অ্যাকাউন্টের সকল কার্যকলাপের জন্য এবং আপনার পাসওয়ার্ড গোপনীয় রাখার জন্য।</p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">২. ব্যবহারকারীর আচরণ</h3>
              <div className="space-y-2 text-gray-700">
                <p>আপনি সম্মত হচ্ছেন যে আপনি নিম্নলিখিত কাজগুলো করবেন না:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>অবৈধ, ক্ষতিকর, হুমকিমূলক, বা আপত্তিজনক কন্টেন্ট পোস্ট করা</li>
                  <li>অন্যদের হয়রানি, ধমক বা অপমান করা</li>
                  <li>স্প্যাম বা অযাচিত বিজ্ঞাপন পোস্ট করা</li>
                  <li>কপিরাইট লঙ্ঘনকারী কন্টেন্ট শেয়ার করা</li>
                  <li>ভুয়া তথ্য বা বিভ্রান্তিকর কন্টেন্ট প্রচার করা</li>
                </ul>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">৩. গোপনীয়তা নীতি</h3>
              <div className="space-y-2 text-gray-700">
                <p>আমরা আপনার ব্যক্তিগত তথ্যের গোপনীয়তা রক্ষায় প্রতিশ্রুতিবদ্ধ। আমরা যে তথ্য সংগ্রহ করি:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>আপনার নাম, ইমেইল ঠিকানা এবং প্রোফাইল তথ্য</li>
                  <li>আপনার পোস্ট, মন্তব্য এবং অন্যান্য কন্টেন্ট</li>
                  <li>ব্যবহারের পরিসংখ্যান এবং প্রযুক্তিগত তথ্য</li>
                </ul>
                <p>আমরা আপনার তথ্য তৃতীয় পক্ষের সাথে শেয়ার করি না, শুধুমাত্র আইনি প্রয়োজনে বা আপনার সম্মতিতে।</p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">৪. কন্টেন্ট এবং বুদ্ধিবৃত্তিক সম্পদ</h3>
              <div className="space-y-2 text-gray-700">
                <p>
                  আপনি যে কন্টেন্ট পোস্ট করেন তার মালিকানা আপনার থাকে, তবে আপনি আমাদের সেই কন্টেন্ট ব্যবহার, প্রদর্শন এবং বিতরণের লাইসেন্স
                  প্রদান করেন।
                </p>
                <p>Cōdes প্ল্যাটফর্মের সকল ট্রেডমার্ক, লোগো এবং ব্র্যান্ড নাম আমাদের সম্পত্তি।</p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">৫. সেবা বন্ধ এবং অ্যাকাউন্ট সাসপেনশন</h3>
              <div className="space-y-2 text-gray-700">
                <p>আমরা যেকোনো সময় বিনা নোটিশে আপনার অ্যাকাউন্ট সাসপেন্ড বা বন্ধ করার অধিকার রাখি যদি আপনি এই শর্তাবলী লঙ্ঘন করেন।</p>
                <p>আমরা যেকোনো সময় আমাদের সেবা পরিবর্তন, সাসপেন্ড বা বন্ধ করার অধিকার রাখি।</p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">৬. দায়বদ্ধতার সীমাবদ্ধতা</h3>
              <div className="space-y-2 text-gray-700">
                <p>Cōdes "যেমন আছে" ভিত্তিতে সেবা প্রদান করে। আমরা সেবার নিরবচ্ছিন্নতা বা ত্রুটিমুক্ততার গ্যারান্টি দিই না।</p>
                <p>আমরা আপনার বা তৃতীয় পক্ষের কোনো প্রত্যক্ষ বা পরোক্ষ ক্ষতির জন্য দায়ী নই।</p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">৭. শর্তাবলী পরিবর্তন</h3>
              <div className="space-y-2 text-gray-700">
                <p>আমরা যেকোনো সময় এই শর্তাবলী পরিবর্তন করার অধিকার রাখি। পরিবর্তনগুলো কার্যকর হওয়ার আগে আমরা আপনাকে জানাবো।</p>
                <p>পরিবর্তনের পর সেবা ব্যবহার অব্যাহত রাখলে আপনি নতুন শর্তাবলীতে সম্মত হয়েছেন বলে গণ্য হবে।</p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">৮. যোগাযোগ</h3>
              <div className="space-y-2 text-gray-700">
                <p>এই শর্তাবলী সম্পর্কে কোনো প্রশ্ন থাকলে আমাদের সাথে যোগাযোগ করুন:</p>
                <p>ইমেইল: support@codes.com</p>
                <p>ঠিকানা: ঢাকা, বাংলাদেশ</p>
              </div>
            </section>

            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>সর্বশেষ আপডেট:</strong> ৩ জানুয়ারি, ২০২৫
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
