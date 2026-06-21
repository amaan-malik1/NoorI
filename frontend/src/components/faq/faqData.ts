// ─── FAQ Content ──────────────────────────────────────────
// Single source of truth for all FAQ entries. Categorized so
// the component can filter by category or render everything.
// Keep answers short — this is a quick-reference panel, not
// documentation. Link out to docs for anything requiring
// step-by-step instructions.

export type FaqCategory = 'general' | 'billing' | 'devices' | 'privacy' | 'troubleshooting'

export interface FaqEntry {
  id: string
  category: FaqCategory
  question: string
  answer: string
}

export const FAQ_CATEGORIES: { id: FaqCategory; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'billing', label: 'Billing & Plans' },
  { id: 'devices', label: 'Devices & Setup' },
  { id: 'privacy', label: 'Privacy & Security' },
  { id: 'troubleshooting', label: 'Troubleshooting' },
]

export const FAQ_ENTRIES: FaqEntry[] = [
  // ── General ──────────────────────────────────────────
  {
    id: 'what-is-noori',
    category: 'general',
    question: 'What does NoorI actually do?',
    answer:
      'NoorI gives you content filtering and screen-time control across your devices using Cloudflare\'s Zero Trust network. You set rules once in NoorI — block categories like adult content or social media, enforce safe search, schedule when rules apply — and we push them to Cloudflare, which then filters traffic on every connected device.',
  },
  {
    id: 'how-is-this-different',
    category: 'general',
    question: 'How is this different from a regular parental control app?',
    answer:
      'Most parental control apps run as a single app on the device that can be uninstalled or killed. NoorI filters at the network level through Cloudflare\'s DNS and Gateway — the same infrastructure used by enterprises for corporate security. It\'s harder to bypass because it\'s not just an app you can close.',
  },
  {
    id: 'do-i-need-cloudflare-account',
    category: 'general',
    question: 'Do I need my own Cloudflare account?',
    answer:
      'Yes. NoorI connects to your own free Cloudflare account and manages it on your behalf — we never see or store your Cloudflare login. This means your filtering rules live in infrastructure you control, and you can always go to Cloudflare directly if you ever need to.',
  },
  {
    id: 'who-is-this-for',
    category: 'general',
    question: 'Is NoorI just for parents, or can I use it for myself?',
    answer:
      'Both. Many users set up NoorI for self-accountability — blocking distracting sites during work hours or enforcing a digital curfew on themselves. Others use it for their kids\' devices. The same tools work for either case.',
  },

  // ── Billing & Plans ──────────────────────────────────
  {
    id: 'whats-included-free',
    category: 'billing',
    question: "What's included in the Free plan?",
    answer:
      'Free gives you 1 device, 1 content policy locked to the Basic preset (blocks adult content, VPNs, malware, and phishing), 3 days of activity history, and CSV export. It\'s enough to try NoorI properly before deciding to upgrade.',
  },
  {
    id: 'pro-vs-family',
    category: 'billing',
    question: "What's the difference between Pro and Family?",
    answer:
      'Pro covers up to 10 devices and 3 content policies — ideal for one person or a couple managing their own devices. Family covers up to 20 devices with unlimited policies, plus scheduled auto-lock and bypass email alerts — built for households managing multiple children\'s devices independently.',
  },
  {
    id: 'yearly-discount',
    category: 'billing',
    question: 'How much do I save with yearly billing?',
    answer:
      'Yearly billing saves 20% compared to paying monthly, on both Pro and Family. You can switch between monthly and yearly anytime from the Billing tab — toggle it and pick whichever works for you.',
  },
  {
    id: 'payment-methods',
    category: 'billing',
    question: 'What payment methods do you accept?',
    answer:
      'We support card payments (Visa, Mastercard, Amex) via Stripe, and UPI, cards, and netbanking via Razorpay for India. Both show the same USD price — Razorpay handles the currency conversion for the actual charge.',
  },
  {
    id: 'cancel-anytime',
    category: 'billing',
    question: 'Can I cancel anytime?',
    answer:
      'Yes, from Settings → Billing → Cancel subscription. You\'ll keep full access to your plan\'s features until the end of your current billing period — no early cutoff, and no cancellation fees.',
  },
  {
    id: 'what-happens-downgrade',
    category: 'billing',
    question: 'What happens to my devices and policies if I downgrade?',
    answer:
      'Your existing devices and policies stay in place, but new limits apply going forward — for example, if you have 8 devices on Pro and downgrade to Free, you won\'t be able to add new devices until you\'re back under the Free plan\'s 1-device limit. We never auto-delete your data on downgrade.',
  },

  // ── Devices & Setup ───────────────────────────────────
  {
    id: 'which-devices-supported',
    category: 'devices',
    question: 'Which devices does NoorI support?',
    answer:
      'iOS (iPhone/iPad), macOS, Android, and Windows. Each platform uses Cloudflare\'s WARP/Cloudflare One app to route traffic through your filtering rules. iOS and macOS also support deeper restriction profiles (.mobileconfig) on Pro and Family plans.',
  },
  {
    id: 'team-name-confusion',
    category: 'devices',
    question: 'What\'s the "Organization Name" the Cloudflare app asks for?',
    answer:
      'That\'s your Cloudflare Zero Trust team name — a one-time setup step on Cloudflare\'s side, not something NoorI controls. Once you\'ve connected your Cloudflare account in NoorI, your team name appears automatically in each device\'s setup guide with a copy button, so you don\'t need to go find it yourself.',
  },
  {
    id: 'how-many-devices',
    category: 'devices',
    question: 'How many devices can I add?',
    answer:
      '1 on Free, 10 on Pro, 20 on Family. This counts individual phones, laptops, and tablets — a router setup (when available) counts as a single device slot covering your whole network.',
  },
  {
    id: 'remove-device',
    category: 'devices',
    question: 'What happens if I remove a device?',
    answer:
      'Removing a device in NoorI stops syncing rules to it and frees up a device slot on your plan. The Cloudflare One app will still be installed on the physical device until the person manually uninstalls it or disconnects.',
  },

  // ── Privacy & Security ────────────────────────────────
  {
    id: 'does-noori-see-browsing',
    category: 'privacy',
    question: 'Does NoorI see what sites I visit?',
    answer:
      'NoorI syncs DNS-level activity logs from your Cloudflare Gateway so you can review them in the Activity tab — domain names and whether they were blocked or allowed, not full page content or search terms. This data is stored encrypted and only visible to your account.',
  },
  {
    id: 'cloudflare-credentials-stored',
    category: 'privacy',
    question: 'Do you store my Cloudflare password or API key?',
    answer:
      'No. We use your Cloudflare Global API Key once, during setup, to generate a limited-permission scoped token — then we discard the key entirely. Only the encrypted scoped token is stored, and it can only manage Gateway rules, not your whole Cloudflare account.',
  },
  {
    id: 'can-be-bypassed',
    category: 'privacy',
    question: 'Can someone bypass NoorI\'s filtering?',
    answer:
      'Network-level filtering is significantly harder to bypass than an app alone, but no filtering system is unbreakable — a technically determined user could disable the VPN profile or use another network. Family plan\'s bypass email alerts notify you when a blocked domain is accessed via a bypass attempt, so you\'ll know if it happens.',
  },

  // ── Troubleshooting ────────────────────────────────────
  {
    id: 'otp-not-arriving',
    category: 'troubleshooting',
    question: 'I\'m not receiving the Cloudflare login code',
    answer:
      'Check spam/promotions folders first — Cloudflare\'s OTP emails sometimes land there on first send. If you\'ve tried multiple times quickly, Cloudflare may have rate-limited the address temporarily; wait 30 minutes and try once more.',
  },
  {
    id: 'blocking-not-working',
    category: 'troubleshooting',
    question: 'My policy is saved but sites aren\'t actually being blocked',
    answer:
      'Visit cloudflare.com/cdn-cgi/trace on the affected device — check that both warp= and gateway= show "on". If either shows "off", open Cloudflare One, toggle the connection off and back on, and check that your Zero Trust org\'s WARP Client mode is set to "Gateway with WARP" rather than plain WARP.',
  },
  {
    id: 'app-still-accessible',
    category: 'troubleshooting',
    question: 'I blocked a domain but the app (not the website) still works',
    answer:
      'Some apps use hardcoded IP addresses or bypass standard DNS resolution, which can get around domain-based blocking even when Gateway filtering is active. This is a known limitation of DNS-level filtering — full app-level blocking would require a separate device management layer, which isn\'t part of NoorI today.',
  },
  {
    id: 'wrong-plan-showing',
    category: 'troubleshooting',
    question: 'I upgraded but my account still shows Free',
    answer:
      'This usually resolves within a minute as the payment webhook confirms in the background. If it\'s been longer, refresh the Billing tab — if it\'s still wrong, contact support with your payment confirmation ID and we\'ll fix it manually.',
  },
]

export function getFaqsByCategory(category: FaqCategory): FaqEntry[] {
  return FAQ_ENTRIES.filter(f => f.category === category)
}

export function searchFaqs(query: string): FaqEntry[] {
  const q = query.toLowerCase().trim()
  if (!q) return FAQ_ENTRIES
  return FAQ_ENTRIES.filter(
    f => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
  )
}