import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FileSearch, Brain, Sparkles, CheckCircle2 } from 'lucide-react';

const STAGES = [
  { icon: FileSearch, label: 'Reading your PDF…', sub: 'Extracting text from pages' },
  { icon: Brain, label: 'Analyzing content…', sub: 'Identifying key concepts & structure' },
  { icon: Sparkles, label: 'Generating summary…', sub: 'Creating structured notes & exam points' },
  { icon: CheckCircle2, label: 'Finalizing…', sub: 'Polishing your study material' },
];

export default function LoadingAnimation() {
  const [progress, setProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    // Simulate progress: fast to ~30, slow to ~70, then creep to 92 and hold
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev < 30) return prev + 1.2;
        if (prev < 60) return prev + 0.6;
        if (prev < 85) return prev + 0.25;
        if (prev < 92) return prev + 0.08;
        return prev;
      });
    }, 120);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress < 20) setStageIndex(0);
    else if (progress < 50) setStageIndex(1);
    else if (progress < 80) setStageIndex(2);
    else setStageIndex(3);
  }, [progress]);

  const stage = STAGES[stageIndex];
  const StageIcon = stage.icon;
  const pct = Math.round(progress);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-16 sm:py-20 gap-8"
    >
      {/* Animated icon */}
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="w-20 h-20 rounded-full border-[3px] border-primary/20 border-t-primary"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            key={stageIndex}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <StageIcon className="w-8 h-8 text-primary" />
          </motion.div>
        </div>
      </div>

      {/* Percentage */}
      <div className="text-center space-y-2">
        <motion.p
          key={pct}
          className="text-4xl font-bold font-display text-foreground tabular-nums"
        >
          {pct}<span className="text-xl text-muted-foreground">%</span>
        </motion.p>
        <motion.h3
          key={stage.label}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-lg font-semibold font-display text-foreground"
        >
          {stage.label}
        </motion.h3>
        <p className="text-sm text-muted-foreground">{stage.sub}</p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'var(--gradient-brand)' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
        {/* Stage dots */}
        <div className="flex justify-between mt-3">
          {STAGES.map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
                i <= stageIndex ? 'bg-primary' : 'bg-muted-foreground/30'
              }`} />
              <span className={`text-[10px] font-medium transition-colors duration-300 ${
                i <= stageIndex ? 'text-primary' : 'text-muted-foreground/50'
              }`}>
                {i + 1}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
