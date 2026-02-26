import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, FileText, X, Sparkles, Loader2, AlertCircle
} from 'lucide-react';
import { processLectureByMode } from '../services/api';

// ── Props ─────────────────────────────────────────────────────────────────────

interface SmartUploadPanelProps {
    accessToken: string;
    /** Called with the old sync summary data (kept for backward compat) */
    onSummaryReady: (data: any) => void;
    /** Signal to Dashboard to show the loading animation */
    onLoading: (v: boolean) => void;
    /** NEW: Called when a lectureId is ready for streaming */
    onStreamReady?: (lectureId: string, fileName: string) => void;
}

const MAX_MB = 10;

// ── Component ─────────────────────────────────────────────────────────────────

export default function SmartUploadPanel({ accessToken, onSummaryReady, onLoading, onStreamReady }: SmartUploadPanelProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const [file, setFile] = useState<File | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);

    // ── Validation ────────────────────────────────────────────────────────────
    const validate = (f: File): string | null => {
        if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf'))
            return 'Only PDF files are supported.';
        if (f.size > MAX_MB * 1024 * 1024)
            return `Max ${MAX_MB} MB. Your file: ${(f.size / 1024 / 1024).toFixed(1)} MB`;
        return null;
    };

    const handleFile = useCallback((f: File) => {
        setError('');
        const err = validate(f);
        if (err) { setError(err); return; }
        setFile(f);
    }, []);

    // ── Drag & drop ───────────────────────────────────────────────────────────
    const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
    const onDragLeave = () => setDragOver(false);
    const onDrop = (e: React.DragEvent) => {
        e.preventDefault(); setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
    };

    const removeFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        setFile(null);
        setError('');
        if (inputRef.current) inputRef.current.value = '';
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSummarize = async () => {
        if (!file || processing) return;
        setError('');
        setProcessing(true);
        onLoading(true);

        try {
            // Use "chat" mode — extracts text + indexes into RAG (fast),
            // returns lectureId immediately without waiting for summary
            const data = await processLectureByMode(file, 'chat', accessToken);

            onLoading(false);

            // If the streaming callback is provided, hand off to streaming view
            if (onStreamReady && data.lectureId) {
                onStreamReady(data.lectureId, data.fileName || file.name);
            } else {
                // Fallback to old sync summary flow
                onSummaryReady(data);
            }
        } catch (e: any) {
            setError(e.message || 'Something went wrong. Please try again.');
            onLoading(false);
            setProcessing(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="glass-card overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border/50 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'var(--gradient-brand)' }}>
                    <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                    <h2 className="font-bold text-foreground text-sm">Upload Your Lecture</h2>
                    <p className="text-xs text-muted-foreground">
                        Upload a PDF &rarr; get a real-time AI summary &rarr; ask questions or take a quiz
                    </p>
                </div>
            </div>

            <div className="p-6 space-y-4">
                {/* Drop zone */}
                <div
                    className={`border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer ${dragOver
                        ? 'border-primary bg-primary/5 scale-[1.01]'
                        : file
                            ? 'border-primary/40 bg-primary/[0.03] cursor-default'
                            : 'border-border hover:border-primary/40 hover:bg-muted/30'
                        }`}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onClick={() => !file && inputRef.current?.click()}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                        onClick={e => e.stopPropagation()}
                    />

                    <AnimatePresence mode="wait">
                        {!file ? (
                            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="flex flex-col items-center gap-4 py-14 px-6">
                                <motion.div animate={{ y: dragOver ? -6 : 0 }} transition={{ type: 'spring', stiffness: 300 }}
                                    className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                                    <Upload className="w-7 h-7 text-primary" />
                                </motion.div>
                                <div className="text-center">
                                    <p className="text-base font-semibold text-foreground">
                                        {dragOver ? 'Drop it!' : 'Drop your lecture PDF here'}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        or{' '}
                                        <span className="text-primary font-medium underline underline-offset-2">
                                            browse files
                                        </span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full">
                                        <FileText className="w-3 h-3" /> PDF only
                                    </span>
                                    <span className="bg-muted px-3 py-1.5 rounded-full">Max {MAX_MB} MB</span>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div key="selected" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                                className="flex items-center gap-4 p-5">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                    <FileText className="w-6 h-6 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-foreground truncate">{file.name}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {(file.size / 1024).toFixed(0)} KB &middot; PDF ready to summarize
                                    </p>
                                </div>
                                <button onClick={removeFile}
                                    className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0">
                                    <X className="w-4 h-4" />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Error */}
                <AnimatePresence>
                    {error && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            className="flex items-center gap-2 p-3.5 rounded-xl bg-destructive/10 text-destructive text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Summarize button */}
                <AnimatePresence>
                    {file && (
                        <motion.button
                            key="btn"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            onClick={handleSummarize}
                            disabled={processing}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full py-3.5 rounded-xl text-sm font-bold text-primary-foreground flex items-center justify-center gap-2.5 disabled:opacity-60 transition-all"
                            style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--shadow-brand)' }}
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Uploading &amp; Preparing...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    Generate Summary
                                </>
                            )}
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
