import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const LAST_UPDATED = 'June 22, 2026'
const CONTACT_EMAIL = 'team@solstore.pro'

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

export default function PrivacyPage() {
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
                    <h1 className="font-sora font-bold text-4xl text-foreground">Privacy Policy</h1>
                    <p className="text-sm text-foreground-muted mt-2">Last updated: {LAST_UPDATED}</p>
                </div>

                <div className="space-y-8 text-sm text-foreground-muted leading-relaxed">

                    <Section title="1. What We Collect">
                        <p>We collect only what's necessary to provide the Service:</p>
                        <ul>
                            <li><strong className="text-foreground">Account data</strong> — email address, hashed password, account preferences</li>
                            <li><strong className="text-foreground">Cloudflare token</strong> — a limited-permission scoped API token, AES-256-GCM encrypted at rest. Your Global API Key is never stored.</li>
                            <li><strong className="text-foreground">DNS activity logs</strong> — domain names, timestamps, and whether requests were allowed or blocked. Synced from your Cloudflare Gateway account. Retained per your plan (3/30/90 days).</li>
                            <li><strong className="text-foreground">Device records</strong> — device names and types you register in NoorI</li>
                            <li><strong className="text-foreground">Billing data</strong> — subscription status, plan tier, and payment gateway customer IDs (Stripe/Razorpay). We never see or store full card numbers.</li>
                            <li><strong className="text-foreground">Usage data</strong> — server logs (IP address, request timestamps) for security and debugging, retained for 30 days</li>
                        </ul>
                    </Section>

                    <Section title="2. What We Don't Collect">
                        <ul>
                            <li>Your Cloudflare Global API Key (used once during setup, then discarded)</li>
                            <li>Full URLs, page content, or search queries — only domain names</li>
                            <li>Device location or physical tracking data</li>
                            <li>Data from devices not connected to your Cloudflare Gateway</li>
                            <li>Any data from children under 13 — NoorI is a tool for parents/guardians, not a child-facing service</li>
                        </ul>
                    </Section>

                    <Section title="3. How We Use Your Data">
                        <ul>
                            <li>Provide, operate, and improve the Service</li>
                            <li>Display your DNS activity logs in your dashboard</li>
                            <li>Send transactional emails (account verification, password reset, billing receipts)</li>
                            <li>Enforce plan limits and feature gates</li>
                            <li>Detect and prevent abuse, fraud, or security incidents</li>
                        </ul>
                        <p>We do not use your data for advertising and do not sell your data to third parties.</p>
                    </Section>

                    <Section title="4. Data Sharing">
                        <p>We share data only with the following service providers, and only as needed to operate NoorI:</p>
                        <ul>
                            <li><strong className="text-foreground">Cloudflare</strong> — your filtering rules and activity logs live in your own Cloudflare account</li>
                            <li><strong className="text-foreground">Neon (PostgreSQL)</strong> — database hosting, encrypted at rest</li>
                            <li><strong className="text-foreground">Upstash (Redis)</strong> — session and cache storage</li>
                            <li><strong className="text-foreground">Stripe / Razorpay</strong> — payment processing; they are independent data controllers for payment data</li>
                            <li><strong className="text-foreground">Vercel / Railway</strong> — frontend and backend hosting infrastructure</li>
                        </ul>
                        <p>We may disclose data if required by law or to protect the rights and safety of our users.</p>
                    </Section>

                    <Section title="5. Data Retention">
                        <p>We retain your data as follows:</p>
                        <ul>
                            <li><strong className="text-foreground">DNS activity logs</strong> — 3 days (Free), 30 days (Pro), 90 days (Family). Automatically deleted after the retention window.</li>
                            <li><strong className="text-foreground">Account data</strong> — retained while your account is active. Deleted within 30 days of account deletion.</li>
                            <li><strong className="text-foreground">Server logs</strong> — 30 days, then automatically purged</li>
                            <li><strong className="text-foreground">Billing records</strong> — retained for 7 years as required by tax law</li>
                        </ul>
                    </Section>

                    <Section title="6. Security">
                        <p>
                            We protect your data using industry-standard practices:
                        </p>
                        <ul>
                            <li>Cloudflare API tokens encrypted at rest using AES-256-GCM</li>
                            <li>Passwords hashed using bcrypt with appropriate cost factor</li>
                            <li>All data in transit encrypted via TLS 1.2+</li>
                            <li>Database access restricted to application servers only</li>
                            <li>Refresh tokens stored as HttpOnly cookies, not accessible to JavaScript</li>
                        </ul>
                        <p>No system is completely secure. If you discover a security issue, please email {CONTACT_EMAIL} before disclosing publicly.</p>
                    </Section>

                    <Section title="7. Your Rights">
                        <p>You have the right to:</p>
                        <ul>
                            <li><strong className="text-foreground">Access</strong> — request a copy of the data we hold about you</li>
                            <li><strong className="text-foreground">Correction</strong> — update inaccurate data via your account settings or by contacting us</li>
                            <li><strong className="text-foreground">Deletion</strong> — delete your account from Settings → Profile. All personal data is deleted within 30 days.</li>
                            <li><strong className="text-foreground">Portability</strong> — export your DNS activity logs as CSV from the Activity tab</li>
                            <li><strong className="text-foreground">Objection</strong> — contact us to object to specific processing activities</li>
                        </ul>
                        <p>To exercise any right, email us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-amber-500 hover:text-amber-400">{CONTACT_EMAIL}</a>. We respond within 30 days.</p>
                    </Section>

                    <Section title="8. Cookies and Tracking">
                        <p>
                            NoorI uses a single HttpOnly session cookie for authentication. We do not use advertising cookies, third-party tracking pixels, or analytics services that share data with third parties.
                        </p>
                        <p>
                            We use anonymous, self-hosted analytics (if any) to understand feature usage. No personally identifiable information is sent to analytics services.
                        </p>
                    </Section>

                    <Section title="9. Children's Privacy">
                        <p>
                            NoorI is designed for parents and guardians to manage children's devices. We do not knowingly collect personal data from children under 13. If you believe a child has created an account, contact us at {CONTACT_EMAIL} and we will delete the account promptly.
                        </p>
                    </Section>

                    <Section title="10. International Transfers">
                        <p>
                            NoorI is operated from India. Your data may be processed by our service providers in the United States and European Union. Where required, we rely on Standard Contractual Clauses or equivalent mechanisms for international transfers.
                        </p>
                    </Section>

                    <Section title="11. Changes to This Policy">
                        <p>
                            We may update this Privacy Policy. We will notify you by email or in-app notice at least 14 days before material changes take effect. The date at the top of this page reflects the most recent update.
                        </p>
                    </Section>

                    <Section title="12. Contact">
                        <p>
                            Privacy questions or requests:{' '}
                            <a href={`mailto:${CONTACT_EMAIL}`} className="text-amber-500 hover:text-amber-400">
                                {CONTACT_EMAIL}
                            </a>
                        </p>
                    </Section>

                </div>

                <div className="pt-8 border-t border-border flex items-center justify-between text-xs text-foreground-subtle">
                    <span>© {new Date().getFullYear()} NoorI. All rights reserved.</span>
                    <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
                </div>
            </div>
        </div>
    )
}