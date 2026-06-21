import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Search, HelpCircle } from 'lucide-react'
import { FAQ_ENTRIES, FAQ_CATEGORIES, type FaqCategory } from './faqData'
import Input from '@/components/ui/Input'

// ── Single accordion item ─────────────────────────────────

function FaqItem({
    question,
    answer,
    isOpen,
    onToggle,
}: {
    question: string
    answer: string
    isOpen: boolean
    onToggle: () => void
}) {
    return (
        <div className="border border-border rounded-lg overflow-hidden bg-background-elevated">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-background-overlay/50 transition-colors"
            >
                <span className="text-sm font-medium text-foreground">{question}</span>
                <ChevronDown
                    size={15}
                    className={`text-foreground-subtle flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 border-t border-border pt-3">
                            <p className="text-sm text-foreground-muted leading-relaxed">{answer}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// ── Main FAQ component ────────────────────────────────────

interface FaqSectionProps {
    /** Restrict to one category — e.g. show only "billing" inside the Billing tab.
     *  Omit to show the full categorized list (used on the landing page). */
    category?: FaqCategory
    /** Show the search box and category tabs. Defaults to true for the full view,
     *  usually false when embedded inside a specific settings tab. */
    showFilters?: boolean
    /** Optional heading override */
    title?: string
    className?: string
}

export default function FaqSection({
    category,
    showFilters = !category,
    title = 'Frequently asked questions',
    className = '',
}: FaqSectionProps) {
    const [query, setQuery] = useState('')
    const [activeCategory, setActiveCategory] = useState<FaqCategory | 'all'>(category ?? 'all')
    const [openId, setOpenId] = useState<string | null>(null)

    const filtered = useMemo(() => {
        let entries = FAQ_ENTRIES

        if (activeCategory !== 'all') {
            entries = entries.filter(f => f.category === activeCategory)
        }

        if (query.trim()) {
            const q = query.toLowerCase()
            entries = entries.filter(
                f => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
            )
        }

        return entries
    }, [activeCategory, query])

    return (
        <div className={`space-y-5 ${className}`}>
            {title && (
                <div className="flex items-center gap-2">
                    <HelpCircle size={18} className="text-foreground-muted" />
                    <h2 className="font-sora font-semibold text-lg text-foreground">{title}</h2>
                </div>
            )}

            {showFilters && (
                <div className="space-y-3">
                    <Input
                        placeholder="Search FAQs..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        leftIcon={<Search size={15} />}
                    />

                    {!query && (
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                            <button
                                onClick={() => setActiveCategory('all')}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${activeCategory === 'all'
                                        ? 'bg-amber-500 text-background'
                                        : 'bg-background-elevated text-foreground-muted border border-border hover:border-border-subtle'
                                    }`}
                            >
                                All
                            </button>
                            {FAQ_CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${activeCategory === cat.id
                                            ? 'bg-amber-500 text-background'
                                            : 'bg-background-elevated text-foreground-muted border border-border hover:border-border-subtle'
                                        }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {filtered.length === 0 ? (
                <div className="text-center py-10 text-sm text-foreground-subtle">
                    No FAQs match "{query}" — try a different search term.
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(faq => (
                        <FaqItem
                            key={faq.id}
                            question={faq.question}
                            answer={faq.answer}
                            isOpen={openId === faq.id}
                            onToggle={() => setOpenId(openId === faq.id ? null : faq.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}