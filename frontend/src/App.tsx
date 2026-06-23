import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthInit, useAuth } from '@/hooks/useAuth'

// Pages
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import VerifyEmailPage from '@/pages/auth/VerifyEmailPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import CloudflareWizardPage from '@/pages/cloudflare/CloudflareWizardPage'
import ContentPolicyPage from '@/pages/content-policy/ContentPolicyPage'
import DeviceSetupPage from '@/pages/devices/DeviceSetupPage'
import ConfigGeneratorPage from '@/pages/devices/ConfigGeneratorPage'
import SettingsPage from '@/pages/settings/SettingsPage'
import ActivityPage from '@/pages/activity/ActivityPage'
import OnboardingPage from '@/pages/onboarding/OnboardingPage'
import LandingPage from '@/pages/landing/LandingPage'
import DashboardLayout from '@/components/layout/DashboardLayout'
import TermsPage from '@/pages/legal/TermsPage'
import PrivacyPage from '@/pages/legal/PrivacyPage'


// ── Auth guard ────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

// ── Public-only guard (redirect if already logged in) ─────
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  // Restore session on mount
  useAuthInit()

  return (
    <Routes>
      {/* Root — show landing for guests, dashboard for auth */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth pages */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
      <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />


      {/* Onboarding — protected but outside dashboard layout */}
      <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

      {/* Protected dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        {/* <Route path="cloudflare/connect" element={<CloudflareWizardPage />} /> */}
        <Route path="/dashboard/cloudflare/connect" element={<CloudflareWizardPage />} />
        <Route path="content-policy" element={<ContentPolicyPage />} />
        <Route path="devices" element={<DeviceSetupPage />} />
        <Route path="config-generator" element={<ConfigGeneratorPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="activity" element={<ActivityPage />} />
        {/* More routes added as we build each page */}
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
