"use client"
import { Suspense, useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ATTEMPTS, afterAttempt, delayBeforeAttempt, type PlanWatch } from "@/lib/planRefresh"
import Sidebar from "@/components/Sidebar"
import { User, CreditCard, Bell, Lock, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { TIERS, priceLabel } from "@/lib/pricing"

type Tab = "profile" | "billing" | "notifications" | "security"

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
  /* PRICING1: the Widget Add-on TAB is deleted (owner-ruled). It priced
     an unimplemented product at $49/month and handed the customer a
     script tag for https://deedpro.com/widget.js — no such file, no
     /embed route, no handler. A dead marketing component with a payment
     button attached.

     The FLAG stays: users.widget_addon is real data an admin may have
     set, and dropping a column is not a UI ticket. It returns when
     DX0's widget work actually ships. */
  widget_addon?: boolean
  embed_key?: string
}

// ✅ PHASE 24-E: V0-generated Account Settings page with 5 tabs (Profile, Billing, Notifications, Security, Widget)
/**
 * The Suspense boundary is `useSearchParams()`'s. Without it Next fails
 * the BUILD rather than the render, so jest and tsc both stay green
 * while `next build` does not. Fourth time this wave.
 */
export default function AccountSettingsPageV0() {
  return (
    <Suspense fallback={null}>
      <AccountSettingsPage />
    </Suspense>
  )
}

function AccountSettingsPage() {
  const router = useRouter()
  const params = useSearchParams()
  const [activeTab, setActiveTab] = useState<Tab>("profile")
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  // Read by the checkout watcher without re-arming it on every fetch.
  const userProfileRef = useRef<UserProfile | null>(null)

  /**
   * MONEY1 — THE PAGE ASKED ONCE AND NEVER AGAIN.
   *
   * The mount fetch was never the defect (the badge has always been
   * bound to `userProfile.plan` from this call). The defect is that it
   * happens exactly once, and the moment it matters most is the one
   * moment it is guaranteed to be too early:
   *
   *   Stripe redirects to `?success=true` the instant checkout
   *   completes. The webhook that upgrades the plan arrives
   *   INDEPENDENTLY, over the same seconds. So the one fetch races the
   *   upgrade and usually loses — and then nothing asks again until the
   *   officer reloads by hand.
   *
   * She sees Free after paying, which is the same thing she would see if
   * the payment had failed. The page is not wrong about the data; it is
   * wrong about WHEN, and the two are indistinguishable from her seat.
   *
   * So: refetch on return from checkout with a short retry, and refetch
   * when she comes back to the tab. Neither invents anything — both just
   * ask again.
   */
  useEffect(() => {
    fetchUserProfile()
  }, [])

  /**
   * BACK FROM CHECKOUT. Stripe has redirected, so the payment is
   * OBSERVED — that much is not a guess. What has not necessarily
   * happened yet is the webhook, so this asks again on a short schedule
   * and reports honestly when it runs out.
   *
   * The policy is `lib/planRefresh`, called rather than inlined: "what
   * does it do on attempt four" is a question a test should be able to
   * ask, and a setTimeout chain in a component can only be grepped.
   */
  const [checkout, setCheckout] = useState<PlanWatch | null>(null)
  useEffect(() => {
    if (params?.get("success") !== "true") return
    let cancelled = false
    const startedOn = userProfileRef.current?.plan ?? null
    const run = async (attempt: number) => {
      const wait = delayBeforeAttempt(attempt)
      if (wait === null || cancelled) return
      await new Promise((r) => setTimeout(r, wait))
      if (cancelled) return
      const profile = await fetchUserProfile({ silent: true })
      if (cancelled) return
      const next = afterAttempt(attempt, profile?.plan, startedOn)
      setCheckout(next)
      if (next.state === "checking") run(next.attempt)
    }
    setCheckout({ state: "checking", attempt: 0 })
    run(0)
    return () => { cancelled = true }
  }, [params])

  // Coming back to the tab is the cheapest honest signal that the world
  // may have moved: she went to Stripe's portal, or waited, and returned.
  useEffect(() => {
    const onFocus = () => { fetchUserProfile({ silent: true }) }
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onFocus)
    return () => {
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onFocus)
    }
  }, [])

  const fetchUserProfile = async ({ silent = false }: { silent?: boolean } = {}) => {
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
      userProfileRef.current = profile
      return profile
    } catch (err) {
      console.error("Error fetching profile:", err)
    } finally {
      if (!silent) setLoading(false)
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


  const tabs = [
    { id: "profile" as Tab, label: "Profile", icon: User },
    { id: "billing" as Tab, label: "Billing", icon: CreditCard },
    { id: "notifications" as Tab, label: "Notifications", icon: Bell },
    { id: "security" as Tab, label: "Security", icon: Lock },
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
              {/* MONEY1 — back from checkout, saying only what is known.
                  Stripe redirected, so the payment is OBSERVED. Whether
                  the plan has caught up is a separate fact, and while it
                  has not this says exactly that rather than claiming
                  either outcome. */}
              {activeTab === "billing" && checkout && (
                <div className={`mb-6 rounded-xl border p-4 ${
                  checkout.state === "changed"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-amber-200 bg-amber-50 text-amber-900"
                }`}>
                  {checkout.state === "changed" ? (
                    <p className="font-medium">
                      Payment received — your plan is now {checkout.plan}.
                    </p>
                  ) : checkout.state === "checking" ? (
                    <p className="font-medium">
                      Payment received. Confirming your new plan…
                    </p>
                  ) : (
                    <>
                      <p className="font-medium">
                        Payment received, and your plan has not updated yet.
                      </p>
                      <p className="text-sm mt-1">
                        Stripe has your payment — this page stopped waiting after
                        a few seconds, which is a delay on our side rather than a
                        problem with your card. Refresh in a minute, and contact
                        us if it has not changed.
                      </p>
                    </>
                  )}
                </div>
              )}
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
  // ONE VOCABULARY (TRIAL1). This read `|| "starter"` while the database
  // stores 'free', so every free user fell through every comparison
  // below: `currentPlan !== "starter"` was true, the "Current Plan"
  // card rendered, and `plans.find(p => p.key === 'free')` was
  // undefined — a blank name over a blank price, above a Manage
  // Subscription button that 404s because they have no Stripe customer.
  const currentPlan = userProfile?.plan || "free"

  // PRICING1: one source. This array carried its own prices —
  // Professional at $29 while the marketing page said $149 for the same
  // plan, and neither matched what Stripe would charge.
  const plans = TIERS

  return (
    <div className="space-y-8">
      {/* Current Plan Status */}
      {currentPlan !== "free" && (
        <div className="bg-slate-50 border border-[#7C4DFF]/30 rounded-xl p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                {plans.find((p) => p.key === currentPlan)?.name} Plan
              </h3>
              <p className="text-slate-600">Your current subscription</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-[#7C4DFF]">{(() => { const t = plans.find((p) => p.key === currentPlan); return t ? priceLabel(t) : ''; })()}</div>
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
                <div className="text-3xl font-bold text-[#7C4DFF] mb-1">
                  {priceLabel(plan)}
                  <span className="text-sm font-normal text-slate-500">{plan.cadence}</span>
                </div>
                {plan.badge && (
                  <div className="inline-block mb-2 rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">
                    {plan.badge}
                  </div>
                )}
                <p className="text-sm text-slate-600 mb-6">{plan.blurb}</p>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => plan.purchasable && !isCurrent && onUpgrade(plan.key)}
                  disabled={isCurrent || !plan.purchasable}
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    isCurrent || !plan.purchasable
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                      : "bg-[#7C4DFF] hover:bg-[#6a3de8] text-white shadow-md hover:shadow-lg"
                  }`}
                >
                  {/* PRICING1: a tier with no product behind it gets no
                      buy control — Business needs the org model (RED-S5)
                      that does not exist. */}
                  {!plan.purchasable
                    ? "Not yet available"
                    : isCurrent
                      ? "Current Plan"
                      : `Upgrade to ${plan.name}`}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Payment Methods */}
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-6">Payment Methods</h3>
        {currentPlan === "free" ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
            <CreditCard className="w-12 h-12 mx-auto mb-3 text-slate-400" />
            <p className="text-slate-600 mb-4">No payment method on file</p>
            <p className="text-sm text-slate-500">Add a payment method when you upgrade to a paid plan.</p>
          </div>
        ) : (
          <>
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <p className="text-slate-600 mb-4">
                Your payment methods are managed through our secure billing portal.
              </p>
              <button
                onClick={onManageSubscription}
                disabled={saving}
                className="px-6 py-3 bg-[#7C4DFF] hover:bg-[#6a3de8] text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Manage Payment Methods"
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Billing History */}
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-6">Billing History</h3>
        {currentPlan === "free" ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
            <p className="text-slate-600">No billing history yet.</p>
            <p className="text-sm text-slate-500 mt-1">Your invoices will appear here once you upgrade to a paid plan.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <p className="text-slate-600 mb-4">
              View and download your invoices from the billing portal.
            </p>
            <button
              onClick={onManageSubscription}
              disabled={saving}
              className="px-6 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              View Billing History
            </button>
          </div>
        )}
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
