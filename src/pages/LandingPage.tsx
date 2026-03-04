import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
    GraduationCap, Sparkles, Brain, MessageSquare, ScrollText,
    ChevronRight, Star, Zap, Check, ArrowRight, BookOpen,
    Upload, Target, FileText, Users, Clock, Menu, X
} from 'lucide-react';

// ── Data ──────────────────────────────────────────────────────────────────────

const FEATURES = [
    {
        icon: ScrollText,
        title: 'AI-Powered Summaries',
        desc: 'Drop any lecture PDF and get a structured summary in seconds — key points, definitions, detailed explanation, and exam tips, all extracted by AI.',
        badge: 'Most Popular',
    },
    {
        icon: MessageSquare,
        title: 'Ask Your Lecture',
        desc: 'Chat directly with your lecture content. Ask anything and get precise, source-backed answers using Retrieval-Augmented Generation (RAG).',
        badge: 'AI-Powered',
    },
    {
        icon: Brain,
        title: 'Auto-Generated Quizzes',
        desc: 'Test your knowledge with AI-generated MCQ quizzes. Instant feedback, scores, and explanations — perfect for exam prep.',
        badge: 'Interactive',
    },
];

const HOW_IT_WORKS = [
    {
        step: '01',
        icon: Upload,
        title: 'Upload Your PDF',
        desc: 'Drag and drop any lecture PDF — syllabus notes, textbook chapters, research papers.',
    },
    {
        step: '02',
        icon: Sparkles,
        title: 'AI Processes It',
        desc: 'Our AI extracts text, generates a structured summary, and indexes the content for Q&A.',
    },
    {
        step: '03',
        icon: Target,
        title: 'Learn Your Way',
        desc: 'Read the summary, ask follow-up questions, or test yourself with a quiz — all from one place.',
    },
];

const STATS = [
    { value: '30s', label: 'Average summary time', icon: Clock },
    { value: 'RAG', label: 'Powered Q&A engine', icon: Brain },
    { value: '10+', label: 'Questions per quiz', icon: Target },
    { value: '100%', label: 'Source-grounded answers', icon: Check },
];

const TESTIMONIALS = [
    {
        text: 'I summarized my entire semester of notes in an afternoon. The exam tips section alone saved me.',
        author: 'Priya S.',
        role: 'Computer Science student',
        avatar: 'P',
    },
    {
        text: 'The RAG-powered Q&A is incredible. I can ask "explain this concept" and get a precise answer from my own notes.',
        author: 'Arjun M.',
        role: 'Engineering student',
        avatar: 'A',
    },
    {
        text: 'Quiz generation turns passive reading into active recall. My exam scores improved significantly.',
        author: 'Sanya K.',
        role: 'Medical student',
        avatar: 'S',
    },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function Navbar() {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const scrollTo = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        setMobileOpen(false);
    };

    return (
        <motion.nav
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled
                ? 'bg-background/90 backdrop-blur-xl border-b border-border shadow-sm'
                : 'bg-transparent'
                }`}
        >
            <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="flex items-center gap-2.5 group">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                        <GraduationCap className="w-4.5 h-4.5 text-primary-foreground" />
                    </div>
                    <span className="font-bold text-foreground tracking-tight">LearnAI</span>
                </button>

                <div className="hidden md:flex items-center gap-6">
                    {[['features', 'Features'], ['how-it-works', 'How it works'], ['testimonials', 'Reviews']].map(([id, label]) => (
                        <button key={id} onClick={() => scrollTo(id)}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
                            {label}
                        </button>
                    ))}
                </div>

                <div className="hidden md:flex items-center gap-3">
                    <button onClick={() => navigate('/login')}
                        className="text-sm font-semibold text-foreground px-4 py-2 rounded-lg hover:bg-muted transition-colors">
                        Sign In
                    </button>
                    <button onClick={() => navigate('/signup')}
                        className="text-sm font-bold text-primary-foreground px-4 py-2 rounded-lg bg-primary transition-all hover:opacity-90 hover:scale-[1.02]"
                        style={{ boxShadow: 'var(--shadow-brand)' }}>
                        Get Started Free
                    </button>
                </div>

                <button className="md:hidden p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                    onClick={() => setMobileOpen(v => !v)}>
                    {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            <AnimatePresence>
                {mobileOpen && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border px-4 pb-4 space-y-1">
                        {[['features', 'Features'], ['how-it-works', 'How it works'], ['testimonials', 'Reviews']].map(([id, label]) => (
                            <button key={id} onClick={() => scrollTo(id)}
                                className="w-full text-left text-sm text-muted-foreground hover:text-foreground py-2.5 px-2 rounded-lg hover:bg-muted transition-colors font-medium">
                                {label}
                            </button>
                        ))}
                        <div className="pt-2 space-y-2">
                            <button onClick={() => navigate('/login')}
                                className="w-full text-sm font-semibold text-foreground py-2.5 rounded-lg border border-border hover:bg-muted transition-colors">
                                Sign In
                            </button>
                            <button onClick={() => navigate('/signup')}
                                className="w-full text-sm font-bold text-primary-foreground py-2.5 rounded-lg bg-primary">
                                Get Started Free
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.nav>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function LandingPage() {
    const navigate = useNavigate();
    const { scrollYProgress } = useScroll();
    const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -60]);
    const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);

    const fadeUp = {
        hidden: { opacity: 0, y: 32 },
        visible: (i = 0) => ({
            opacity: 1,
            y: 0,
            transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' as const },
        }),
    };

    return (
        <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
            <Navbar />

            {/* ═══════════════════════════ HERO ═══════════════════════════ */}
            <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 pt-16 pb-24 overflow-hidden">
                {/* Subtle background shapes */}
                <div className="absolute inset-0 pointer-events-none">
                    <motion.div
                        animate={{ scale: [1, 1.15, 1], rotate: [0, 15, 0] }}
                        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-3xl opacity-[0.04] bg-foreground"
                    />
                    <motion.div
                        animate={{ scale: [1.1, 1, 1.1], rotate: [0, -12, 0] }}
                        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full blur-3xl opacity-[0.03] bg-foreground"
                    />
                    {/* Grid overlay */}
                    <div className="absolute inset-0 opacity-[0.03]"
                        style={{ backgroundImage: 'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
                </div>

                <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 max-w-5xl mx-auto space-y-8">
                    {/* Badge */}
                    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
                        <span className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full border border-border text-foreground bg-muted">
                            <Sparkles className="w-3.5 h-3.5" />
                            AI-Powered Learning Assistant
                        </span>
                    </motion.div>

                    {/* Headline */}
                    <motion.h1 variants={fadeUp} initial="hidden" animate="visible" custom={1}
                        className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] text-foreground">
                        Turn any lecture into{' '}
                        <span className="relative inline-block">
                            <span className="text-foreground underline decoration-foreground/20 decoration-4 underline-offset-4">
                                instant knowledge
                            </span>
                        </span>
                    </motion.h1>

                    {/* Subtext */}
                    <motion.p variants={fadeUp} initial="hidden" animate="visible" custom={2}
                        className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        Upload a PDF lecture — get an AI summary, answer any question about it, and test yourself with a generated quiz. All powered by local AI.
                    </motion.p>

                    {/* CTA buttons */}
                    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button onClick={() => navigate('/signup')}
                            className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl text-base font-bold text-primary-foreground bg-primary transition-all hover:opacity-95 hover:scale-[1.02] hover:-translate-y-0.5"
                            style={{ boxShadow: 'var(--shadow-brand)' }}>
                            Get Started — It's Free
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                        <button onClick={() => navigate('/login')}
                            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold text-foreground border border-border hover:bg-muted transition-all">
                            Sign In
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </button>
                    </motion.div>

                    {/* Social proof */}
                    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}
                        className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <div className="flex -space-x-2">
                            {['P', 'A', 'S', 'R'].map((letter, i) => (
                                <div key={i} className="w-8 h-8 rounded-full border-2 border-background flex items-center justify-center text-xs font-bold text-primary-foreground bg-primary"
                                    style={{ opacity: 0.7 + i * 0.1 }}>
                                    {letter}
                                </div>
                            ))}
                        </div>
                        <span>
                            Loved by <strong className="text-foreground">students</strong> who study smarter
                        </span>
                        <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className="w-3.5 h-3.5 fill-foreground/80 text-foreground/80" />
                            ))}
                        </div>
                    </motion.div>
                </motion.div>

                {/* Floating feature preview cards */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.7 }}
                    className="relative z-10 mt-16 grid grid-cols-3 gap-4 max-w-3xl mx-auto w-full px-4"
                >
                    {[
                        { icon: ScrollText, label: 'AI Summary', val: '~30s' },
                        { icon: MessageSquare, label: 'Ask Questions', val: 'RAG-powered' },
                        { icon: Brain, label: 'Quiz Me', val: '10 questions' },
                    ].map((item, i) => (
                        <motion.div key={i}
                            animate={{ y: [0, -6, 0] }}
                            transition={{ duration: 3 + i * 0.7, repeat: Infinity, delay: i * 0.4, ease: 'easeInOut' }}
                            className="glass-card p-4 text-center flex flex-col items-center gap-2">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted">
                                <item.icon className="w-4.5 h-4.5 text-foreground" />
                            </div>
                            <p className="text-xs font-bold text-foreground">{item.label}</p>
                            <p className="text-[11px] text-muted-foreground">{item.val}</p>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Scroll indicator */}
                <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground">
                    <div className="w-5 h-9 rounded-full border-2 border-border flex items-start justify-center pt-1.5">
                        <div className="w-1 h-2 rounded-full bg-foreground" />
                    </div>
                </motion.div>
            </section>

            {/* ═══════════════════════════ STATS ═══════════════════════════ */}
            <section className="py-16 px-4 border-y border-border">
                <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
                    {STATS.map((stat, i) => (
                        <motion.div key={i}
                            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                            className="flex flex-col items-center text-center gap-2">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-muted">
                                <stat.icon className="w-5 h-5 text-foreground" />
                            </div>
                            <span className="text-3xl font-extrabold text-foreground">
                                {stat.value}
                            </span>
                            <span className="text-sm text-muted-foreground font-medium">{stat.label}</span>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ═══════════════════════════ FEATURES ═══════════════════════════ */}
            <section id="features" className="py-24 px-4">
                <div className="max-w-6xl mx-auto">
                    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} className="text-center mb-16 space-y-3">
                        <span className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-muted text-foreground">
                            <Zap className="w-3.5 h-3.5" /> Everything you need
                        </span>
                        <h2 className="text-4xl font-extrabold text-foreground">
                            Three ways to master any lecture
                        </h2>
                        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                            Upload once — study in three different modes tailored to how you learn best.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {FEATURES.map((f, i) => (
                            <motion.div key={i}
                                initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.15 }} viewport={{ once: true }}
                                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                                className="relative glass-card glass-card-hover p-7 space-y-5 overflow-hidden">
                                <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full blur-2xl opacity-[0.03] bg-foreground" />

                                {f.badge && (
                                    <span className="inline-flex text-[11px] font-bold px-2.5 py-1 rounded-full bg-muted text-foreground">
                                        {f.badge}
                                    </span>
                                )}
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-muted">
                                    <f.icon className="w-6 h-6 text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-foreground">{f.title}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                                </div>
                                <div className="pt-2">
                                    <button onClick={() => navigate('/signup')}
                                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground transition-colors group hover:underline">
                                        Try it free
                                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════ HOW IT WORKS ═══════════════════════════ */}
            <section id="how-it-works" className="py-24 px-4 bg-muted/30 border-y border-border">
                <div className="max-w-5xl mx-auto">
                    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} className="text-center mb-16 space-y-3">
                        <span className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-muted text-foreground">
                            <BookOpen className="w-3.5 h-3.5" /> Simple process
                        </span>
                        <h2 className="text-4xl font-extrabold text-foreground">
                            From PDF to mastery in 3 steps
                        </h2>
                    </motion.div>

                    <div className="relative">
                        <div className="absolute top-16 left-1/6 right-1/6 h-px bg-gradient-to-r from-transparent via-border to-transparent hidden md:block" />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {HOW_IT_WORKS.map((step, i) => (
                                <motion.div key={i}
                                    initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.15 }} viewport={{ once: true }}
                                    className="flex flex-col items-center text-center gap-5">
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-primary"
                                            style={{ boxShadow: 'var(--shadow-brand)' }}>
                                            <step.icon className="w-7 h-7 text-primary-foreground" />
                                        </div>
                                        <span className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-background border-2 border-foreground flex items-center justify-center text-[11px] font-extrabold text-foreground">
                                            {i + 1}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">{step.step}</p>
                                        <h3 className="text-lg font-bold text-foreground">{step.title}</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════ TESTIMONIALS ═══════════════════════════ */}
            <section id="testimonials" className="py-24 px-4">
                <div className="max-w-5xl mx-auto">
                    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} className="text-center mb-16 space-y-3">
                        <span className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-muted text-foreground">
                            <Users className="w-3.5 h-3.5" /> Student reviews
                        </span>
                        <h2 className="text-4xl font-extrabold text-foreground">
                            Loved by students who study smarter
                        </h2>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {TESTIMONIALS.map((t, i) => (
                            <motion.div key={i}
                                initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.12 }} viewport={{ once: true }}
                                className="glass-card p-6 space-y-5">
                                <div className="flex gap-1">
                                    {Array.from({ length: 5 }).map((_, si) => (
                                        <Star key={si} className="w-4 h-4 fill-foreground/70 text-foreground/70" />
                                    ))}
                                </div>
                                <p className="text-sm text-foreground leading-relaxed italic">"{t.text}"</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground bg-primary shrink-0">
                                        {t.avatar}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-foreground">{t.author}</p>
                                        <p className="text-xs text-muted-foreground">{t.role}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════ CTA BANNER ═══════════════════════════ */}
            <section className="py-20 px-4">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                        className="relative rounded-3xl overflow-hidden p-12 text-center bg-primary"
                        style={{ boxShadow: 'var(--shadow-brand)' }}>
                        {/* Subtle orbs */}
                        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-10 bg-primary-foreground" />
                        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full blur-3xl opacity-5 bg-primary-foreground" />

                        <div className="relative z-10 space-y-6">
                            <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center bg-primary-foreground/10 border border-primary-foreground/20">
                                <GraduationCap className="w-7 h-7 text-primary-foreground" />
                            </div>
                            <div className="space-y-3">
                                <h2 className="text-4xl font-extrabold text-primary-foreground">
                                    Ready to study smarter?
                                </h2>
                                <p className="text-lg text-primary-foreground/60 max-w-xl mx-auto">
                                    Join students who upload their lectures and get AI-powered summaries, answers, and quizzes instantly.
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                                <button onClick={() => navigate('/signup')}
                                    className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-base text-primary bg-primary-foreground transition-all hover:opacity-95 hover:scale-[1.02] hover:-translate-y-0.5">
                                    Create Free Account
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                </button>
                                <button onClick={() => navigate('/login')}
                                    className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-base text-primary-foreground/80 hover:text-primary-foreground border border-primary-foreground/20 hover:border-primary-foreground/40 transition-all">
                                    Sign In <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                            <p className="text-sm text-primary-foreground/40">No credit card required · Free to use · All AI runs locally</p>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ═══════════════════════════ FOOTER ═══════════════════════════ */}
            <footer className="border-t border-border py-10 px-4">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                            <GraduationCap className="w-3.5 h-3.5 text-primary-foreground" />
                        </div>
                        <span className="font-bold text-foreground">LearnAI</span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <button onClick={() => navigate('/login')} className="hover:text-foreground transition-colors">Sign In</button>
                        <button onClick={() => navigate('/signup')} className="hover:text-foreground transition-colors">Sign Up</button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        © {new Date().getFullYear()} LearnAI · Built with Spring Boot + React
                    </p>
                </div>
            </footer>
        </div>
    );
}
