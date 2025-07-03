"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { supabase } from "@/lib/supabase/client"
import { signUpSchema, type SignUpData } from "@/lib/validations/auth"
import { TermsAndConditions } from "@/components/auth/terms-and-conditions"
import {
  Loader2,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Mail,
  User,
  Lock,
  FileText,
} from "lucide-react"

type Step = 1 | 2 | 3 | 4

export default function SignUpPage() {
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [formData, setFormData] = useState<
    SignUpData & {
      confirmPassword: string
      acceptTerms: boolean
    }
  >({
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
    displayName: "",
    acceptTerms: false,
  })
  const [errors, setErrors] = useState<
    Partial<
      SignUpData & {
        confirmPassword: string
        acceptTerms: string
      }
    >
  >({})
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error">("error")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const router = useRouter()

  const steps = [
    { number: 1, title: "ইমেইল", icon: Mail, description: "আপনার ইমেইল ঠিকানা" },
    { number: 2, title: "প্রোফাইল", icon: User, description: "ব্যবহারকারীর তথ্য" },
    { number: 3, title: "পাসওয়ার্ড", icon: Lock, description: "নিরাপত্তা সেটআপ" },
    { number: 4, title: "শর্তাবলী", icon: FileText, description: "চূড়ান্ত করুন" },
  ]

  const progress = (currentStep / steps.length) * 100

  // Check username availability
  const checkUsernameAvailability = async (username: string) => {
    if (username.length < 3) {
      setUsernameAvailable(null)
      return
    }

    setCheckingUsername(true)
    try {
      const { data, error } = await supabase.rpc("check_username_availability", {
        username_input: username,
      })

      if (error) {
        console.error("Error checking username:", error)
        setUsernameAvailable(null)
      } else {
        setUsernameAvailable(data)
      }
    } catch (error) {
      console.error("Error checking username:", error)
      setUsernameAvailable(null)
    } finally {
      setCheckingUsername(false)
    }
  }

  // Sign up with Google
  const handleGoogleSignUp = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      })

      if (error) {
        setMessage("Google দিয়ে সাইন আপ করতে সমস্যা হয়েছে")
        setMessageType("error")
      }
    } catch (error) {
      setMessage("Google দিয়ে সাইন আপ করতে সমস্যা হয়েছে")
      setMessageType("error")
    } finally {
      setIsLoading(false)
    }
  }

  const validateStep = (step: Step): boolean => {
    const stepErrors: Partial<typeof errors> = {}

    switch (step) {
      case 1:
        if (!formData.email) {
          stepErrors.email = "ইমেইল আবশ্যক"
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          stepErrors.email = "দয়া করে একটি বৈধ ইমেইল ঠিকানা লিখুন"
        }
        break

      case 2:
        if (!formData.username) {
          stepErrors.username = "ইউজারনেম আবশ্যক"
        } else if (formData.username.length < 3) {
          stepErrors.username = "ইউজারনেম কমপক্ষে ৩ অক্ষরের হতে হবে"
        } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
          stepErrors.username = "ইউজারনেমে শুধুমাত্র অক্ষর, সংখ্যা এবং আন্ডারস্কোর থাকতে পারে"
        } else if (usernameAvailable === false) {
          stepErrors.username = "এই ইউজারনেমটি ইতিমধ্যে ব্যবহৃত হয়েছে"
        }

        if (!formData.displayName) {
          stepErrors.displayName = "প্রদর্শনী নাম আবশ্যক"
        } else if (formData.displayName.length > 50) {
          stepErrors.displayName = "প্রদর্শনী নাম ৫০ অক্ষরের কম হতে হবে"
        }
        break

      case 3:
        if (!formData.password) {
          stepErrors.password = "পাসওয়ার্ড আবশ্যক"
        } else if (formData.password.length < 8) {
          stepErrors.password = "পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে"
        }

        if (!formData.confirmPassword) {
          stepErrors.confirmPassword = "পাসওয়ার্ড নিশ্চিত করুন"
        } else if (formData.password !== formData.confirmPassword) {
          stepErrors.confirmPassword = "পাসওয়ার্ড মিলছে না"
        }
        break

      case 4:
        if (!formData.acceptTerms) {
          stepErrors.acceptTerms = "শর্তাবলী গ্রহণ করা আবশ্যক"
        }
        break
    }

    setErrors(stepErrors)
    return Object.keys(stepErrors).length === 0
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep((prev) => (prev + 1) as Step)
      }
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateStep(4)) return

    setIsLoading(true)
    setMessage("")

    try {
      const validatedData = signUpSchema.parse({
        email: formData.email,
        password: formData.password,
        username: formData.username,
        displayName: formData.displayName,
      })

      const { data, error } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          data: {
            username: validatedData.username,
            display_name: validatedData.displayName,
          },
        },
      })

      if (error) {
        console.error("Signup error:", error)
        if (error.message.includes("User already registered")) {
          setMessage("এই ইমেইল ঠিকানা দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট রয়েছে")
        } else {
          setMessage(error.message || "অ্যাকাউন্ট তৈরি করতে সমস্যা হয়েছে")
        }
        setMessageType("error")
      } else {
        setMessage("সফলভাবে অ্যাকাউন্ট তৈরি হয়েছে! আপনার ইমেইল চেক করুন কনফার্মেশন লিঙ্কের জন্য")
        setMessageType("success")

        // Reset form
        setFormData({
          email: "",
          password: "",
          confirmPassword: "",
          username: "",
          displayName: "",
          acceptTerms: false,
        })
        setCurrentStep(1)
      }
    } catch (error) {
      console.error("Form validation error:", error)
      setMessage("ফর্ম পূরণে ত্রুটি রয়েছে")
      setMessageType("error")
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Clear field error
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }

    // Check username availability
    if (field === "username" && value.length >= 3) {
      const timeoutId = setTimeout(() => {
        checkUsernameAvailability(value)
      }, 500)
      return () => clearTimeout(timeoutId)
    } else if (field === "username") {
      setUsernameAvailable(null)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Mail className="h-12 w-12 mx-auto text-blue-500 mb-2" />
              <h3 className="text-lg font-semibold">আপনার ইমেইল ঠিকানা</h3>
              <p className="text-sm text-gray-600">আমরা আপনার ইমেইলে একটি কনফার্মেশন লিঙ্ক পাঠাবো</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">ইমেইল</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleChange("email")}
                placeholder="আপনার ইমেইল লিখুন"
                disabled={isLoading}
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
            </div>

            <div className="pt-4">
              <Button
                type="button"
                onClick={handleGoogleSignUp}
                variant="outline"
                className="w-full bg-transparent"
                disabled={isLoading}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google দিয়ে সাইন আপ করুন
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">অথবা</span>
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <User className="h-12 w-12 mx-auto text-blue-500 mb-2" />
              <h3 className="text-lg font-semibold">প্রোফাইল তথ্য</h3>
              <p className="text-sm text-gray-600">আপনার ইউজারনেম এবং প্রদর্শনী নাম</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">ইউজারনেম</Label>
              <div className="relative">
                <Input
                  id="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange("username")}
                  placeholder="একটি ইউজারনেম বেছে নিন"
                  disabled={isLoading}
                  className={`pr-10 ${
                    errors.username
                      ? "border-red-500"
                      : usernameAvailable === true
                        ? "border-green-500"
                        : usernameAvailable === false
                          ? "border-red-500"
                          : ""
                  }`}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {checkingUsername ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  ) : usernameAvailable === true ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : usernameAvailable === false ? (
                    <XCircle className="h-4 w-4 text-red-500" />
                  ) : null}
                </div>
              </div>
              {errors.username && <p className="text-sm text-red-600">{errors.username}</p>}
              {usernameAvailable === false && !errors.username && (
                <p className="text-sm text-red-600">এই ইউজারনেমটি ইতিমধ্যে ব্যবহৃত হয়েছে</p>
              )}
              {usernameAvailable === true && <p className="text-sm text-green-600">ইউজারনেমটি উপলব্ধ</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">প্রদর্শনী নাম</Label>
              <Input
                id="displayName"
                type="text"
                value={formData.displayName}
                onChange={handleChange("displayName")}
                placeholder="আপনার প্রদর্শনী নাম"
                disabled={isLoading}
                className={errors.displayName ? "border-red-500" : ""}
              />
              {errors.displayName && <p className="text-sm text-red-600">{errors.displayName}</p>}
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Lock className="h-12 w-12 mx-auto text-blue-500 mb-2" />
              <h3 className="text-lg font-semibold">পাসওয়ার্ড সেটআপ</h3>
              <p className="text-sm text-gray-600">একটি শক্তিশালী পাসওয়ার্ড তৈরি করুন</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">পাসওয়ার্ড</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange("password")}
                  placeholder="একটি পাসওয়ার্ড তৈরি করুন"
                  disabled={isLoading}
                  className={`pr-10 ${errors.password ? "border-red-500" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">পাসওয়ার্ড নিশ্চিত করুন</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleChange("confirmPassword")}
                  placeholder="পাসওয়ার্ড আবার লিখুন"
                  disabled={isLoading}
                  className={`pr-10 ${errors.confirmPassword ? "border-red-500" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-sm text-red-600">{errors.confirmPassword}</p>}
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              <p>পাসওয়ার্ড অবশ্যই:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>কমপক্ষে ৮ অক্ষরের হতে হবে</li>
                <li>বড় ও ছোট হাতের অক্ষর থাকতে হবে</li>
                <li>অন্তত একটি সংখ্যা থাকতে হবে</li>
                <li>বিশেষ চিহ্ন থাকলে ভালো</li>
              </ul>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <FileText className="h-12 w-12 mx-auto text-blue-500 mb-2" />
              <h3 className="text-lg font-semibold">শর্তাবলী এবং গোপনীয়তা</h3>
              <p className="text-sm text-gray-600">চূড়ান্ত করার আগে শর্তাবলী পড়ুন</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <h4 className="font-medium">আপনার তথ্য:</h4>
              <div className="text-sm space-y-1">
                <p>
                  <strong>ইমেইল:</strong> {formData.email}
                </p>
                <p>
                  <strong>ইউজারনেম:</strong> @{formData.username}
                </p>
                <p>
                  <strong>প্রদর্শনী নাম:</strong> {formData.displayName}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="acceptTerms"
                  checked={formData.acceptTerms}
                  onCheckedChange={(checked) => {
                    setFormData((prev) => ({ ...prev, acceptTerms: checked as boolean }))
                    if (errors.acceptTerms) {
                      setErrors((prev) => ({ ...prev, acceptTerms: undefined }))
                    }
                  }}
                  disabled={isLoading}
                />
                <div className="text-sm">
                  <label htmlFor="acceptTerms" className="cursor-pointer">
                    আমি{" "}
                    <button type="button" onClick={() => setShowTerms(true)} className="text-blue-600 hover:underline">
                      শর্তাবলী এবং গোপনীয়তা নীতি
                    </button>{" "}
                    পড়েছি এবং সম্মত হয়েছি
                  </label>
                </div>
              </div>
              {errors.acceptTerms && <p className="text-sm text-red-600">{errors.acceptTerms}</p>}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 bengali-font">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold logo-font">Cōdes</CardTitle>
          <CardDescription>আজই কথোপকথনে যোগ দিন</CardDescription>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>
                ধাপ {currentStep} / {steps.length}
              </span>
              <span>{Math.round(progress)}% সম্পূর্ণ</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Indicators */}
          <div className="flex justify-between mt-4">
            {steps.map((step) => {
              const Icon = step.icon
              const isActive = currentStep === step.number
              const isCompleted = currentStep > step.number

              return (
                <div key={step.number} className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                      isCompleted
                        ? "bg-green-500 text-white"
                        : isActive
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {isCompleted ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className="text-xs mt-1 text-center">{step.title}</span>
                </div>
              )
            })}
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit}>
            {renderStepContent()}

            {message && (
              <Alert className={`mt-4 ${messageType === "success" ? "border-green-500 bg-green-50" : ""}`}>
                <AlertDescription className={messageType === "success" ? "text-green-700" : ""}>
                  {message}
                </AlertDescription>
              </Alert>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1 || isLoading}
                className="flex items-center bg-transparent"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                পূর্ববর্তী
              </Button>

              {currentStep < 4 ? (
                <Button type="button" onClick={nextStep} disabled={isLoading} className="flex items-center">
                  পরবর্তী
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button type="submit" disabled={isLoading || !formData.acceptTerms} className="flex items-center">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  অ্যাকাউন্ট তৈরি করুন
                </Button>
              )}
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ইতিমধ্যে একটি অ্যাকাউন্ট আছে?{" "}
              <Link href="/auth/sign-in" className="text-blue-600 hover:underline">
                সাইন ইন করুন
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Terms and Conditions Dialog */}
      <TermsAndConditions open={showTerms} onOpenChange={setShowTerms} />
    </div>
  )
}
