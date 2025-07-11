"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"
import {
  User,
  Bell,
  Shield,
  Palette,
  Smartphone,
  Mail,
  Camera,
  Save,
  ArrowLeft,
  Settings,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  AlertCircle,
  CheckCircle,
  Download,
  Upload,
  Key,
  Eye,
  EyeOff,
  Globe,
  Clock,
  Trash2,
  LogOut,
  Search,
  X,
  Check,
  RefreshCw,
  FileText,
  Archive,
  Circle,
} from "lucide-react"

interface SettingsContentProps {
  userId: string
}

interface Profile {
  id: string
  display_name?: string
  bio?: string
  location?: string
  website?: string
  avatar_url?: string
  username?: string
  is_private?: boolean
  allow_messages?: boolean
  show_email?: boolean
  created_at?: string
  updated_at?: string
}

interface NotificationSettings {
  email_notifications: boolean
  push_notifications: boolean
  sound_enabled: boolean
  marketing_emails: boolean
  security_alerts: boolean
  post_likes: boolean
  post_comments: boolean
  new_followers: boolean
  direct_messages: boolean
}

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  font_size: 'small' | 'medium' | 'large'
  reduced_motion: boolean
}

export function SettingsContent({ userId }: SettingsContentProps) {
  const router = useRouter()
  const { toast } = useToast()
  const isMobile = useMobile()

  // Core state
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("profile")
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Profile settings
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [location, setLocation] = useState("")
  const [website, setWebsite] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  // Privacy settings
  const [isPrivate, setIsPrivate] = useState(false)
  const [allowMessages, setAllowMessages] = useState(true)
  const [showEmail, setShowEmail] = useState(false)
  const [showOnlineStatus, setShowOnlineStatus] = useState(true)
  const [allowSearchEngines, setAllowSearchEngines] = useState(true)

  // Notification settings
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email_notifications: true,
    push_notifications: true,
    sound_enabled: true,
    marketing_emails: false,
    security_alerts: true,
    post_likes: true,
    post_comments: true,
    new_followers: true,
    direct_messages: true,
  })

  // Appearance settings
  const [appearance, setAppearance] = useState<AppearanceSettings>({
    theme: 'system',
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    font_size: 'medium',
    reduced_motion: false,
  })

  // Security settings
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [loginNotifications, setLoginNotifications] = useState(true)
  const [showPassword, setShowPassword] = useState(false)

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)

  // Form validation
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {}

    if (displayName.length > 50) {
      newErrors.displayName = "Display name must be 50 characters or less"
    }

    if (bio.length > 500) {
      newErrors.bio = "Bio must be 500 characters or less"
    }

    if (website && !website.match(/^https?:\/\/.+/)) {
      newErrors.website = "Website must be a valid URL starting with http:// or https://"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [displayName, bio, website])

  // Auto-save functionality
  useEffect(() => {
    if (autoSaveEnabled && hasUnsavedChanges && Object.keys(errors).length === 0) {
      const autoSaveTimer = setTimeout(() => {
        saveProfile(true)
      }, 2000)

      return () => clearTimeout(autoSaveTimer)
    }
  }, [hasUnsavedChanges, autoSaveEnabled, errors])

  // Mark changes as unsaved
  const markUnsaved = useCallback(() => {
    setHasUnsavedChanges(true)
  }, [])

  useEffect(() => {
    fetchUserData()
  }, [userId])

  useEffect(() => {
    validateForm()
  }, [validateForm])

  const fetchUserData = async () => {
    try {
      setLoading(true)

      // Get auth user
      const { data: { user: authUser } } = await supabase.auth.getUser()
      setUser(authUser)

      // Get profile
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()

      if (error) throw error

      setProfile(profileData)
      setDisplayName(profileData.display_name || "")
      setBio(profileData.bio || "")
      setLocation(profileData.location || "")
      setWebsite(profileData.website || "")
      setIsPrivate(profileData.is_private || false)
      setAllowMessages(profileData.allow_messages !== false)
      setShowEmail(profileData.show_email || false)

      // Load other settings from localStorage or API
      const savedNotifications = localStorage.getItem('notifications')
      if (savedNotifications) {
        setNotifications(JSON.parse(savedNotifications))
      }

      const savedAppearance = localStorage.getItem('appearance')
      if (savedAppearance) {
        setAppearance(JSON.parse(savedAppearance))
      }

    } catch (error) {
      console.error("Error fetching user data:", error)
      toast({
        title: "Error",
        description: "Failed to load user settings.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const saveProfile = async (isAutoSave = false) => {
    if (!validateForm()) return

    setSaving(true)
    try {
      let avatarUrl = profile?.avatar_url

      // Upload avatar if changed
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const fileName = `${userId}-${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName)

        avatarUrl = publicUrl
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          bio: bio,
          location: location,
          website: website,
          avatar_url: avatarUrl,
          is_private: isPrivate,
          allow_messages: allowMessages,
          show_email: showEmail,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)

      if (error) throw error

      // Save other settings to localStorage
      localStorage.setItem('notifications', JSON.stringify(notifications))
      localStorage.setItem('appearance', JSON.stringify(appearance))

      setHasUnsavedChanges(false)
      setAvatarFile(null)
      setAvatarPreview(null)

      if (!isAutoSave) {
        toast({
          title: "Success",
          description: "Settings saved successfully!",
        })
      }
    } catch (error) {
      console.error("Error saving profile:", error)
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onload = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      markUnsaved()
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/auth/sign-in")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const handleDeleteAccount = async () => {
    try {
      // This would need to be implemented with proper backend logic
      toast({
        title: "Account deletion initiated",
        description: "Your account will be deleted within 24 hours.",
      })
    } catch (error) {
      console.error("Error deleting account:", error)
    }
  }

  const handleExportData = async () => {
    try {
      // This would export user data
      const data = {
        profile,
        settings: {
          notifications,
          appearance,
        },
        exportDate: new Date().toISOString(),
      }
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `settings-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)

      toast({
        title: "Export complete",
        description: "Your data has been exported successfully.",
      })
    } catch (error) {
      console.error("Error exporting data:", error)
    }
  }

  const tabItems = [
    { id: "profile", label: "Profile", icon: User, description: "Basic profile information" },
    { id: "privacy", label: "Privacy", icon: Shield, description: "Privacy and visibility settings" },
    { id: "notifications", label: "Notifications", icon: Bell, description: "Notification preferences" },
    { id: "appearance", label: "Appearance", icon: Palette, description: "Theme and display settings" },
    { id: "security", label: "Security", icon: Key, description: "Security and authentication" },
    { id: "data", label: "Data", icon: Archive, description: "Export and manage your data" },
    { id: "account", label: "Account", icon: Settings, description: "Account management" },
  ]

  const filteredTabs = tabItems.filter(tab => 
    tab.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tab.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Mobile Header */}
      {isMobile && (
        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold">Settings</h1>
                {hasUnsavedChanges && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Unsaved changes
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <Button size="sm" onClick={() => saveProfile()} disabled={saving}>
                  {saving ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto p-4">
        {/* Desktop Header */}
        {!isMobile && (
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
                <p className="text-gray-600">Manage your account settings and preferences</p>
              </div>
              
              <div className="flex items-center gap-4">
                {hasUnsavedChanges && (
                  <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">Unsaved changes</span>
                    {autoSaveEnabled && (
                      <Badge variant="secondary" className="text-xs">Auto-save on</Badge>
                    )}
                  </div>
                )}
                
                <Button onClick={() => saveProfile()} disabled={saving || Object.keys(errors).length > 0}>
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save All
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {/* Search and auto-save controls */}
            <div className="flex items-center gap-4 mt-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search settings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Label htmlFor="auto-save" className="text-sm">Auto-save</Label>
                <Switch
                  id="auto-save"
                  checked={autoSaveEnabled}
                  onCheckedChange={setAutoSaveEnabled}
                />
              </div>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Tab Navigation */}
          {isMobile ? (
            // Mobile: Bottom tabs (simplified)
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 z-40">
              <TabsList className="grid w-full grid-cols-4 h-16 bg-transparent">
                {tabItems.slice(0, 4).map((item) => {
                  const Icon = item.icon
                  return (
                    <TabsTrigger
                      key={item.id}
                      value={item.id}
                      className="flex flex-col gap-1 h-full data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-xs">{item.label}</span>
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </div>
          ) : (
            // Desktop: Side tabs
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-1">
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <TabsList className="flex flex-col h-auto w-full bg-transparent p-0 space-y-2">
                      {filteredTabs.map((item) => {
                        const Icon = item.icon
                        return (
                          <TabsTrigger
                            key={item.id}
                            value={item.id}
                            className="w-full justify-start gap-3 h-auto p-4 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=active]:border-blue-200 border border-transparent rounded-lg"
                          >
                            <Icon className="h-5 w-5 flex-shrink-0" />
                            <div className="text-left">
                              <div className="font-medium">{item.label}</div>
                              <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                            </div>
                          </TabsTrigger>
                        )
                      })}
                    </TabsList>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-3">
                {/* Tab Contents will go here */}
              </div>
            </div>
          )}

          {/* Tab Contents */}
          <div className={`space-y-6 ${isMobile ? "pb-20" : ""}`}>
            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6 mt-0">
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold">Profile Information</div>
                      <div className="text-sm text-gray-600 font-normal">Manage your public profile details</div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  {/* Avatar Section */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    <div className="relative">
                      <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                        <AvatarImage src={avatarPreview || user?.user_metadata?.avatar_url || "/placeholder.svg"} />
                        <AvatarFallback className="text-xl bg-gradient-to-br from-blue-400 to-indigo-500 text-white">
                          {displayName?.[0] || user?.email?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <input
                        type="file"
                        id="avatar-upload"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('avatar-upload')?.click()}
                        className="absolute -bottom-2 -right-2 rounded-full h-8 w-8 p-0 bg-white shadow-lg border-2"
                      >
                        <Camera className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900">{displayName || "No display name"}</h3>
                      <p className="text-gray-500 mb-2">@{profile?.username || "username"}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}</span>
                        {profile?.updated_at && (
                          <span>Last updated {new Date(profile.updated_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Profile Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="displayName" className="text-sm font-medium">Display Name</Label>
                      <div className="space-y-1">
                        <Input
                          id="displayName"
                          value={displayName}
                          onChange={(e) => {
                            setDisplayName(e.target.value)
                            markUnsaved()
                          }}
                          placeholder="Your display name"
                          className={errors.displayName ? "border-red-300 focus:border-red-500" : ""}
                        />
                        {errors.displayName && (
                          <p className="text-xs text-red-600 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {errors.displayName}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">{displayName.length}/50 characters</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Label htmlFor="location" className="text-sm font-medium">Location</Label>
                      <Input
                        id="location"
                        value={location}
                        onChange={(e) => {
                          setLocation(e.target.value)
                          markUnsaved()
                        }}
                        placeholder="Your location"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="bio" className="text-sm font-medium">Bio</Label>
                    <div className="space-y-1">
                      <Textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => {
                          setBio(e.target.value)
                          markUnsaved()
                        }}
                        placeholder="Tell us about yourself"
                        className={`min-h-[120px] resize-none ${errors.bio ? "border-red-300 focus:border-red-500" : ""}`}
                      />
                      {errors.bio && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.bio}
                        </p>
                      )}
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Write a few sentences about yourself</span>
                        <span className={bio.length > 450 ? "text-amber-600" : bio.length > 500 ? "text-red-600" : ""}>
                          {bio.length}/500 characters
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="website" className="text-sm font-medium">Website</Label>
                    <div className="space-y-1">
                      <Input
                        id="website"
                        value={website}
                        onChange={(e) => {
                          setWebsite(e.target.value)
                          markUnsaved()
                        }}
                        placeholder="https://yourwebsite.com"
                        type="url"
                        className={errors.website ? "border-red-300 focus:border-red-500" : ""}
                      />
                      {errors.website && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.website}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-4">
                    <Button 
                      onClick={() => saveProfile()} 
                      disabled={saving || Object.keys(errors).length > 0} 
                      className="px-8"
                    >
                      {saving ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-6 mt-0">
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Shield className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold">Privacy Settings</div>
                      <div className="text-sm text-gray-600 font-normal">Control who can see your content and information</div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-start gap-3">
                        <Eye className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <h3 className="font-medium">Private Account</h3>
                          <p className="text-sm text-gray-500 mt-1">Only approved followers can see your posts and profile information</p>
                        </div>
                      </div>
                      <Switch 
                        checked={isPrivate} 
                        onCheckedChange={(checked) => {
                          setIsPrivate(checked)
                          markUnsaved()
                        }} 
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <h3 className="font-medium">Allow Direct Messages</h3>
                          <p className="text-sm text-gray-500 mt-1">Let other users send you direct messages</p>
                        </div>
                      </div>
                      <Switch 
                        checked={allowMessages} 
                        onCheckedChange={(checked) => {
                          setAllowMessages(checked)
                          markUnsaved()
                        }} 
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <h3 className="font-medium">Show Email Address</h3>
                          <p className="text-sm text-gray-500 mt-1">Display your email address on your public profile</p>
                        </div>
                      </div>
                      <Switch 
                        checked={showEmail} 
                        onCheckedChange={(checked) => {
                          setShowEmail(checked)
                          markUnsaved()
                        }} 
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-start gap-3">
                        <Circle className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <h3 className="font-medium">Show Online Status</h3>
                          <p className="text-sm text-gray-500 mt-1">Let others see when you're online</p>
                        </div>
                      </div>
                      <Switch 
                        checked={showOnlineStatus} 
                        onCheckedChange={(checked) => {
                          setShowOnlineStatus(checked)
                          markUnsaved()
                        }} 
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-start gap-3">
                        <Globe className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <h3 className="font-medium">Search Engine Indexing</h3>
                          <p className="text-sm text-gray-500 mt-1">Allow search engines to index your profile</p>
                        </div>
                      </div>
                      <Switch 
                        checked={allowSearchEngines} 
                        onCheckedChange={(checked) => {
                          setAllowSearchEngines(checked)
                          markUnsaved()
                        }} 
                      />
                    </div>
                  </div>

                  <Alert className="border-blue-200 bg-blue-50">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      Changes to privacy settings may take a few minutes to take effect across the platform.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6 mt-0">
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-fuchsia-50 border-b border-gray-200">
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Bell className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold">Notification Preferences</div>
                      <div className="text-sm text-gray-600 font-normal">Customize how you receive notifications</div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <h3 className="font-medium">Email Notifications</h3>
                          <p className="text-sm text-gray-500 mt-1">Receive notifications via email</p>
                        </div>
                      </div>
                      <Switch 
                        checked={notifications.email_notifications} 
                        onCheckedChange={(checked) => {
                          setNotifications(prev => ({ ...prev, email_notifications: checked }))
                          markUnsaved()
                        }} 
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Smartphone className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <h3 className="font-medium">Push Notifications</h3>
                          <p className="text-sm text-gray-500 mt-1">Receive push notifications on your device</p>
                        </div>
                      </div>
                      <Switch 
                        checked={notifications.push_notifications} 
                        onCheckedChange={(checked) => {
                          setNotifications(prev => ({ ...prev, push_notifications: checked }))
                          markUnsaved()
                        }} 
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        {notifications.sound_enabled ? (
                          <Volume2 className="h-5 w-5 text-gray-500 mt-0.5" />
                        ) : (
                          <VolumeX className="h-5 w-5 text-gray-500 mt-0.5" />
                        )}
                        <div>
                          <h3 className="font-medium">Sound Effects</h3>
                          <p className="text-sm text-gray-500 mt-1">Play sounds for notifications</p>
                        </div>
                      </div>
                      <Switch 
                        checked={notifications.sound_enabled} 
                        onCheckedChange={(checked) => {
                          setNotifications(prev => ({ ...prev, sound_enabled: checked }))
                          markUnsaved()
                        }} 
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <h3 className="font-medium">Marketing Emails</h3>
                          <p className="text-sm text-gray-500 mt-1">Receive promotional emails from the platform</p>
                        </div>
                      </div>
                      <Switch 
                        checked={notifications.marketing_emails} 
                        onCheckedChange={(checked) => {
                          setNotifications(prev => ({ ...prev, marketing_emails: checked }))
                          markUnsaved()
                        }} 
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <h3 className="font-medium">Security Alerts</h3>
                          <p className="text-sm text-gray-500 mt-1">Receive important security notifications</p>
                        </div>
                      </div>
                      <Switch 
                        checked={notifications.security_alerts} 
                        onCheckedChange={(checked) => {
                          setNotifications(prev => ({ ...prev, security_alerts: checked }))
                          markUnsaved()
                        }} 
                      />
                    </div>
                  </div>

                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Notification preferences are applied immediately.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-6 mt-0">
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-yellow-50 to-amber-50 border-b border-gray-200">
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Palette className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold">Appearance Settings</div>
                      <div className="text-sm text-gray-600 font-normal">Customize the app's appearance</div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        {appearance.theme === 'dark' ? (
                          <Moon className="h-5 w-5 text-gray-500 mt-0.5" />
                        ) : appearance.theme === 'light' ? (
                          <Sun className="h-5 w-5 text-gray-500 mt-0.5" />
                        ) : (
                          <Globe className="h-5 w-5 text-gray-500 mt-0.5" />
                        )}
                        <div>
                          <h3 className="font-medium">Theme</h3>
                          <p className="text-sm text-gray-500 mt-1">Choose between light, dark, or system theme</p>
                        </div>
                      </div>
                      <Select onValueChange={(value) => {
                        setAppearance(prev => ({ ...prev, theme: value as AppearanceSettings['theme'] }))
                        markUnsaved()
                      }} value={appearance.theme}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select a theme" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-start gap-3">
                        <Globe className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <h3 className="font-medium">Language</h3>
                          <p className="text-sm text-gray-500 mt-1">Choose the app's language</p>
                        </div>
                      </div>
                      <Select onValueChange={(value) => {
                        setAppearance(prev => ({ ...prev, language: value }))
                        markUnsaved()
                      }} value={appearance.language}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select a language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Español</SelectItem>
                          <SelectItem value="fr">Français</SelectItem>
                          <SelectItem value="de">Deutsch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <h3 className="font-medium">Timezone</h3>
                          <p className="text-sm text-gray-500 mt-1">Choose your preferred timezone</p>
                        </div>
                      </div>
                      <Select onValueChange={(value) => {
                        setAppearance(prev => ({ ...prev, timezone: value }))
                        markUnsaved()
                      }} value={appearance.timezone}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select a timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          {Intl.supportedValuesOf('timeZone').map(zone => (
                            <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <h3 className="font-medium">Font Size</h3>
                          <p className="text-sm text-gray-500 mt-1">Adjust the app's font size</p>
                        </div>
                      </div>
                      <Select onValueChange={(value) => {
                        setAppearance(prev => ({ ...prev, font_size: value as AppearanceSettings['font_size'] }))
                        markUnsaved()
                      }} value={appearance.font_size}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select font size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Small</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="large">Large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-start gap-3">
                        <Circle className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <h3 className="font-medium">Reduced Motion</h3>
                          <p className="text-sm text-gray-500 mt-1">Reduce motion and animations for better performance</p>
                        </div>
                      </div>
                      <Switch 
                        checked={appearance.reduced_motion} 
                        onCheckedChange={(checked) => {
                          setAppearance(prev => ({ ...prev, reduced_motion: checked }))
                          markUnsaved()
                        }} 
                      />
                    </div>
                  </div>

                  <Alert className="border-purple-200 bg-purple-50">
                    <AlertCircle className="h-4 w-4 text-purple-600" />
                    <AlertDescription className="text-purple-800">
                      Appearance settings are applied immediately.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6 mt-0">
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-red-50 to-rose-50 border-b border-gray-200">
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Key className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold">Security Settings</div>
                      <div className="text-sm text-gray-600 font-normal">Manage your account security</div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <h3 className="font-medium">Two-Factor Authentication</h3>
                          <p className="text-sm text-gray-500 mt-1">Enhance your account security</p>
                        </div>
                      </div>
                      <Switch 
                        checked={twoFactorEnabled} 
                        onCheckedChange={(checked) => {
                          setTwoFactorEnabled(checked)
                          markUnsaved()
                        }} 
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-start gap-3">
                        <Eye className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <h3 className="font-medium">Show Password</h3>
                          <p className="text-sm text-gray-500 mt-1">Display your password in your profile</p>
                        </div>
                      </div>
                      <Switch 
                        checked={showPassword} 
                        onCheckedChange={(checked) => {
                          setShowPassword(checked)
                          markUnsaved()
                        }} 
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <h3 className="font-medium">Login Notifications</h3>
                          <p className="text-sm text-gray-500 mt-1">Receive notifications for new logins</p>
                        </div>
                      </div>
                      <Switch 
                        checked={loginNotifications} 
                        onCheckedChange={(checked) => {
                          setLoginNotifications(checked)
                          markUnsaved()
                        }} 
                      />
                    </div>
                  </div>

                  <Alert className="border-orange-200 bg-orange-50">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      Security settings are applied immediately.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Data Tab */}
            <TabsContent value="data" className="space-y-6 mt-0">
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-gray-200">
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-100 rounded-lg">
                      <Archive className="h-5 w-5 text-cyan-600" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold">Data Management</div>
                      <div className="text-sm text-gray-600 font-normal">Export and manage your personal data</div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-start gap-3">
                        <Download className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <h3 className="font-medium">Export Your Data</h3>
                          <p className="text-sm text-gray-500 mt-1">Download a copy of your personal data</p>
                        </div>
                      </div>
                      <Button onClick={handleExportData} className="flex-1">
                        <Download className="h-4 w-4 mr-2" />
                        Export Data
                      </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-start gap-3">
                        <Trash2 className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <h3 className="font-medium">Delete Account</h3>
                          <p className="text-sm text-gray-500 mt-1">Permanently delete your account and all associated data</p>
                        </div>
                      </div>
                      <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)} className="flex-1">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Account
                      </Button>
                    </div>
                  </div>

                  <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      Account deletion is permanent and cannot be undone. All your posts, followers, and data will be
                      permanently removed.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Account Tab */}
            <TabsContent value="account" className="space-y-6 mt-0">
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200">
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Settings className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold">Account Settings</div>
                      <div className="text-sm text-gray-600 font-normal">Manage your account and preferences</div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                      <Mail className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="font-medium">Email</p>
                        <p className="text-sm text-gray-500">{user?.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                      <User className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="font-medium">Username</p>
                        <p className="text-sm text-gray-500">@{profile?.username}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Account deletion is permanent and cannot be undone. All your posts, followers, and data will be
                      permanently removed.
                    </AlertDescription>
                  </Alert>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" className="flex-1 bg-transparent">
                      Change Password
                    </Button>
                    <Button variant="destructive" className="flex-1">
                      Delete Account
                    </Button>
                  </div>

                  <Separator />

                  <Button onClick={handleSignOut} variant="outline" className="w-full bg-transparent">
                    Sign Out
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            
          </div>
        </Tabs>
      </div>

      {/* Delete Account Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your account and remove your data from our servers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteAccount}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign Out Dialog */}
      <Dialog open={signOutDialogOpen} onOpenChange={setSignOutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure you want to sign out?</DialogTitle>
            <DialogDescription>
              This action will log you out of your current session.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignOutDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleSignOut}>Sign Out</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Data Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Your Data</DialogTitle>
            <DialogDescription>
              Click the button below to download a JSON file containing your account settings and data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleExportData}>Export Data</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
