import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ExternalLink, ChevronDown, ChevronUp, ChevronRight,
    Globe, Shield, User, CheckCircle2, ArrowRight, Sparkles
} from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

function BrowserFrame({
    url,
    children,
}: {
    url: string
    children: React.ReactNode
}) {
    return (
        <div className="rounded-lg border border-border bg-background-elevated overflow-hidden">
            {/* Title bar */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background-overlay">
                <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-danger/40" />
                    <span className="w-2.5 h-2.5 rounded-full bg-warning/40" />
                    <span className="w-2.5 h-2.5 rounded-full bg-success/40" />
                </div>
                <div className="flex-1 flex items-center gap-1.5 bg-background-elevated rounded-md px-2.5 py-1 ml-2">
                    <Globe size={10} className="text-foreground-subtle flex-shrink-0" />
                    <span className="text-[10px] text-foreground-subtle font-mono truncate">{url}</span>
                </div>
            </div>
            {/* Content */}
            <div className="p-4">{children}</div>
        </div>
    )
}

// ── Illustration 1: Zero Trust dashboard landing ──────────

function IllustrationDashboard() {
    return (
        <BrowserFrame url="one.dash.cloudflare.com">
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-amber-500/15 flex items-center justify-center">
                        <Shield size={12} className="text-amber-500" />
                    </div>
                    <span className="text-xs font-semibold text-foreground">Cloudflare Zero Trust</span>
                </div>

                {/* Sidebar + main mockup */}
                <div className="flex gap-2">
                    <div className="w-16 space-y-1.5 flex-shrink-0">
                        {['Gateway', 'Access', 'Settings'].map((item, i) => (
                            <div
                                key={item}
                                className={`h-5 rounded-sm flex items-center px-1.5 text-[9px] ${i === 2
                                        ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                                        : 'bg-background-overlay text-foreground-subtle'
                                    }`}
                            >
                                {item}
                            </div>
                        ))}
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className="h-4 w-24 bg-background-overlay rounded-sm" />
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between p-2 bg-background-overlay rounded-md border border-amber-500/30">
                                <span className="text-[10px] text-foreground">Team name</span>
                                <span className="text-[10px] font-mono text-foreground-subtle">not set</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </BrowserFrame>
    )
}

// ── Illustration 2: Team name prompt modal ────────────────

function IllustrationTeamNamePrompt() {
    return (
        <BrowserFrame url="one.dash.cloudflare.com/setup">
            <div className="space-y-3">
                <div className="text-center space-y-1">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center mx-auto">
                        <Sparkles size={14} className="text-amber-500" />
                    </div>
                    <div className="text-xs font-semibold text-foreground">Choose your team name</div>
                    <div className="text-[10px] text-foreground-muted">This becomes your Zero Trust subdomain</div>
                </div>

                <div className="space-y-1.5">
                    <div className="h-7 bg-background-overlay rounded-md border border-amber-500/40 flex items-center px-2.5 gap-1">
                        <span className="text-[10px] text-foreground font-mono">your-name</span>
                        <span className="w-px h-3 bg-amber-500/50 animate-pulse" />
                    </div>
                    <div className="text-[9px] text-foreground-subtle font-mono px-0.5">
                        → your-name<span className="text-amber-500">.cloudflareaccess.com</span>
                    </div>
                </div>

                <div className="h-6 bg-amber-500 rounded-md flex items-center justify-center">
                    <span className="text-[10px] font-semibold text-background">Continue</span>
                </div>
            </div>
        </BrowserFrame>
    )
}

// ── Illustration 3: Confirmed team name in settings ───────

function IllustrationConfirmed() {
    return (
        <BrowserFrame url="one.dash.cloudflare.com/settings/general">
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-amber-500/15 flex items-center justify-center">
                        <Shield size={12} className="text-amber-500" />
                    </div>
                    <span className="text-xs font-semibold text-foreground">Settings → General</span>
                </div>

                <div className="p-2.5 bg-background-overlay rounded-md border border-success/30 space-y-1">
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={11} className="text-success" />
                        <span className="text-[10px] text-foreground-muted">Team domain</span>
                    </div>
                    <div className="text-[11px] font-mono text-success pl-4">
                        your-name<span className="text-foreground-subtle">.cloudflareaccess.com</span>
                    </div>
                </div>

                <div className="text-[9px] text-foreground-subtle leading-relaxed pl-0.5">
                    ✓ This is the name NoorI will show you in device setup
                </div>
            </div>
        </BrowserFrame>
    )
}

// ── Guide step data ────────────────────────────────────────

const GUIDE_STEPS = [
    {
        label: 'Open Zero Trust dashboard',
        description: 'Visit one.dash.cloudflare.com and sign in with the same Cloudflare account you connected to NoorI. If this is your first visit, Cloudflare will show a short setup screen.',
        illustration: <IllustrationDashboard />,
    },
    {
        label: 'Choose a team name',
        description: 'Pick any name — your username, business name, or anything memorable. This becomes part of a subdomain (yourname.cloudflareaccess.com) and can\'t be changed easily later, so pick something you\'re happy with.',
        illustration: <IllustrationTeamNamePrompt />,
    },
    {
        label: 'Done — come back to NoorI',
        description: 'That\'s it. Cloudflare saves your team name automatically. Return to NoorI and click "Refresh connection" below — your team name will appear automatically in every device setup guide from now on.',
        illustration: <IllustrationConfirmed />,
    },
]

// ── Main guide component ──────────────────────────────────

interface ZeroTrustSetupGuideProps {
    /** Called when user clicks "Refresh connection" on the final step */
    onRefresh?: () => void
    refreshing?: boolean
    /** If true, renders collapsed by default with a summary header */
    collapsible?: boolean
    defaultOpen?: boolean
}

export default function ZeroTrustSetupGuide({
    onRefresh,
    refreshing = false,
    collapsible = false,
    defaultOpen = true,
}: ZeroTrustSetupGuideProps) {
    const [open, setOpen] = useState(defaultOpen)
    const [activeStep, setActiveStep] = useState(0)

    const content = (
        <div className="space-y-5">
            {/* Why this step exists */}
            <div className="flex gap-3 p-3.5 bg-info/6 border border-info/15 rounded-lg">
                <Shield size={15} className="text-info flex-shrink-0 mt-0.5" />
                <p className="text-xs text-foreground-muted leading-relaxed">
                    Cloudflare requires every account to have a <strong className="text-foreground">Zero Trust team name</strong> before
                    apps like Cloudflare One can connect. This is a <strong className="text-foreground">one-time, 30-second</strong> setup
                    on Cloudflare's site — NoorI can't do this part for you, but it's quick.
                </p>
            </div>

            {/* Mini step tabs */}
            <div className="flex gap-1.5">
                {GUIDE_STEPS.map((s, i) => (
                    <button
                        key={s.label}
                        onClick={() => setActiveStep(i)}
                        className={`flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${activeStep === i
                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/25'
                                : 'bg-background-elevated text-foreground-muted border border-border hover:border-border-subtle'
                            }`}
                    >
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] flex-shrink-0 ${activeStep === i ? 'bg-amber-500 text-background' : 'bg-background-overlay text-foreground-subtle'
                            }`}>
                            {i + 1}
                        </span>
                        <span className="hidden sm:inline truncate">{s.label}</span>
                    </button>
                ))}
            </div>

            {/* Active step content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.25 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center"
                >
                    <div>{GUIDE_STEPS[activeStep].illustration}</div>
                    <div className="space-y-3">
                        <p className="text-sm text-foreground-muted leading-relaxed">
                            {GUIDE_STEPS[activeStep].description}
                        </p>

                        {activeStep === 0 && (
                            <a
                                href="https://one.dash.cloudflare.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm text-amber-500 hover:text-amber-400 transition-colors"
                            >
                                Open Zero Trust dashboard <ExternalLink size={13} />
                            </a>
                        )}

                        {activeStep < GUIDE_STEPS.length - 1 ? (
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setActiveStep(activeStep + 1)}
                                rightIcon={<ChevronRight size={13} />}
                            >
                                Next
                            </Button>
                        ) : onRefresh ? (
                            <Button
                                size="sm"
                                onClick={onRefresh}
                                loading={refreshing}
                                leftIcon={<CheckCircle2 size={13} />}
                            >
                                I've done this — refresh connection
                            </Button>
                        ) : null}
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    )

    if (!collapsible) return content

    return (
        <div className="border border-border rounded-lg overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between p-4 hover:bg-background-elevated/50 transition-colors text-left"
            >
                <div className="flex items-center gap-2.5">
                    <User size={14} className="text-warning" />
                    <span className="text-sm font-medium text-foreground">
                        Set up your Zero Trust team name
                    </span>
                    <Badge variant="warning" size="sm">One-time setup</Badge>
                </div>
                {open ? <ChevronUp size={15} className="text-foreground-subtle" /> : <ChevronDown size={15} className="text-foreground-subtle" />}
            </button>

            {open && (
                <div className="px-4 pb-4 border-t border-border pt-4">
                    {content}
                </div>
            )}
        </div>
    )
}