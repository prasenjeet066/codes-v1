import { z } from "zod"

export const signUpSchema = z.object({
  email: z.string().email("দয়া করে একটি বৈধ ইমেইল ঠিকানা লিখুন"),
  password: z.string().min(8, "পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে"),
  username: z
    .string()
    .min(3, "ইউজারনেম কমপক্ষে ৩ অক্ষরের হতে হবে")
    .max(25, "ইউজারনেম ২৫ অক্ষরের কম হতে হবে")
    .regex(/^[a-zA-Z0-9_]+$/, "ইউজারনেমে শুধুমাত্র অক্ষর, সংখ্যা এবং আন্ডারস্কোর থাকতে পারে"),
  displayName: z.string().min(1, "প্রদর্শনী নাম আবশ্যক").max(50, "প্রদর্শনী নাম ৫০ অক্ষরের কম হতে হবে"),
})

export const signInSchema = z.object({
  email: z.string().email("দয়া করে একটি বৈধ ইমেইল ঠিকানা লিখুন"),
  password: z.string().min(1, "পাসওয়ার্ড আবশ্যক"),
})

export type SignUpData = z.infer<typeof signUpSchema>
export type SignInData = z.infer<typeof signInSchema>
