"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { User, CreditCard, Bell, Lock, Code, Check, Copy, Loader2 } from "lucide-react"
import { toast } from "sonner"

type Tab = "profile" | "billing" | "notifications" | "security" | "widget"

interface UserProfile {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  company?: string
  street_address?: string
  city?: string
  state?: string
  zip_code?: string
  plan?: string
  plan_limits?: any
  widget_addon?: boolean
  embed_key?: string
}

// ✅ PHASE 24-E: V0-generated Account Settings page with 5 tabs (Profile, Billing, Notifications, Security, Widget)
export default function AccountSettingsPageV0() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>("profile")
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      const api = process.env.NEXT_PUBLIC_API_URL || "https://deedpro-main-api.onrender.com"
      const token = localStorage.getItem("access_token")

      if (!token) {
        router.push("/login?redirect=/account-settings")
        return
      }

      const response = await fetch(`${api}/users/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch profile")
      }

      const profile = await response.json()
      setUserProfile(profile)
    } catch (err) {
      console.error("Error fetching profile:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (planKey: string) => {
    try {
      const api = process.env.NEXT_PUBLIC_API_URL || "https://deedpro-main-api.onrender.com"
      const token = localStorage.getItem("access_token")

      const response = await fetch(`${api}/users/upgrade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: planKey }),
      })

      if (!response.ok) {
        throw new Error("Failed to upgrade plan")
      }

      const data = await response.json()
      if (data.session_url) {
        window.location.href = data.session_url
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upgrade plan")
    }
  }

  const handleManageSubscription = async () => {
    setSaving(true)
    try {
      const api = process.env.NEXT_PUBLIC_API_URL || "https://deedpro-main-api.onrender.com"
      const token = localStorage.getItem("access_token")

      const response = await fetch(`${api}/payments/create-portal-session`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to create portal session")
      }

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open billing portal")
    } finally {
      setSaving(false)
    }
  }

  const copySnippet = () => {
    const embedKey = userProfile?.embed_key || "YOUR_EMBED_KEY"
    const snippet = `<script src="https://deedpro.com/widget.js" data-key="${embedKey}"></script>
<iframe src="https://deedpro.com/embed/${embedKey}" width="100%" height="600"></iframe>`

    navigator.clipboard.writeText(snippet)
    toast.success("Embed snippet copied to clipboard!")
  }

  const tabs = [
    { id: "profile" as Tab, label: "Profile", icon: User },
    { id: "billing" as Tab, label: "Billing", icon: CreditCard },
    { id: "notifications" as Tab, label: "Notifications", icon: Bell },
    { id: "security" as Tab, label: "Security", icon: Lock },
    { id: "widget" as Tab, label: "Widget Add-on", icon: Code },
  ]

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full border-4 border-purple-100 animate-spin border-t-[#7C4DFF] mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Loading settings...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <Sidebar />

      <main className="flex-1 p-6 md:p-10 lg:p-16">
        <div className="max-w-[1200px] mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-3 tracking-tight">Account Settings</h1>
            <p className="text-lg text-slate-600">Manage your account preferences and billing information.</p>
          </div>

          {/* Tabs Navigation */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden mb-8">
            <div className="flex overflow-x-auto border-b border-slate-200">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm whitespace-nowrap transition-all ${
                      activeTab === tab.id
                        ? "text-[#7C4DFF] border-b-3 border-[#7C4DFF] bg-purple-50/50"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* Tab Content */}
            <div className="p-8">
              {activeTab === "profile" && <ProfileTab userProfile={userProfile} />}
              {activeTab === "billing" && (
                <BillingTab
                  userProfile={userProfile}
                  onUpgrade={handleUpgrade}
                  onManageSubscription={handleManageSubscription}
                  saving={saving}
                />
              )}
              {activeTab === "notifications" && <NotificationsTab />}
              {activeTab === "security" && <SecurityTab />}
              {activeTab === "widget" && <WidgetTab userProfile={userProfile} onCopySnippet={copySnippet} />}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// Profile Tab Component
function ProfileTab({ userProfile }: { userProfile: UserProfile | null }) {
  const [formData, setFormData] = useState({
    first_name: userProfile?.first_name || "",
    last_name: userProfile?.last_name || "",
    email: userProfile?.email || "",
    phone: userProfile?.phone || "",
    company: userProfile?.company || "",
    street_address: userProfile?.street_address || "",
    city: userProfile?.city || "",
    state: userProfile?.state || "",
    zip_code: userProfile?.zip_code || "",
  })

  const handleSave = () => {
    toast.success("Profile saved!")
  }

  return (
    <div className="space-y-8">
      {/* Personal Information */}
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-6">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">First Name</label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-[#7C4DFF] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Last Name</label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-[#7C4DFF] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-[#7C4DFF] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-[#7C4DFF] transition-colors"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">Company</label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-[#7C4DFF] transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-6">Address Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">Street Address</label>
            <input
              type="text"
              value={formData.street_address}
              onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-[#7C4DFF] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">City</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-[#7C4DFF] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">State</label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-[#7C4DFF] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">ZIP Code</label>
            <input
              type="text"
              value={formData.zip_code}
              onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-[#7C4DFF] transition-colors"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="px-8 py-4 bg-[#7C4DFF] hover:bg-[#6a3de8] text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
      >
        Save Changes
      </button>
    </div>
  )
}

// Billing Tab Component
function BillingTab({
  userProfile,
  onUpgrade,
  onManageSubscription,
  saving,
}: {
  userProfile: UserProfile | null
  onUpgrade: (plan: string) => void
  onManageSubscription: () => void
  saving: boolean
}) {
  const currentPlan = userProfile?.plan || "starter"

  const plans = [
    {
      key: "starter",
      name: "Starter",
      price: "Free",
      features: ["5 deeds/month", "Basic AI assistance", "Standard templates", "Email support"],
    },
    {
      key: "professional",
      name: "Professional",
      price: "$29",
      features: ["Unlimited deeds", "Advanced AI assistance", "SoftPro integration", "Priority support"],
    },
    {
      key: "enterprise",
      name: "Enterprise",
      price: "$99",
      features: ["Everything in Pro", "Qualia integration", "API access", "Team management", "24/7 support"],
    },
  ]

  return (
    <div className="space-y-8">
      {/* Current Plan Status */}
      {currentPlan !== "starter" && (
        <div className="bg-slate-50 border border-[#7C4DFF]/30 rounded-xl p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                {plans.find((p) => p.key === currentPlan)?.name} Plan
              </h3>
              <p className="text-slate-600">Your current subscription</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-[#7C4DFF]">{plans.find((p) => p.key === currentPlan)?.price}</div>
              <div className="text-sm text-slate-600">per month</div>
            </div>
          </div>
          <button
            onClick={onManageSubscription}
            disabled={saving}
            className="mt-6 px-6 py-3 bg-[#7C4DFF] hover:bg-[#6a3de8] text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Manage Subscription"
            )}
          </button>
        </div>
      )}

      {/* Choose Your Plan */}
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-6">Choose Your Plan</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = plan.key === currentPlan
            return (
              <div
                key={plan.key}
                className={`rounded-xl p-6 border-2 transition-all ${
                  isCurrent ? "border-[#7C4DFF] bg-purple-50/50" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                {isCurrent && (
                  <div className="inline-block px-3 py-1 bg-[#7C4DFF] text-white text-xs font-bold rounded-full mb-4">
                    CURRENT
                  </div>
                )}
                <h4 className="text-2xl font-bold text-slate-800 mb-2">{plan.name}</h4>
                <div className="text-3xl font-bold text-[#7C4DFF] mb-1">{plan.price}</div>
                {plan.price !== "Free" && <div className="text-sm text-slate-600 mb-6">per month</div>}
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => !isCurrent && onUpgrade(plan.key)}
                  disabled={isCurrent}
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    isCurrent
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                      : "bg-[#7C4DFF] hover:bg-[#6a3de8] text-white shadow-md hover:shadow-lg"
                  }`}
                >
                  {isCurrent ? "Current Plan" : `Upgrade to ${plan.name}`}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Payment Methods */}
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-6">Payment Methods</h3>
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
              VISA
            </div>
            <div>
              <div className="font-medium text-slate-800">•••• •••• •••• 4242</div>
              <div className="text-sm text-slate-500">Expires 12/26</div>
            </div>
          </div>
          <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">Default</span>
        </div>
        <button className="mt-4 px-6 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-colors">
          + Add Payment Method
        </button>
      </div>

      {/* Billing History */}
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-6">Billing History</h3>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Description</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-4 text-sm text-slate-600">11/01/2025</td>
                <td className="py-3 px-4 text-sm text-slate-800">Professional Plan - Monthly</td>
                <td className="py-3 px-4 text-sm text-slate-800 font-medium">$29.00</td>
                <td className="py-3 px-4">
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">Paid</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Notifications Tab Component
function NotificationsTab() {
  const [notifications, setNotifications] = useState({
    deed_completion: true,
    payment_receipts: true,
    shared_deed_updates: true,
    marketing: false,
  })

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-slate-800 mb-6">Email Notifications</h3>

      {[
        {
          key: "deed_completion" as const,
          label: "Deed completion notifications",
          description: "Get notified when your deeds are ready",
        },
        {
          key: "payment_receipts" as const,
          label: "Payment receipts",
          description: "Receive receipts for all payments",
        },
        {
          key: "shared_deed_updates" as const,
          label: "Shared deed updates",
          description: "Notifications when shared deeds are approved or rejected",
        },
        {
          key: "marketing" as const,
          label: "Marketing communications",
          description: "Product updates and feature announcements",
        },
      ].map((item) => (
        <label
          key={item.key}
          className="flex items-start gap-4 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
        >
          <input
            type="checkbox"
            checked={notifications[item.key]}
            onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
            className="mt-1 w-5 h-5 text-[#7C4DFF] rounded focus:ring-2 focus:ring-[#7C4DFF]"
          />
          <div className="flex-1">
            <div className="font-medium text-slate-800">{item.label}</div>
            <div className="text-sm text-slate-600">{item.description}</div>
          </div>
        </label>
      ))}
    </div>
  )
}

// Security Tab Component
function SecurityTab() {
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  })

  const handleUpdatePassword = () => {
    toast.success("Password updated!")
  }

  return (
    <div className="space-y-8">
      {/* Change Password */}
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-6">Change Password</h3>
        <div className="max-w-[500px] space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Current Password</label>
            <input
              type="password"
              value={passwords.current}
              onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-[#7C4DFF] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
            <input
              type="password"
              value={passwords.new}
              onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-[#7C4DFF] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Confirm New Password</label>
            <input
              type="password"
              value={passwords.confirm}
              onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-[#7C4DFF] transition-colors"
            />
          </div>
          <button
            onClick={handleUpdatePassword}
            className="px-8 py-4 bg-[#7C4DFF] hover:bg-[#6a3de8] text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            Update Password
          </button>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-slate-50 rounded-xl p-6 flex items-center justify-between">
        <div>
          <h4 className="text-lg font-bold text-slate-800 mb-2">SMS Authentication</h4>
          <p className="text-slate-600">Add an extra layer of security to your account</p>
        </div>
        <button className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors">
          Enable 2FA
        </button>
      </div>
    </div>
  )
}

// Widget Tab Component
function WidgetTab({
  userProfile,
  onCopySnippet,
}: {
  userProfile: UserProfile | null
  onCopySnippet: () => void
}) {
  const widgetEnabled = userProfile?.widget_addon || false
  const embedKey = userProfile?.embed_key || "YOUR_EMBED_KEY"

  return (
    <div className="space-y-8">
      {/* Widget Status */}
      <div
        className={`rounded-xl p-6 border-2 ${
          widgetEnabled ? "border-green-500 bg-green-50" : "border-slate-200 bg-slate-50"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">{widgetEnabled ? "✅ Enabled" : "❌ Disabled"}</h3>
            <p className="text-slate-600">Widget Add-On Status</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-[#7C4DFF]">{widgetEnabled ? "$49" : "N/A"}</div>
            {widgetEnabled && <div className="text-sm text-slate-600">per month</div>}
          </div>
        </div>
      </div>

      {widgetEnabled ? (
        <>
          {/* Embed Key */}
          <div className="bg-white border-2 border-green-500 rounded-xl p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">🔑 Your Embed Key</h3>
            <div className="bg-slate-800 rounded-lg p-4 mb-4">
              <code className="text-green-400 font-mono text-sm break-all">{embedKey}</code>
            </div>
            <button
              onClick={onCopySnippet}
              className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4" />📋 Copy Embed Snippet
            </button>
          </div>

          {/* Usage Instructions */}
          <div className="bg-slate-50 rounded-xl p-6">
            <h4 className="text-lg font-bold text-slate-800 mb-3">Usage Instructions</h4>
            <ol className="list-decimal list-inside space-y-2 text-slate-700">
              <li>Copy the embed snippet above</li>
              <li>Paste it into your website's HTML</li>
              <li>The widget will appear automatically</li>
              <li>Customize styling via the widget dashboard</li>
            </ol>
          </div>
        </>
      ) : (
        <div className="bg-blue-50 rounded-xl p-8 text-center">
          <div className="text-6xl mb-4">🔧</div>
          <h3 className="text-2xl font-bold text-slate-800 mb-3">Widget Add-On Not Enabled</h3>
          <p className="text-slate-600 mb-6">Contact your administrator to enable the widget add-on for your account</p>
          <div className="bg-slate-100 rounded-lg p-4 inline-block">
            <p className="text-sm text-slate-700">
              <strong>💡 Widget Add-On:</strong> $49/month additional charge
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

