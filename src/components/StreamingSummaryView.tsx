import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, Loader2, AlertCircle, CheckCircle2,
    Wifi, WifiOff, ArrowLeft, Copy, Download, Check
} from 'lucide-react';
import { useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface StreamingSummaryViewProps {
    /** Accumulated summary text (grows chunk-by-chunk). */
    summary: string;
    /** True while chunks are arriving. */
    isStreaming: boolean;
    /** True after SUMMARY_COMPLETED. */
    isComplete: boolean;
    /** True when WebSocket is connected. */
    isConnected: boolean;
    /** Error message or null. */
    error: string | null;
    /** Call this to trigger the streaming. */
    triggerStream: () => Promise<void>;
    /** Navigate back / reset. */
    onReset: () => void;
    /** Optional: lecture file name for display. */
    fileName?: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function StreamingSummaryView({
    summary,
    isStreaming,
    isComplete,
    isConnected,
    error,
    triggerStream,
    onReset,
    fileName,
}: StreamingSummaryViewProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);

    // Has streaming started but no text yet? → show loader
    const waitingForFirstChunk = isStreaming && summary.length === 0;
    // Not started yet — show the trigger button
    const notStarted = !isStreaming && !isComplete && !error && summary.length === 0;

    // ── Auto-scroll as new chunks arrive ────────────────────────────────────

    useEffect(() => {
        if (scrollRef.current && isStreaming) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [summary, isStreaming]);

    // ── Copy / Download handlers ────────────────────────────────────────────

    const handleCopy = async () => {
        await navigator.clipboard.writeText(summary);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const blob = new Blob([summary], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(fileName || 'summary').replace(/[^a-zA-Z0-9]/g, '_')}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
        >
            {/* ── Header bar ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'var(--gradient-brand)' }}
                    >
                        <Sparkles className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div>
                        <h2 className="font-bold text-foreground text-sm">
                            {isStreaming ? 'Generating Summary…' : isComplete ? 'Summary Ready' : 'AI Summary'}
                        </h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            {fileName && (
                                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    {fileName}
                                </span>
                            )}
                            {/* Connection indicator */}
                            <span className={`inline-flex items-center gap-1 text-xs ${isConnected ? 'text-green-500' : 'text-muted-foreground'
                                }`}>
                                {isConnected ? (
                                    <><Wifi className="w-3 h-3" /> Live</>
                                ) : (
                                    <><WifiOff className="w-3 h-3" /> Connecting…</>
                                )}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                    {(isComplete || summary.length > 0) && (
                        <>
                            <button
                                onClick={handleCopy}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
                            >
                                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                                <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
                            </button>
                            <button
                                onClick={handleDownload}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                <span className="hidden sm:inline">.md</span>
                            </button>
                        </>
                    )}
                    <button
                        onClick={onReset}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                </div>
            </div>

            {/* ── Streaming progress bar ── */}
            {isStreaming && (
                <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
                    <motion.div
                        className="h-full rounded-full"
                        style={{ background: 'var(--gradient-brand)' }}
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 60, ease: 'linear' }}
                    />
                </div>
            )}

            {/* ── Main content area ── */}
            <div
                className="bg-card rounded-2xl border border-border overflow-hidden"
                style={{ boxShadow: 'var(--shadow-card)' }}
            >
                {/* ── Not started — trigger button ── */}
                <AnimatePresence mode="wait">
                    {notStarted && (
                        <motion.div
                            key="trigger"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center gap-5 py-16 px-6"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                                <Sparkles className="w-7 h-7 text-primary" />
                            </div>
                            <div className="text-center space-y-1">
                                <p className="text-base font-semibold text-foreground">
                                    Ready to generate a streaming summary
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Text will appear in real-time as the AI generates it
                                </p>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={triggerStream}
                                disabled={!isConnected}
                                className="px-8 py-3 rounded-xl text-sm font-bold text-primary-foreground flex items-center gap-2.5 disabled:opacity-50 transition-all"
                                style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--shadow-brand)' }}
                            >
                                <Sparkles className="w-4 h-4" />
                                {isConnected ? 'Start Streaming Summary' : 'Connecting…'}
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Waiting for first chunk — animated loader ── */}
                <AnimatePresence>
                    {waitingForFirstChunk && (
                        <motion.div
                            key="loader"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center gap-4 py-16 px-6"
                        >
                            <div className="relative">
                                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                                <motion.div
                                    className="absolute inset-0 rounded-full"
                                    style={{ background: 'var(--gradient-brand)', opacity: 0.15 }}
                                    animate={{ scale: [1, 1.4, 1], opacity: [0.15, 0, 0.15] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-foreground">
                                    AI is thinking…
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    First words will appear shortly
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Streaming / completed text area ── */}
                {summary.length > 0 && (
                    <div
                        ref={scrollRef}
                        className="p-6 sm:p-8 max-h-[70vh] overflow-y-auto"
                    >
                        <div className="prose prose-sm max-w-none text-foreground leading-relaxed whitespace-pre-wrap break-words">
                            {summary}
                            {/* Blinking cursor while streaming */}
                            {isStreaming && (
                                <motion.span
                                    className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle"
                                    animate={{ opacity: [1, 0, 1] }}
                                    transition={{ repeat: Infinity, duration: 0.8 }}
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* ── Completion banner ── */}
                <AnimatePresence>
                    {isComplete && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="border-t border-border px-6 py-3 flex items-center gap-2"
                            style={{ background: 'hsl(var(--primary) / 0.04)' }}
                        >
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span className="text-sm font-medium text-foreground">
                                Summary generated successfully
                            </span>
                            <span className="text-xs text-muted-foreground ml-auto">
                                {summary.length.toLocaleString()} characters
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Error banner ── */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="border-t border-destructive/20 px-6 py-4 flex items-start gap-3 bg-destructive/5"
                        >
                            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-destructive">{error}</p>
                                <button
                                    onClick={triggerStream}
                                    className="text-xs text-primary font-medium mt-1 hover:underline"
                                >
                                    Try again
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
