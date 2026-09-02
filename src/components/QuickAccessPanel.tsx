import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap, FileText, Upload, X, MessageSquare, Brain,
    Loader2, CheckCircle2, AlertCircle, ChevronRight, Sparkles
} from 'lucide-react';
import { quickIndexLecture } from '../services/api';

interface QuickAccessPanelProps {
    accessToken: string;
    onIndexed?: () => void; // called after successful index (e.g. to refresh history)
}

type Phase = 'idle' | 'indexing' | 'ready' | 'error';

const MAX_FILE_SIZE_MB = 10;

export default function QuickAccessPanel({ accessToken, onIndexed }: QuickAccessPanelProps) {
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);

    const [phase, setPhase] = useState<Phase>('idle');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<{ lectureId: string; fileName: string; pageCount: number; chunksIndexed: number } | null>(null);

    const validateFile = (file: File): string | null => {
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf'))
            return 'Only PDF files are supported.';
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024)
            return `File must be under ${MAX_FILE_SIZE_MB}MB. Yours: ${(file.size / 1024 / 1024).toFixed(1)}MB`;
        return null;
    };

    const handleFileChange = useCallback((file: File) => {
        setError('');
        const err = validateFile(file);
        if (err) { setError(err); return; }
        setSelectedFile(file);
        setPhase('idle');
        setResult(null);
    }, []);

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
    const handleDragLeave = () => setDragOver(false);
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileChange(file);
    };

    const handleIndex = async () => {
        if (!selectedFile || !accessToken || phase === 'indexing') return;
        setPhase('indexing');
        setError('');
        try {
            const data = await quickIndexLecture(selectedFile, accessToken);
            setResult(data);
            setPhase('ready');
            onIndexed?.();
        } catch (e: any) {
            setError(e.message || 'Failed to process PDF.');
            setPhase('error');
        }
    };

    const reset = () => {
        setSelectedFile(null);
        setResult(null);
        setError('');
        setPhase('idle');
    };

    return (
        <div className="glass-card overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'var(--gradient-brand)' }}>
                    <Zap className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                    <h2 className="font-bold text-foreground text-sm">Quick Mode</h2>
                    <p className="text-xs text-muted-foreground">Upload PDF → Ask or Quiz instantly, no summary needed</p>
                </div>
            </div>

            <div className="p-5 space-y-4">

                {/* ── Idle / file picker ── */}
                <AnimatePresence mode="wait">
                    {phase !== 'ready' && (
                        <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

                            {/* Drop zone */}
                            <div
                                className={`relative border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer ${dragOver
                                        ? 'border-primary bg-primary/5 scale-[1.01]'
                                        : selectedFile
                                            ? 'border-primary/40 bg-primary/[0.03]'
                                            : 'border-border hover:border-primary/30 hover:bg-muted/30'
                                    }`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => !selectedFile && inputRef.current?.click()}
                            >
                                <input
                                    ref={inputRef}
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    className="hidden"
                                    onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                                    onClick={(e) => e.stopPropagation()}
                                />

                                <AnimatePresence mode="wait">
                                    {!selectedFile ? (
                                        <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                            className="flex flex-col items-center gap-3 py-8 px-4">
                                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                                <Upload className="w-6 h-6 text-primary" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-semibold text-foreground">
                                                    {dragOver ? 'Drop it!' : 'Drop your PDF here'}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    or <span className="text-primary font-medium underline underline-offset-2">browse files</span>
                                                </p>
                                            </div>
                                            <span className="text-[11px] text-muted-foreground bg-muted px-2 py-1 rounded-full">PDF · max 10 MB</span>
                                        </motion.div>
                                    ) : (
                                        <motion.div key="selected" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                                            className="flex items-center gap-3 p-4">
                                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                <FileText className="w-5 h-5 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-foreground truncate">{selectedFile.name}</p>
                                                <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(0)} KB</p>
                                            </div>
                                            <button onClick={(e) => { e.stopPropagation(); reset(); }}
                                                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0">
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
                                        className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs mt-3">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{error}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Index button */}
                            <AnimatePresence>
                                {selectedFile && phase !== 'indexing' && (
                                    <motion.button
                                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                        onClick={handleIndex}
                                        className="mt-3 w-full py-2.5 rounded-xl text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2 transition-all"
                                        style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--shadow-brand)' }}
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        Index PDF — Start Instantly
                                    </motion.button>
                                )}
                            </AnimatePresence>

                            {/* Indexing loader */}
                            <AnimatePresence>
                                {phase === 'indexing' && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        className="mt-3 w-full py-3 rounded-xl text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2"
                                        style={{ background: 'hsl(var(--primary) / 0.7)' }}>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Extracting &amp; indexing PDF…
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}

                    {/* ── Ready — action buttons ── */}
                    {phase === 'ready' && result && (
                        <motion.div key="ready" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="space-y-4">

                            {/* Success info card */}
                            <div className="flex items-start gap-3 p-4 rounded-xl border border-[hsl(var(--color-success))]/30 bg-[hsl(var(--color-success))]/5">
                                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'hsl(var(--color-success))' }} />
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-foreground truncate">{result.fileName}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {result.pageCount} page{result.pageCount !== 1 ? 's' : ''} · {result.chunksIndexed > 0 ? `${result.chunksIndexed} chunks indexed` : 'Already indexed'}
                                    </p>
                                </div>
                            </div>

                            {/* Ready headline */}
                            <div className="text-center pb-1">
                                <p className="text-sm font-bold text-foreground">Ready! What do you want to do?</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Jump straight into Q&amp;A or test yourself</p>
                            </div>

                            {/* Action buttons */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => navigate(`/lecture/${result.lectureId}?tab=chat`)}
                                    className="flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all group"
                                >
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                        style={{ background: 'var(--gradient-brand)' }}>
                                        <MessageSquare className="w-5 h-5 text-primary-foreground" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-foreground">Ask Questions</p>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">RAG-powered Q&amp;A</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>

                                <button
                                    onClick={() => navigate(`/lecture/${result.lectureId}?tab=quiz`)}
                                    className="flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all group"
                                >
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                        style={{ background: 'var(--gradient-brand)' }}>
                                        <Brain className="w-5 h-5 text-primary-foreground" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-foreground">Take Quiz</p>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">Auto-generated MCQ</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            </div>

                            {/* Reset */}
                            <button onClick={reset}
                                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
                                ← Use a different PDF
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
