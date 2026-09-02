import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, RotateCcw, Lightbulb, BookA } from 'lucide-react';

interface FlashcardModalProps {
    keyPoints: string[];
    definitions: string[];
    title: string;
    onClose: () => void;
}

interface Card {
    front: string;
    back: string;
    type: 'concept' | 'definition';
}

export default function FlashcardModal({ keyPoints, definitions, title, onClose }: FlashcardModalProps) {
    // Build card deck: definitions as Q/A pairs, keyPoints as "What is this about?"
    const cards: Card[] = [
        ...definitions.map((d, i) => ({
            front: `Definition ${i + 1}`,
            back: d,
            type: 'definition' as const,
        })),
        ...keyPoints.map((kp, i) => ({
            front: `Key Concept ${i + 1}`,
            back: kp,
            type: 'concept' as const,
        })),
    ];

    const [index, setIndex] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const [direction, setDirection] = useState<1 | -1>(1);

    const card = cards[index];
    const progress = Math.round(((index + 1) / cards.length) * 100);

    const go = (dir: 1 | -1) => {
        const next = index + dir;
        if (next < 0 || next >= cards.length) return;
        setDirection(dir);
        setFlipped(false);
        setTimeout(() => setIndex(next), 120);
    };

    const scoreColor = (p: number) =>
        p >= 80 ? 'hsl(152 60% 42%)' : p >= 60 ? 'hsl(38 92% 50%)' : 'hsl(0 72% 55%)';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'hsl(0 0% 0% / 0.6)', backdropFilter: 'blur(8px)' }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 20 }}
                className="glass-card w-full max-w-lg overflow-hidden"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: 'var(--gradient-brand)' }}>
                            {card?.type === 'definition'
                                ? <BookA className="w-4 h-4 text-primary-foreground" />
                                : <Lightbulb className="w-4 h-4 text-primary-foreground" />}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-foreground">{title} — Flashcards</p>
                            <p className="text-xs text-muted-foreground">{index + 1} of {cards.length}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Progress bar */}
                <div className="h-1 bg-muted">
                    <motion.div animate={{ width: `${progress}%` }} className="h-full rounded-full"
                        style={{ background: 'var(--gradient-brand)' }} />
                </div>

                {/* Card */}
                <div className="p-6">
                    <div className="relative perspective-1000 cursor-pointer select-none"
                        style={{ height: '220px' }}
                        onClick={() => setFlipped(v => !v)}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={`${index}-${flipped}`}
                                initial={{ rotateY: flipped ? -90 : 90, opacity: 0 }}
                                animate={{ rotateY: 0, opacity: 1 }}
                                exit={{ rotateY: flipped ? 90 : -90, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="absolute inset-0 rounded-2xl border-2 flex flex-col items-center justify-center gap-4 p-6 text-center"
                                style={{
                                    borderColor: flipped ? 'hsl(var(--primary) / 0.4)' : 'hsl(var(--border))',
                                    background: flipped ? 'hsl(var(--primary) / 0.05)' : 'hsl(var(--card))',
                                }}>
                                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                    {flipped ? 'Answer' : (card?.type === 'definition' ? '📚 Definition' : '💡 Key Concept')}
                                </div>
                                <p className={`font-semibold leading-relaxed ${flipped ? 'text-sm text-foreground' : 'text-2xl text-primary'}`}>
                                    {flipped ? card?.back : card?.front}
                                </p>
                                {!flipped && (
                                    <p className="text-xs text-muted-foreground">Tap to reveal</p>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between mt-5">
                        <button onClick={() => go(-1)} disabled={index === 0}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-40 transition-all">
                            <ChevronLeft className="w-4 h-4" /> Prev
                        </button>
                        <button onClick={() => { setIndex(0); setFlipped(false); }}
                            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Reset">
                            <RotateCcw className="w-4 h-4" />
                        </button>
                        <button onClick={() => go(1)} disabled={index === cards.length - 1}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-primary-foreground disabled:opacity-40 transition-all"
                            style={{
                                background: index < cards.length - 1 ? 'var(--gradient-brand)' : undefined,
                                backgroundColor: index === cards.length - 1 ? 'hsl(var(--muted))' : undefined
                            }}>
                            Next <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <p className="text-center text-xs text-muted-foreground mt-3">
                        {index === cards.length - 1 ? '🎉 All cards reviewed!' : 'Tap the card to flip it'}
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
