import { z } from "zod"

export const createPostSchema = z.object({
  content: z.string().min(1, "পোস্ট খালি হতে পারে না").max(280, "পোস্ট ২৮০ অক্ষরের কম হতে হবে"),
  replyTo: z.string().uuid().optional(),
})

export const updateProfileSchema = z.object({
  displayName: z.string().min(1, "প্রদর্শনী নাম আবশ্যক").max(50),
  bio: z.string().max(160, "বায়ো ১৬০ অক্ষরের কম হতে হবে").optional(),
  website: z.string().url("দয়া করে একটি বৈধ URL লিখুন").optional().or(z.literal("")),
  location: z.string().max(30, "অবস্থান ৩০ অক্ষরের কম হতে হবে").optional(),
})

export type CreatePostData = z.infer<typeof createPostSchema>
export type UpdateProfileData = z.infer<typeof updateProfileSchema>
