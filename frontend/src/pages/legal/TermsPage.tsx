import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const LAST_UPDATED = 'June 22, 2026'
const CONTACT_EMAIL = 'team@solstore.pro'

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-3xl mx-auto px-6 py-16 space-y-10">
                <div>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors mb-8"
                    >
                        <ArrowLeft size={14} /> Back to home
                    </Link>
                    <h1 className="font-sora font-bold text-4xl text-foreground">Terms of Service</h1>
                    <p className="text-sm text-foreground-muted mt-2">Last updated: {LAST_UPDATED}</p>
                </div>

                <div className="prose-noori space-y-8 text-sm text-foreground-muted leading-relaxed">

                    <Section title="1. Acceptance of Terms">
                        <p>
                            By creating an account or using NoorI ("the Service"), you agree to these Terms of Service. If you do not agree, do not use the Service. These terms apply to all users, including individuals and those representing organizations.
                        </p>
                    </Section>

                    <Section title="2. What NoorI Does">
                        <p>
                            NoorI is a parental controls and content filtering platform that integrates with your Cloudflare account to apply DNS-level filtering rules on your devices. NoorI manages filtering rules on your behalf using a limited-permission API token you authorize during setup.
                        </p>
                        <p>
                            NoorI does not own or operate the underlying network infrastructure. Filtering is performed by Cloudflare's Gateway service on your account. You are responsible for maintaining a valid Cloudflare account.
                        </p>
                    </Section>

                    <Section title="3. Account Responsibilities">
                        <ul>
                            <li>You must provide accurate information when creating an account.</li>
                            <li>You are responsible for maintaining the security of your account credentials.</li>
                            <li>You must not share your account with others or use the Service on behalf of others without their knowledge.</li>
                            <li>You are responsible for all activity that occurs under your account.</li>
                        </ul>
                    </Section>

                    <Section title="4. Acceptable Use">
                        <p>You agree not to use NoorI to:</p>
                        <ul>
                            <li>Violate any applicable law or regulation</li>
                            <li>Harm, harass, or monitor individuals without their consent</li>
                            <li>Attempt to circumvent, reverse-engineer, or disrupt the Service</li>
                            <li>Use the Service to block content for malicious or deceptive purposes</li>
                            <li>Resell or redistribute access to the Service without authorization</li>
                        </ul>
                    </Section>

                    <Section title="5. Subscriptions and Billing">
                        <p>
                            NoorI offers Free, Pro, and Family subscription tiers. Paid subscriptions are billed in USD via Stripe (international) or Razorpay (India). Prices are as displayed at the time of purchase.
                        </p>
                        <p>
                            Subscriptions renew automatically at the end of each billing period unless cancelled. You may cancel at any time from your account settings; you will retain access until the end of the current billing period. No refunds are issued for partial periods.
                        </p>
                        <p>
                            We reserve the right to change pricing with 30 days' notice. Continued use after a price change constitutes acceptance of the new price.
                        </p>
                    </Section>

                    <Section title="6. Cloudflare Integration">
                        <p>
                            To use NoorI, you provide your Cloudflare Global API Key during setup. This key is used once to create a limited-permission scoped token, then immediately discarded and never stored. Only the scoped token (which can only manage Gateway rules) is stored, encrypted at rest.
                        </p>
                        <p>
                            You are responsible for your Cloudflare account and its terms. NoorI is not affiliated with or endorsed by Cloudflare, Inc.
                        </p>
                    </Section>

                    <Section title="7. Service Availability">
                        <p>
                            We aim for high availability but do not guarantee uninterrupted service. Filtering effectiveness depends on devices being connected to Cloudflare's network and is outside NoorI's direct control.
                        </p>
                        <p>
                            We may modify, suspend, or discontinue the Service with reasonable notice. In the event of discontinuation of a paid feature, we will provide a prorated refund or service credit.
                        </p>
                    </Section>

                    <Section title="8. Limitation of Liability">
                        <p>
                            NoorI is provided "as is." To the maximum extent permitted by law, we disclaim all warranties and limit our liability for damages arising from use of the Service to the amount you paid us in the 12 months preceding the claim. We are not liable for filtering failures, content accessed on unprotected devices, or third-party services (including Cloudflare).
                        </p>
                    </Section>

                    <Section title="9. Termination">
                        <p>
                            We may suspend or terminate your account for violation of these Terms, non-payment, or at our discretion with reasonable notice. You may delete your account at any time. Upon termination, your data is deleted within 30 days per our Privacy Policy.
                        </p>
                    </Section>

                    <Section title="10. Governing Law">
                        <p>
                            These Terms are governed by the laws of India. Disputes will be resolved in the courts of New Delhi, India, unless otherwise required by applicable consumer protection law in your jurisdiction.
                        </p>
                    </Section>

                    <Section title="11. Changes to Terms">
                        <p>
                            We may update these Terms. We will notify you by email or in-app notice at least 14 days before material changes take effect. Continued use of the Service after the effective date constitutes acceptance.
                        </p>
                    </Section>

                    <Section title="12. Contact">
                        <p>
                            Questions about these Terms? Email us at{' '}
                            <a href={`mailto:${CONTACT_EMAIL}`} className="text-amber-500 hover:text-amber-400">
                                {CONTACT_EMAIL}
                            </a>
                        </p>
                    </Section>

                </div>

                <div className="pt-8 border-t border-border flex items-center justify-between text-xs text-foreground-subtle">
                    <span>© {new Date().getFullYear()} NoorI. All rights reserved.</span>
                    <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
                </div>
            </div>
        </div>
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <div className="space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_li]:text-foreground-muted">
                {children}
            </div>
        </div>
    )
}