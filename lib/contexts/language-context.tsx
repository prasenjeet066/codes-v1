"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

export type Language = "en" | "bn" | "hi" | "ar"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations = {
  en: {
    // Navigation
    home: "Home",
    explore: "Explore",
    notifications: "Notifications",
    messages: "Messages",
    bookmarks: "Bookmarks",
    profile: "Profile",
    settings: "Settings",
    signOut: "Sign Out",

    // Actions
    post: "Post",
    reply: "Reply",
    repost: "Repost",
    like: "Like",
    share: "Share",
    follow: "Follow",
    following: "Following",
    unfollow: "Unfollow",

    // Common
    loading: "Loading...",
    error: "Error",
    success: "Success",
    cancel: "Cancel",
    save: "Save",
    edit: "Edit",
    delete: "Delete",

    // Post creation
    whatsHappening: "What's happening?",
    postPlaceholder: "Share your thoughts...",
    charactersLeft: "characters left",

    // Profile
    editProfile: "Edit Profile",
    followers: "Followers",
    following_count: "Following",
    posts: "Posts",
    replies: "Replies",
    reposts: "Reposts",
    media: "Media",

    // Settings
    language: "Language",
    theme: "Theme",
    privacy: "Privacy",
    notifications_settings: "Notifications",
    account: "Account",
    verification: "Verification",

    // Verification
    verified: "Verified",
    requestVerification: "Request Verification",
    verificationPending: "Verification Pending",
  },
  bn: {
    // Navigation
    home: "হোম",
    explore: "এক্সপ্লোর",
    notifications: "নোটিফিকেশন",
    messages: "মেসেজ",
    bookmarks: "বুকমার্ক",
    profile: "প্রোফাইল",
    settings: "সেটিংস",
    signOut: "সাইন আউট",

    // Actions
    post: "পোস্ট করুন",
    reply: "উত্তর দিন",
    repost: "রিপোস্ট",
    like: "লাইক",
    share: "শেয়ার",
    follow: "অনুসরণ করুন",
    following: "অনুসরণ করছেন",
    unfollow: "আনফলো",

    // Common
    loading: "লোড হচ্ছে...",
    error: "ত্রুটি",
    success: "সফল",
    cancel: "বাতিল",
    save: "সেভ",
    edit: "সম্পাদনা",
    delete: "মুছুন",

    // Post creation
    whatsHappening: "কী ঘটছে?",
    postPlaceholder: "আপনার চিন্তাভাবনা শেয়ার করুন...",
    charactersLeft: "অক্ষর বাকি",

    // Profile
    editProfile: "প্রোফাইল সম্পাদনা",
    followers: "অনুসরণকারী",
    following_count: "অনুসরণ করছেন",
    posts: "পোস্ট",
    replies: "উত্তর",
    reposts: "রিপোস্ট",
    media: "মিডিয়া",

    // Settings
    language: "ভাষা",
    theme: "থিম",
    privacy: "গোপনীয়তা",
    notifications_settings: "নোটিফিকেশন",
    account: "অ্যাকাউন্ট",
    verification: "যাচাইকরণ",

    // Verification
    verified: "যাচাইকৃত",
    requestVerification: "যাচাইকরণের জন্য আবেদন",
    verificationPending: "যাচাইকরণ অপেক্ষমাণ",
  },
  hi: {
    // Navigation
    home: "होम",
    explore: "एक्सप्लोर",
    notifications: "नोटिफिकेशन",
    messages: "मैसेज",
    bookmarks: "बुकमार्क",
    profile: "प्रोफाइल",
    settings: "सेटिंग्स",
    signOut: "साइन आउट",

    // Actions
    post: "पोस्ट करें",
    reply: "जवाब दें",
    repost: "रीपोस्ट",
    like: "लाइक",
    share: "शेयर",
    follow: "फॉलो करें",
    following: "फॉलो कर रहे हैं",
    unfollow: "अनफॉलो",

    // Common
    loading: "लोड हो रहा है...",
    error: "त्रुटि",
    success: "सफल",
    cancel: "रद्द करें",
    save: "सेव करें",
    edit: "संपादित करें",
    delete: "हटाएं",

    // Post creation
    whatsHappening: "क्या हो रहा है?",
    postPlaceholder: "अपने विचार साझा करें...",
    charactersLeft: "अक्षर बचे हैं",

    // Profile
    editProfile: "प्रोफाइल संपादित करें",
    followers: "फॉलोअर्स",
    following_count: "फॉलो कर रहे हैं",
    posts: "पोस्ट",
    replies: "जवाब",
    reposts: "रीपोस्ट",
    media: "मीडिया",

    // Settings
    language: "भाषा",
    theme: "थीम",
    privacy: "गोपनीयता",
    notifications_settings: "नोटिफिकेशन",
    account: "खाता",
    verification: "सत्यापन",

    // Verification
    verified: "सत्यापित",
    requestVerification: "सत्यापन का अनुरोध करें",
    verificationPending: "सत्यापन लंबित",
  },
  ar: {
    // Navigation
    home: "الرئيسية",
    explore: "استكشاف",
    notifications: "الإشعارات",
    messages: "الرسائل",
    bookmarks: "المفضلة",
    profile: "الملف الشخصي",
    settings: "الإعدادات",
    signOut: "تسجيل الخروج",

    // Actions
    post: "نشر",
    reply: "رد",
    repost: "إعادة نشر",
    like: "إعجاب",
    share: "مشاركة",
    follow: "متابعة",
    following: "يتابع",
    unfollow: "إلغاء المتابعة",

    // Common
    loading: "جاري التحميل...",
    error: "خطأ",
    success: "نجح",
    cancel: "إلغاء",
    save: "حفظ",
    edit: "تحرير",
    delete: "حذف",

    // Post creation
    whatsHappening: "ماذا يحدث؟",
    postPlaceholder: "شارك أفكارك...",
    charactersLeft: "حرف متبقي",

    // Profile
    editProfile: "تحرير الملف الشخصي",
    followers: "المتابعون",
    following_count: "يتابع",
    posts: "المنشورات",
    replies: "الردود",
    reposts: "إعادة النشر",
    media: "الوسائط",

    // Settings
    language: "اللغة",
    theme: "المظهر",
    privacy: "الخصوصية",
    notifications_settings: "الإشعارات",
    account: "الحساب",
    verification: "التحقق",

    // Verification
    verified: "موثق",
    requestVerification: "طلب التحقق",
    verificationPending: "التحقق معلق",
  },
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en")

  useEffect(() => {
    const savedLanguage = localStorage.getItem("language") as Language
    if (savedLanguage && ["en", "bn", "hi", "ar"].includes(savedLanguage)) {
      setLanguage(savedLanguage)
    }
  }, [])

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem("language", lang)
  }

  const t = (key: string): string => {
    return translations[language][key as keyof (typeof translations)[typeof language]] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      <div
        className={`font-${language === "en" ? "english" : language === "bn" ? "bengali" : language === "hi" ? "hindi" : "arabic"}`}
        dir={language === "ar" ? "rtl" : "ltr"}
      >
        {children}
      </div>
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
