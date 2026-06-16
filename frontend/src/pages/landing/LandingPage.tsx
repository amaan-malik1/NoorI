import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import { gsap } from 'gsap'
import {
  Shield, Zap, Globe, Lock, Smartphone, Monitor,
  CheckCircle2, ArrowRight, Star, ChevronRight,
  Eye, Users, BarChart2
} from 'lucide-react';
import Logo from '@/components/ui/Logo';

// Animated underline SVG 

function UnderlineHighlight({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      {children}
      <svg
        className="absolute -bottom-1 left-0 w-full"
        viewBox="0 0 300 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M2 8 C50 3, 150 10, 298 6"
          stroke="#F5A623"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.8, ease: 'easeOut' }}
        />
      </svg>
    </span>
  )
}

// Aceternity-style grid background 

function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Grid */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(rgba(245,166,35,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(245,166,35,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
      {/* Radial fade */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 0%, transparent 0%, #0E0F11 70%)',
        }}
      />
      {/* Amber glow center */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(ellipse, #F5A623 0%, transparent 70%)' }}
      />
    </div>
  )
}

//  Floating device mockup 

function DeviceMockup() {
  return (
    <div className="relative w-72 h-72 mx-auto">
      {/* Central shield */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="w-32 h-32 bg-amber-500/10 border border-amber-500/30 rounded-3xl flex items-center justify-center shadow-glow-amber">
          <Shield size={56} className="text-amber-500" />
        </div>
      </motion.div>

      {/* Orbiting device chips */}
      {[
        { icon: <Smartphone size={14} />, label: 'iPhone', angle: 0, delay: 0 },
        { icon: <Monitor size={14} />, label: 'Mac', angle: 90, delay: 0.3 },
        { icon: <Smartphone size={14} />, label: 'Android', angle: 180, delay: 0.6 },
        { icon: <Monitor size={14} />, label: 'Windows', angle: 270, delay: 0.9 },
      ].map(({ icon, label, angle, delay }) => {
        const rad = (angle * Math.PI) / 180
        const r = 108
        const x = Math.cos(rad) * r
        const y = Math.sin(rad) * r

        return (
          <motion.div
            key={label}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 + delay, duration: 0.4, type: 'spring' }}
            className="absolute flex items-center gap-1.5 bg-background-surface border border-border rounded-full px-3 py-1.5 text-xs font-medium text-foreground-muted shadow-elevated"
            style={{
              left: `calc(50% + ${x}px - 44px)`,
              top: `calc(50% + ${y}px - 14px)`,
            }}
          >
            <span className="text-amber-500">{icon}</span>
            {label}
          </motion.div>
        )
      })}

      {/* Connection lines */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 288 288">
        {[0, 90, 180, 270].map(angle => {
          const rad = (angle * Math.PI) / 180
          const r = 108
          const x = 144 + Math.cos(rad) * r
          const y = 144 + Math.sin(rad) * r
          return (
            <motion.line
              key={angle}
              x1="144" y1="144"
              x2={x} y2={y}
              stroke="rgba(245,166,35,0.2)"
              strokeWidth="1"
              strokeDasharray="4 4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            />
          )
        })}
      </svg>
    </div>
  )
}

// Feature card 

function FeatureCard({
  icon,
  title,
  description,
  delay = 0,
}: {
  icon: React.ReactNode
  title: string
  description: string
  delay?: number
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="p-6 bg-background-surface border border-border rounded-xl space-y-4 hover:border-border-subtle transition-colors group"
    >
      <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-center text-amber-500 group-hover:bg-amber-500/15 transition-colors">
        {icon}
      </div>
      <div className="space-y-1.5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-foreground-muted leading-relaxed">{description}</p>
      </div>
    </motion.div>
  )
}

// Comparison row 

function ComparisonRow({
  feature,
  them,
  us,
}: {
  feature: string
  them: boolean | string
  us: boolean | string
}) {
  const Cell = ({ val }: { val: boolean | string }) => {
    if (typeof val === 'string') {
      return <span className="text-xs text-foreground-muted">{val}</span>
    }
    return val
      ? <CheckCircle2 size={16} className="text-success mx-auto" />
      : <span className="text-foreground-subtle text-xs mx-auto block text-center">—</span>
  }

  return (
    <div className="grid grid-cols-3 gap-4 py-3 border-b border-border last:border-0 items-center">
      <div className="text-sm text-foreground-muted">{feature}</div>
      <div className="text-center"><Cell val={them} /></div>
      <div className="text-center"><Cell val={us} /></div>
    </div>
  )
}

// Pricing card 

function PricingCard({
  plan,
  price,
  priceINR,
  description,
  features,
  cta,
  highlighted = false,
}: {
  plan: string
  price: string
  priceINR: string
  description: string
  features: string[]
  cta: string
  highlighted?: boolean
}) {
  return (
    <div className={`relative p-6 rounded-xl border space-y-6 ${highlighted
      ? 'bg-amber-500/6 border-amber-500/30 shadow-glow-amber-sm'
      : 'bg-background-surface border-border'
      }`}>
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-amber-500 text-background text-xs font-semibold px-3 py-1 rounded-full">
            Most popular
          </span>
        </div>
      )}

      <div className="space-y-1">
        <div className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
          {plan}
        </div>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-sora font-bold text-3xl text-foreground">{price}</span>
          <span className="text-xs text-foreground-subtle">/ month</span>
          <span className="text-xs text-foreground-subtle">· {priceINR} INR</span>
        </div>
        <p className="text-sm text-foreground-muted">{description}</p>
      </div>

      <ul className="space-y-2.5">
        {features.map(f => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-foreground-muted">
            <CheckCircle2 size={14} className="text-success flex-shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>

      <Link to="/register">
        <button className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all ${highlighted
          ? 'bg-amber-500 hover:bg-amber-400 text-background'
          : 'bg-background-elevated hover:bg-background-overlay border border-border text-foreground'
          }`}>
          {cta}
        </button>
      </Link>
    </div>
  )
}

// Main landing page 
export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const headlineRef = useRef<HTMLHeadingElement>(null)
  const subRef = useRef<HTMLParagraphElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)

  // GSAP hero entrance sequence
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      tl.fromTo(
        headlineRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.9 }
      )
        .fromTo(
          subRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.7 },
          '-=0.5'
        )
        .fromTo(
          ctaRef.current,
          { opacity: 0, y: 16, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.6 },
          '-=0.4'
        )
    }, heroRef)

    return () => ctx.revert()
  }, [])

  const featuresRef = useRef(null)
  const featuresInView = useInView(featuresRef, { once: true });

  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background text-foreground font-dm">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 backdrop-blur-md bg-background/80">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <Logo />

          <div className="hidden md:flex items-center gap-7 text-sm text-foreground-muted">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#compare" className="hover:text-foreground transition-colors">Compare</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-foreground-muted hover:text-foreground transition-colors hidden sm:block">
              Sign in
            </Link>
            <Link to="/register">
              <button className="bg-amber-500 hover:bg-amber-400 text-background text-sm font-medium px-4 py-2 rounded-lg transition-all active:scale-[0.98]">
                Get started free
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center pt-20">
        <GridBackground />

        <div className="relative z-10 max-w-5xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center py-20">
          {/* Left — text */}
          <div className="space-y-7">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5"
            >
              <Zap size={12} className="text-amber-500" />
              <span className="text-xs font-medium text-amber-500">Powered by Cloudflare Zero Trust</span>
            </motion.div>

            {/* Headline */}
            <h1
              ref={headlineRef}
              className="font-sora font-bold text-5xl sm:text-6xl text-foreground leading-tight opacity-0"
            >
              Content filtering{' '}
              <UnderlineHighlight>without</UnderlineHighlight>
              {' '}the complexity.
            </h1>

            {/* Sub */}
            <p
              ref={subRef}
              className="text-lg text-foreground-muted leading-relaxed max-w-md opacity-0"
            >
              Set up DNS-level content filtering across all your devices in under 5 minutes.
              No technical knowledge needed.
            </p>

            {/* CTA */}
            <div ref={ctaRef} className="flex flex-wrap items-center gap-4 opacity-0">
              <Link to="/register">
                <button className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-background font-semibold px-7 py-3.5 rounded-xl transition-all active:scale-[0.98] shadow-glow-amber-sm text-base">
                  Start for free
                  <ArrowRight size={17} />
                </button>
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors"
              >
                See how it works <ChevronRight size={14} />
              </a>
            </div>

            {/* Social proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="flex items-center gap-4 pt-2"
            >
              <div className="flex -space-x-2">
                {['A', 'R', 'M', 'S'].map((l, i) => (
                  <div
                    key={l}
                    className="w-7 h-7 rounded-full bg-amber-500/20 border-2 border-background flex items-center justify-center text-xs font-semibold text-amber-500"
                  >
                    {l}
                  </div>
                ))}
              </div>
              <div className="text-xs text-foreground-muted">
                <span className="text-foreground font-medium">500+</span> families protected
              </div>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={12} className="text-amber-500 fill-amber-500" />
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right — device mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="hidden lg:block"
          >
            <DeviceMockup />
          </motion.div>
        </div>
      </section>

      <section id="features" ref={featuresRef} className="py-24 px-6">
        <div className="max-w-6xl mx-auto space-y-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={featuresInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center space-y-3"
          >
            <div className="inline-flex items-center gap-2 bg-background-elevated border border-border rounded-full px-4 py-1.5 text-xs text-foreground-muted">
              <Shield size={11} className="text-amber-500" />
              Everything you need
            </div>
            <h2 className="font-sora font-bold text-4xl text-foreground">
              Built for non-technical people
            </h2>
            <p className="text-foreground-muted max-w-xl mx-auto text-base leading-relaxed">
              No Cloudflare dashboard required. No raw API keys to manage. No confusing settings.
              Just protection that works.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: <Zap size={18} />,
                title: '5-minute setup',
                description: 'Connect Cloudflare, choose what to block, add your device. Done. No manuals required.',
                delay: 0,
              },
              {
                icon: <Globe size={18} />,
                title: 'All devices covered',
                description: 'iPhone, Mac, Android, Windows — one dashboard manages filtering across every device you own.',
                delay: 0.05,
              },
              {
                icon: <Lock size={18} />,
                title: 'Tamper-proof locking',
                description: 'Lock your settings with a PIN so you can\'t undo your own restrictions on impulse.',
                delay: 0.1,
              },
              {
                icon: <BarChart2 size={18} />,
                title: 'DNS traffic logs',
                description: 'See every domain your devices query — blocked or allowed — with searchable history.',
                delay: 0.15,
              },
              {
                icon: <Eye size={18} />,
                title: 'Smart presets',
                description: 'Basic, Balanced, or Maximum protection — one tap applies the right Cloudflare rules automatically.',
                delay: 0.2,
              },
              {
                icon: <Users size={18} />,
                title: 'Family-friendly',
                description: 'Parental controls, child-safe browsing, and per-device restrictions for the whole household.',
                delay: 0.25,
              },
            ].map(f => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works  */}
      <section className="py-24 px-6 bg-background-surface border-y border-border">
        <div className="max-w-4xl mx-auto space-y-14">
          <div className="text-center space-y-3">
            <h2 className="font-sora font-bold text-4xl text-foreground">How it works</h2>
            <p className="text-foreground-muted text-base">Three steps to full protection</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Connect Cloudflare',
                description: 'Link your free Cloudflare account. We create a secure, limited-permission token — your global key is never stored.',
                icon: <Globe size={20} />,
              },
              {
                step: '02',
                title: 'Choose what to block',
                description: 'Pick Basic, Balanced, or Maximum. Or fine-tune categories yourself. Your rules sync to Cloudflare instantly.',
                icon: <Shield size={20} />,
              },
              {
                step: '03',
                title: 'Set up your devices',
                description: 'Follow the step-by-step guide for your device type. Most setups take under 3 minutes.',
                icon: <Smartphone size={20} />,
              },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="relative space-y-4"
              >
                <div className="flex items-center gap-3">
                  <span className="font-sora font-bold text-4xl text-amber-500/30">{s.step}</span>
                  <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-center text-amber-500">
                    {s.icon}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-semibold text-foreground">{s.title}</h3>
                  <p className="text-sm text-foreground-muted leading-relaxed">{s.description}</p>
                </div>
                {i < 2 && (
                  <div className="hidden sm:block absolute top-5 -right-4 text-foreground-subtle">
                    <ArrowRight size={16} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/*  Comparison  */}
      <section id="compare" className="py-24 px-6">
        <div className="max-w-3xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <h2 className="font-sora font-bold text-4xl text-foreground">Noori vs Others</h2>
            <p className="text-foreground-muted text-base">
              Same Cloudflare power — much simpler experience
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-background-surface border border-border rounded-xl overflow-hidden"
          >
            {/* Header */}
            <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-border bg-background-elevated">
              <div className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">Feature</div>
              <div className="text-center text-xs font-semibold text-foreground-muted uppercase tracking-wider">Others</div>
              <div className="text-center text-xs font-semibold text-amber-500 uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Shield size={11} /> Noori
              </div>
            </div>

            <div className="px-6 divide-y divide-border">
              <ComparisonRow feature="Simple setup (non-technical)" them={false} us={true} />
              <ComparisonRow feature="Smart protection presets" them={false} us={true} />
              <ComparisonRow feature="Protection score dashboard" them={false} us={true} />
              <ComparisonRow feature="UPI / Razorpay payments" them={false} us={true} />
              <ComparisonRow feature="Cloudflare Gateway integration" them={true} us={true} />
              <ComparisonRow feature="iOS Config Generator" them={true} us={true} />
              <ComparisonRow feature="Activity logs" them={true} us={true} />
              <ComparisonRow feature="Profile PIN locking" them={true} us={true} />
              <ComparisonRow feature="Android managed mode" them="Guide only" us="Guide + DNS setup" />
              <ComparisonRow feature="Pricing (India)" them="$9 USD only" us="₹499 via UPI" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Pricing ─ */}
      <section id="pricing" className="py-24 px-6 bg-background-surface border-t border-border">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="font-sora font-bold text-4xl text-foreground">Simple pricing</h2>
            <p className="text-foreground-muted text-base">Start free. Upgrade when you need more.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <PricingCard
              plan="Free"
              price="$0"
              priceINR="₹0"
              description="Everything you need to get started."
              features={[
                'Content policy with presets',
                'All 4 device types supported',
                'DNS filtering via Cloudflare',
                '7-day activity history',
                '1 content policy',
                'Profile PIN locking',
              ]}
              cta="Get started free"
            />
            <PricingCard
              plan="Pro"
              price="$9"
              priceINR="₹499"
              description="For power users and families who need more."
              features={[
                'Everything in Free',
                '90-day activity history',
                'iOS Config Generator (.mobileconfig)',
                'Multiple content policies',
                'Priority log sync (5 min)',
                'Email support',
              ]}
              cta="Upgrade to Pro"
              highlighted
            />
          </div>

          <p className="text-center text-xs text-foreground-subtle">
            Pay with Stripe (international) or Razorpay (India — UPI, cards, netbanking). Cancel anytime.
          </p>
        </div>
      </section>

      {/* ── Final CTA  */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-sora font-bold text-5xl text-foreground leading-tight"
            >
              Start protecting your
              <br />
              <span className="text-gradient-amber">devices today.</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-foreground-muted text-lg"
            >
              Free to start. No credit card required. Setup in 5 minutes.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Link to="/register">
              <button className="inline-flex items-center gap-2.5 bg-amber-500 hover:bg-amber-400 text-background font-semibold px-8 py-4 rounded-xl transition-all active:scale-[0.98] shadow-glow-amber text-base">
                Create free account
                <ArrowRight size={18} />
              </button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo />
          </div>
          <div className="flex items-center gap-6 text-xs text-foreground-subtle">
            <a href="#" className="hover:text-foreground-muted transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground-muted transition-colors">Terms of Service</a>
            <Link to="/login" className="hover:text-foreground-muted transition-colors">Sign in</Link>
          </div>
          <div className="text-xs text-foreground-subtle">
            © {year}  Noori. Built with Cloudflare Zero Trust.
          </div>
        </div>
      </footer>
    </div>
  )
}
