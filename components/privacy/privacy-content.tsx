"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"
import {
  Shield,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Users,
  UserCheck,
  UserX,
  MessageSquare,
  MessageCircle,
  Bell,
  BellOff,
  Globe,
  AtSign,
  Download,
  FileText,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Info,
  Settings,
  Trash2,
  Database,
  Key,
  Smartphone,
  Mail,
} from "lucide-react"

interface PrivacyContentProps {
  userId: string
}

export function PrivacyContent({ userId }: PrivacyContentProps) {
  const router = useRouter()
  const { toast } = useToast()
  const isMobile = useMobile()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("profile-privacy")

  // Profile Privacy Settings
  const [isPrivate, setIsPrivate] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [showOnlineStatus, setShowOnlineStatus] = useState(true)
  const [allowProfileViews, setAllowProfileViews] = useState(true)

  // Interaction Privacy Settings
  const [allowMessages, setAllowMessages] = useState(true)
  const [allowMentions, setAllowMentions] = useState(true)
  const [allowFollowers, setAllowFollowers] = useState(true)
  const [allowComments, setAllowComments] = useState(true)

  // Data & Analytics Settings
  const [dataSharing, setDataSharing] = useState(false)
  const [analyticsTracking, setAnalyticsTracking] = useState(true)
  const [personalizedAds, setPersonalizedAds] = useState(false)
  const [thirdPartySharing, setThirdPartySharing] = useState(false)

  // Notification Privacy Settings
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [marketingEmails, setMarketingEmails] = useState(false)
  const [partnerEmails, setPartnerEmails] = useState(false)

  useEffect(() => {
    fetchPrivacyData()
  }, [userId])

  const fetchPrivacyData = async () => {
    try {
      setLoading(true)

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()

      if (error) throw error

      // Set privacy settings from profile data
      setIsPrivate(profileData.is_private || false)
      setShowEmail(profileData.show_email || false)
      setShowOnlineStatus(profileData.show_online_status !== false)
      setAllowProfileViews(profileData.allow_profile_views !== false)
      setAllowMessages(profileData.allow_messages !== false)
      setAllowMentions(profileData.allow_mentions !== false)
      setAllowFollowers(profileData.allow_followers !== false)
      setAllowComments(profileData.allow_comments !== false)
      setDataSharing(profileData.data_sharing || false)
      setAnalyticsTracking(profileData.analytics_tracking !== false)
      setPersonalizedAds(profileData.personalized_ads || false)
      setThirdPartySharing(profileData.third_party_sharing || false)
      setEmailNotifications(profileData.email_notifications !== false)
      setPushNotifications(profileData.push_notifications !== false)
      setMarketingEmails(profileData.marketing_emails || false)
      setPartnerEmails(profileData.partner_emails || false)
    } catch (error) {
      console.error("Error fetching privacy data:", error)
      toast({
        title: "Error",
        description: "Failed to load privacy settings.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const savePrivacySettings = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_private: isPrivate,
          show_email: showEmail,
          show_online_status: showOnlineStatus,
          allow_profile_views: allowProfileViews,
          allow_messages: allowMessages,
          allow_mentions: allowMentions,
          allow_followers: allowFollowers,
          allow_comments: allowComments,
          data_sharing: dataSharing,
          analytics_tracking: analyticsTracking,
          personalized_ads: personalizedAds,
          third_party_sharing: thirdPartySharing,
          email_notifications: emailNotifications,
          push_notifications: pushNotifications,
          marketing_emails: marketingEmails,
          partner_emails: partnerEmails,
        })
        .eq("id", userId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Privacy settings updated successfully!",
      })
    } catch (error) {
      console.error("Error saving privacy settings:", error)
      toast({
        title: "Error",
        description: "Failed to save privacy settings.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadData = async () => {
    toast({
      title: "Data Download",
      description: "Your data download has been initiated. You'll receive an email when it's ready.",
    })
  }

  const handleDeleteData = async () => {
    if (confirm("Are you sure you want to delete all your data? This action cannot be undone.")) {
      toast({
        title: "Data Deletion",
        description: "Your data deletion request has been submitted. This process may take up to 30 days.",
      })
    }
  }

  const tabItems = [
    { id: "profile-privacy", label: "Profile", icon: UserCheck },
    { id: "interaction-privacy", label: "Interactions", icon: MessageSquare },
    { id: "data-privacy", label: "Data & Analytics", icon: Database },
    { id: "notification-privacy", label: "Notifications", icon: Bell },
    { id: "privacy-info", label: "Information", icon: Info },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      {isMobile && (
        <div className="sticky top-0 z-50 bg-white border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Privacy & Data</h1>
              <p className="text-sm text-gray-500">Control your privacy settings</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4">
        {/* Desktop Header */}
        {!isMobile && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Privacy & Data</h1>
            <p className="text-gray-600">Control how your information is shared and used</p>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Tab Navigation */}
          {isMobile ? (
            // Mobile: Bottom tabs
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t z-40">
              <TabsList className="grid w-full grid-cols-5 h-16 bg-transparent">
                {tabItems.map((item) => {
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
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                <TabsList className="flex flex-col h-auto w-full bg-white p-1 space-y-1">
                  {tabItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <TabsTrigger
                        key={item.id}
                        value={item.id}
                        className="w-full justify-start gap-3 h-12 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600"
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </TabsTrigger>
                    )
                  })}
                </TabsList>
              </div>

              <div className="lg:col-span-3">{/* Tab Content will go here */}</div>
            </div>
          )}

          {/* Tab Contents */}
          <div className={`space-y-6 ${isMobile ? "pb-20" : ""}`}>
            {/* Profile Privacy Tab */}
            <TabsContent value="profile-privacy" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    Profile Privacy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {isPrivate ? <Lock className="h-5 w-5 text-gray-500" /> : <Unlock className="h-5 w-5 text-gray-500" />}
                      <div>
                        <h3 className="font-medium">Private Account</h3>
                        <p className="text-sm text-gray-500">Only approved followers can see your posts and profile</p>
                      </div>
                    </div>
                    <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
                  </div>

                  <Separator />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {showEmail ? <Mail className="h-5 w-5 text-gray-500" /> : <Mail className="h-5 w-5 text-gray-400" />}
                      <div>
                        <h3 className="font-medium">Show Email Address</h3>
                        <p className="text-sm text-gray-500">Display your email on your public profile</p>
                      </div>
                    </div>
                    <Switch checked={showEmail} onCheckedChange={setShowEmail} />
                  </div>

                  <Separator />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {showOnlineStatus ? <Globe className="h-5 w-5 text-gray-500" /> : <Globe className="h-5 w-5 text-gray-400" />}
                      <div>
                        <h3 className="font-medium">Show Online Status</h3>
                        <p className="text-sm text-gray-500">Display when you're active on the platform</p>
                      </div>
                    </div>
                    <Switch checked={showOnlineStatus} onCheckedChange={setShowOnlineStatus} />
                  </div>

                  <Separator />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {allowProfileViews ? <Eye className="h-5 w-5 text-gray-500" /> : <EyeOff className="h-5 w-5 text-gray-400" />}
                      <div>
                        <h3 className="font-medium">Profile View Notifications</h3>
                        <p className="text-sm text-gray-500">Let others see when you view their profile</p>
                      </div>
                    </div>
                    <Switch checked={allowProfileViews} onCheckedChange={setAllowProfileViews} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Interaction Privacy Tab */}
            <TabsContent value="interaction-privacy" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Interaction Privacy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {allowMessages ? <MessageCircle className="h-5 w-5 text-gray-500" /> : <MessageCircle className="h-5 w-5 text-gray-400" />}
                      <div>
                        <h3 className="font-medium">Direct Messages</h3>
                        <p className="text-sm text-gray-500">Allow others to send you direct messages</p>
                      </div>
                    </div>
                    <Switch checked={allowMessages} onCheckedChange={setAllowMessages} />
                  </div>

                  <Separator />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {allowMentions ? <AtSign className="h-5 w-5 text-gray-500" /> : <AtSign className="h-5 w-5 text-gray-400" />}
                      <div>
                        <h3 className="font-medium">Mentions</h3>
                        <p className="text-sm text-gray-500">Allow others to mention you in their posts</p>
                      </div>
                    </div>
                    <Switch checked={allowMentions} onCheckedChange={setAllowMentions} />
                  </div>

                  <Separator />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {allowFollowers ? <Users className="h-5 w-5 text-gray-500" /> : <UserX className="h-5 w-5 text-gray-400" />}
                      <div>
                        <h3 className="font-medium">New Followers</h3>
                        <p className="text-sm text-gray-500">Allow others to follow your account</p>
                      </div>
                    </div>
                    <Switch checked={allowFollowers} onCheckedChange={setAllowFollowers} />
                  </div>

                  <Separator />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {allowComments ? <MessageSquare className="h-5 w-5 text-gray-500" /> : <MessageSquare className="h-5 w-5 text-gray-400" />}
                      <div>
                        <h3 className="font-medium">Comments</h3>
                        <p className="text-sm text-gray-500">Allow others to comment on your posts</p>
                      </div>
                    </div>
                    <Switch checked={allowComments} onCheckedChange={setAllowComments} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Data & Analytics Tab */}
            <TabsContent value="data-privacy" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Data & Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {dataSharing ? <Database className="h-5 w-5 text-gray-500" /> : <Database className="h-5 w-5 text-gray-400" />}
                      <div>
                        <h3 className="font-medium">Data Sharing</h3>
                        <p className="text-sm text-gray-500">Allow us to use your data for improving our services</p>
                      </div>
                    </div>
                    <Switch checked={dataSharing} onCheckedChange={setDataSharing} />
                  </div>

                  <Separator />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {analyticsTracking ? <Settings className="h-5 w-5 text-gray-500" /> : <Settings className="h-5 w-5 text-gray-400" />}
                      <div>
                        <h3 className="font-medium">Analytics Tracking</h3>
                        <p className="text-sm text-gray-500">Help us improve by sharing usage analytics</p>
                      </div>
                    </div>
                    <Switch checked={analyticsTracking} onCheckedChange={setAnalyticsTracking} />
                  </div>

                  <Separator />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {personalizedAds ? <Globe className="h-5 w-5 text-gray-500" /> : <Globe className="h-5 w-5 text-gray-400" />}
                      <div>
                        <h3 className="font-medium">Personalized Ads</h3>
                        <p className="text-sm text-gray-500">Show ads based on your interests and activity</p>
                      </div>
                    </div>
                    <Switch checked={personalizedAds} onCheckedChange={setPersonalizedAds} />
                  </div>

                  <Separator />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {thirdPartySharing ? <Users className="h-5 w-5 text-gray-500" /> : <Users className="h-5 w-5 text-gray-400" />}
                      <div>
                        <h3 className="font-medium">Third-Party Sharing</h3>
                        <p className="text-sm text-gray-500">Share data with trusted third-party services</p>
                      </div>
                    </div>
                    <Switch checked={thirdPartySharing} onCheckedChange={setThirdPartySharing} />
                  </div>
                </CardContent>
              </Card>

              {/* Data Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Data Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={handleDownloadData} variant="outline" className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      Download My Data
                    </Button>
                    <Button onClick={handleDeleteData} variant="destructive" className="flex-1">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete All Data
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notification Privacy Tab */}
            <TabsContent value="notification-privacy" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notification Privacy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {emailNotifications ? <Mail className="h-5 w-5 text-gray-500" /> : <Mail className="h-5 w-5 text-gray-400" />}
                      <div>
                        <h3 className="font-medium">Email Notifications</h3>
                        <p className="text-sm text-gray-500">Receive important notifications via email</p>
                      </div>
                    </div>
                    <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                  </div>

                  <Separator />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {pushNotifications ? <Smartphone className="h-5 w-5 text-gray-500" /> : <Smartphone className="h-5 w-5 text-gray-400" />}
                      <div>
                        <h3 className="font-medium">Push Notifications</h3>
                        <p className="text-sm text-gray-500">Receive push notifications on your device</p>
                      </div>
                    </div>
                    <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
                  </div>

                  <Separator />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {marketingEmails ? <Mail className="h-5 w-5 text-gray-500" /> : <Mail className="h-5 w-5 text-gray-400" />}
                      <div>
                        <h3 className="font-medium">Marketing Emails</h3>
                        <p className="text-sm text-gray-500">Receive promotional and marketing emails</p>
                      </div>
                    </div>
                    <Switch checked={marketingEmails} onCheckedChange={setMarketingEmails} />
                  </div>

                  <Separator />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {partnerEmails ? <Users className="h-5 w-5 text-gray-500" /> : <Users className="h-5 w-5 text-gray-400" />}
                      <div>
                        <h3 className="font-medium">Partner Communications</h3>
                        <p className="text-sm text-gray-500">Receive emails from our trusted partners</p>
                      </div>
                    </div>
                    <Switch checked={partnerEmails} onCheckedChange={setPartnerEmails} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Information Tab */}
            <TabsContent value="privacy-info" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Privacy Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Your Privacy Rights</h4>
                    <p className="text-sm text-blue-800">
                      You have the right to access, modify, or delete your personal data at any time. 
                      Contact our support team for assistance with data requests.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">Data Protection</h4>
                    <p className="text-sm text-green-800">
                      We use industry-standard encryption and security measures to protect your data. 
                      Your information is never sold to third parties.
                    </p>
                  </div>

                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-medium text-yellow-900 mb-2">Data Retention</h4>
                    <p className="text-sm text-yellow-800">
                      We retain your data only as long as necessary to provide our services. 
                      You can request data deletion at any time.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" className="flex-1">
                      <FileText className="h-4 w-4 mr-2" />
                      Privacy Policy
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <FileText className="h-4 w-4 mr-2" />
                      Terms of Service
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Key className="h-4 w-4 mr-2" />
                      Cookie Policy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        {/* Save Button */}
        <div className="fixed bottom-4 right-4 z-50">
          <Button onClick={savePrivacySettings} disabled={saving} size="lg" className="shadow-lg">
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Save Privacy Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}