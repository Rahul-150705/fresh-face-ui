import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, ChevronRight, Send, RotateCcw, ArrowLeft, Check, X,
  BookOpen, ChevronDown, ChevronUp, Trophy, Target, Loader2
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { generateQuiz, submitQuizAnswers } from '@/services/api';

/* ── Confetti burst (pure CSS + framer-motion, no npm needed) ── */
const CONFETTI_COLORS = ['hsl(263 70% 60%)', 'hsl(38 92% 55%)', 'hsl(152 60% 42%)', 'hsl(217 91% 60%)', 'hsl(0 72% 55%)'];

function ConfettiBurst() {
  const pieces = Array.from({ length: 40 }, (_, i) => i);
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map(i => (
        <motion.div key={i}
          initial={{ y: -20, x: `${Math.random() * 100}vw`, opacity: 1, scale: 1 }}
          animate={{ y: '110vh', opacity: [1, 1, 0], rotate: Math.random() * 720 - 360, scale: [1, 0.8] }}
          transition={{ duration: 1.8 + Math.random() * 1.2, delay: Math.random() * 0.6, ease: 'easeIn' }}
          style={{
            position: 'absolute',
            top: 0,
            width: `${6 + Math.random() * 8}px`,
            height: `${6 + Math.random() * 8}px`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          }}
        />
      ))}
    </div>
  );
}


/* ────────── types ────────── */

interface QuizQuestion {
  index: number;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface QuizData {
  lectureId: string;
  lectureTitle: string;
  totalQuestions: number;
  questions: QuizQuestion[];
}

interface QuizResult {
  index: number;
  question: string;
  selectedAnswer: string;
  correctAnswer: string;
  correct: boolean;
  explanation: string;
}

interface QuizResults {
  score: number;
  totalQuestions: number;
  percentage: number;
  grade: string;
  results: QuizResult[];
}

interface QuizViewProps {
  lectureId: string;
  lectureTitle: string;
  accessToken: string;
  onBack: () => void;
}

const ANSWER_LABELS = ['A', 'B', 'C', 'D'];

/* ────────── component ────────── */

export default function QuizView({ lectureId, lectureTitle, accessToken, onBack }: QuizViewProps) {
  const [phase, setPhase] = useState<'generating' | 'quiz' | 'submitting' | 'results'>('generating');
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [results, setResults] = useState<QuizResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  /* ── generate ── */
  const startQuiz = useCallback(async () => {
    setPhase('generating');
    setError(null);
    try {
      const data = await generateQuiz(lectureId, accessToken);
      setQuiz(data);
      setAnswers(new Array(data.questions.length).fill(null));
      setCurrentQ(0);
      setResults(null);
      setReviewOpen(false);
      setPhase('quiz');
    } catch (e: any) {
      setError(e.message || 'Failed to generate quiz');
      setPhase('generating');
    }
  }, [lectureId, accessToken]);

  /* kick off on mount */
  useEffect(() => { startQuiz(); }, []);

  /* ── select answer ── */
  const selectAnswer = (label: string) => {
    setAnswers(prev => {
      const copy = [...prev];
      copy[currentQ] = label;
      return copy;
    });
  };

  /* ── submit ── */
  const handleSubmit = async () => {
    if (!quiz) return;
    setPhase('submitting');
    setError(null);
    try {
      const data = await submitQuizAnswers(lectureId, answers as string[], accessToken);
      setResults(data);
      setPhase('results');
    } catch (e: any) {
      setError(e.message || 'Failed to submit quiz');
      setPhase('quiz');
    }
  };

  const isLastQuestion = quiz ? currentQ === quiz.questions.length - 1 : false;
  const allAnswered = answers.every(a => a !== null);
  const progressPct = quiz ? ((currentQ + 1) / quiz.questions.length) * 100 : 0;

  /* ═══════════ GENERATING ═══════════ */
  if (phase === 'generating') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 gap-6">
        {error ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <X className="w-7 h-7 text-destructive" />
            </div>
            <p className="text-destructive font-medium">{error}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={startQuiz} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
                Try Again
              </button>
              <button onClick={onBack} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
                Back to Summary
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--gradient-brand)' }}>
              <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-lg font-semibold font-display text-foreground">Generating quiz from your lecture… ⏳</p>
              <p className="text-sm text-muted-foreground">{lectureTitle}</p>
            </div>
          </>
        )}
      </motion.div>
    );
  }

  /* ═══════════ QUIZ QUESTIONS ═══════════ */
  if ((phase === 'quiz' || phase === 'submitting') && quiz) {
    const q = quiz.questions[currentQ];
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <span className="font-display font-bold text-foreground">Quiz</span>
          </div>
          <span className="text-sm text-muted-foreground font-medium">
            Question {currentQ + 1} of {quiz.questions.length}
          </span>
        </div>

        <Progress value={progressPct} className="h-2" />

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium">{error}</div>
        )}

        {/* question card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
            className="bg-card rounded-xl border border-border p-6 space-y-5"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <p className="text-lg font-semibold text-foreground leading-relaxed">{q.question}</p>

            <div className="grid gap-3">
              {q.options.map((opt, i) => {
                const label = ANSWER_LABELS[i];
                const selected = answers[currentQ] === label;
                return (
                  <button
                    key={label}
                    onClick={() => selectAnswer(label)}
                    disabled={phase === 'submitting'}
                    className={`w-full text-left flex items-center gap-3 p-4 rounded-lg border-2 transition-all duration-200 ${selected
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                      : 'border-border hover:border-primary/40 hover:bg-muted/50'
                      }`}
                  >
                    <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                      {label}
                    </span>
                    <span className="text-sm text-foreground">{opt}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentQ(p => Math.max(0, p - 1))}
            disabled={currentQ === 0}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-40"
          >
            Previous
          </button>

          {isLastQuestion ? (
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || phase === 'submitting'}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
              style={{ background: 'var(--gradient-brand)' }}
            >
              {phase === 'submitting' ? <><span className="btn-spinner" /> Submitting…</> : <><Send className="w-4 h-4" /> Submit Quiz</>}
            </button>
          ) : (
            <button
              onClick={() => setCurrentQ(p => p + 1)}
              disabled={answers[currentQ] === null}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-40"
              style={{ background: 'var(--gradient-brand)' }}
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* dots */}
        <div className="flex justify-center gap-1.5 flex-wrap">
          {quiz.questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQ(i)}
              className={`w-3 h-3 rounded-full transition-colors ${i === currentQ ? 'bg-primary scale-125' : answers[i] ? 'bg-primary/40' : 'bg-muted'
                }`}
            />
          ))}
        </div>
      </motion.div>
    );
  }

  /* ═══════════ RESULTS ═══════════ */
  if (phase === 'results' && results) {
    const pctColor = results.percentage >= 80
      ? 'hsl(var(--color-success))'
      : results.percentage >= 50
        ? 'hsl(var(--color-warning))'
        : 'hsl(var(--destructive))';

    const showConfetti = results.percentage >= 70;

    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Confetti on good score */}
        {showConfetti && <ConfettiBurst />}

        {/* score card */}
        <div className="bg-card rounded-xl border border-border p-8 text-center space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ background: pctColor + '22' }}>
            <Trophy className="w-8 h-8" style={{ color: pctColor }} />
          </div>
          <h2 className="text-3xl font-bold font-display text-foreground">
            {results.score} / {results.totalQuestions}
          </h2>
          <div className="w-full max-w-xs mx-auto">
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${results.percentage}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: pctColor }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-1">{results.percentage}%</p>
          </div>
          <span className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold" style={{ background: pctColor + '18', color: pctColor }}>
            {results.grade}
          </span>
        </div>

        {/* review toggle */}
        <button
          onClick={() => setReviewOpen(p => !p)}
          className="w-full flex items-center justify-between px-5 py-3 rounded-xl bg-card border border-border text-sm font-semibold text-foreground hover:bg-muted/30 transition-colors"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <span className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /> Review Answers</span>
          {reviewOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <AnimatePresence>
          {reviewOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-4"
            >
              {results.results.map((r, i) => (
                <div
                  key={i}
                  className={`rounded-xl border-2 p-5 space-y-3 ${r.correct ? 'border-[hsl(var(--color-success))]/40 bg-[hsl(var(--color-success))]/5' : 'border-destructive/40 bg-destructive/5'
                    }`}
                >
                  <div className="flex items-start gap-2">
                    {r.correct
                      ? <Check className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'hsl(var(--color-success))' }} />
                      : <X className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    }
                    <p className="font-medium text-foreground text-sm">Q{i + 1}. {r.question}</p>
                  </div>
                  <div className="ml-7 space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">Your answer:</span>{' '}
                      <span className={r.correct ? '' : 'text-destructive font-medium'}>{r.selectedAnswer}</span>
                    </p>
                    {!r.correct && (
                      <p>
                        <span className="text-muted-foreground">Correct:</span>{' '}
                        <span className="font-medium" style={{ color: 'hsl(var(--color-success))' }}>{r.correctAnswer}</span>
                      </p>
                    )}
                    <p className="text-muted-foreground mt-2 flex items-start gap-1.5">
                      <Target className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      {r.explanation}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* action buttons */}
        <div className="flex items-center gap-3 justify-center">
          <button
            onClick={startQuiz}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-primary-foreground transition-opacity"
            style={{ background: 'var(--gradient-brand)' }}
          >
            <RotateCcw className="w-4 h-4" /> Retake Quiz
          </button>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Summary
          </button>
        </div>
      </motion.div>
    );
  }

  return null;
}
