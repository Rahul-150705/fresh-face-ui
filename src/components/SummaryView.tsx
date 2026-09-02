import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookMarked, FileText, BookOpen, Bot, Clock,
  ArrowLeft, Copy, Download, Check,
  MessageSquare, Brain, ChevronRight
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SummaryData {
  lectureId?: string;
  title: string;
  overview?: string;
  keyPoints?: string[];
  definitions?: string[];
  detailedExplanation?: string;
  examPoints?: string[];
  furtherReading?: string[];
  markdownSummary?: string;
  fileName?: string;
  provider?: string;
  generatedAt?: string;
  pageCount?: number;
}

interface SummaryViewProps {
  summary: SummaryData;
  onReset: () => void;
  onTakeQuiz?: () => void;
  onAskQuestions?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SummaryView({ summary, onReset, onTakeQuiz, onAskQuestions }: SummaryViewProps) {
  const {
    title, overview, keyPoints = [], definitions = [],
    examPoints = [], detailedExplanation, furtherReading = [],
    markdownSummary, fileName, provider, generatedAt, pageCount,
  } = summary;

  const [copied, setCopied] = useState(false);

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return iso; }
  };

  const handleCopy = async () => {
    const text = buildPlainText();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const buildPlainText = () => {
    const lines: string[] = [`# ${title}`, ''];
    if (overview) lines.push(overview, '');
    if (keyPoints.length) {
      lines.push('Key Points');
      keyPoints.forEach((k, i) => lines.push(`${i + 1}. ${k}`));
      lines.push('');
    }
    if (definitions.length) {
      lines.push('Definitions');
      definitions.forEach((d, i) => lines.push(`${i + 1}. ${d}`));
      lines.push('');
    }
    if (detailedExplanation) lines.push(detailedExplanation, '');
    if (examPoints.length) {
      lines.push('Exam Tips');
      examPoints.forEach((e, i) => lines.push(`${i + 1}. ${e}`));
      lines.push('');
    }
    if (furtherReading.length) {
      lines.push('Further Reading');
      furtherReading.forEach(f => lines.push(`• ${f}`));
    }
    return lines.join('\n');
  };

  const handleDownload = () => {
    const content = markdownSummary || buildPlainText();
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(title || 'summary').replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasNextActions = onAskQuestions || onTakeQuiz;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* ── Header toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-2 min-w-0 flex-1">
          <h2 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
            <BookMarked className="w-6 h-6 text-primary shrink-0" />
            <span className="truncate">{title}</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {fileName && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                <FileText className="w-3 h-3" /> {fileName}
              </span>
            )}
            {pageCount != null && pageCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                <BookOpen className="w-3 h-3" /> {pageCount} page{pageCount !== 1 ? 's' : ''}
              </span>
            )}
            {provider && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                <Bot className="w-3 h-3" /> {provider.charAt(0).toUpperCase() + provider.slice(1)}
              </span>
            )}
            {generatedAt && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                <Clock className="w-3 h-3" /> {formatDate(generatedAt)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
            {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
          </button>
          <button onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">.md</span>
          </button>
          <button onClick={onReset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" /> New Upload
          </button>
        </div>
      </div>

      {/* ── Full summary content ── */}
      <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 space-y-8"
        style={{ boxShadow: 'var(--shadow-card)' }}>

        {/* Overview */}
        {overview && (
          <p className="text-base text-foreground leading-relaxed">{overview}</p>
        )}

        {/* Key Points */}
        {keyPoints.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary">Key Points</h3>
            <ol className="space-y-2.5">
              {keyPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5"
                    style={{ background: 'var(--gradient-brand)' }}>
                    {i + 1}
                  </span>
                  <span className="text-sm text-foreground leading-relaxed">{point}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Definitions */}
        {definitions.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary">Definitions</h3>
            <ol className="space-y-2.5">
              {definitions.map((def, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mt-0.5 bg-accent text-accent-foreground">
                    {i + 1}
                  </span>
                  <span className="text-sm text-foreground leading-relaxed">{def}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Detailed Explanation */}
        {detailedExplanation && (
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary">Detailed Explanation</h3>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{detailedExplanation}</p>
          </section>
        )}

        {/* Exam Tips */}
        {examPoints.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'hsl(36 90% 45%)' }}>
              Exam Tips
            </h3>
            <ol className="space-y-2.5">
              {examPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center mt-0.5"
                    style={{ background: 'hsl(36 90% 45%)' }}>
                    {i + 1}
                  </span>
                  <span className="text-sm text-foreground leading-relaxed">{point}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Further Reading */}
        {furtherReading.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Further Reading</h3>
            <ul className="space-y-2">
              {furtherReading.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* ── What would you like to do next? ── */}
      {hasNextActions && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl overflow-hidden border border-primary/20"
          style={{ background: 'var(--gradient-glass)', backdropFilter: 'blur(16px)' }}
        >
          <div className="px-5 py-3 border-b border-border/50 flex items-center gap-2"
            style={{ background: 'hsl(var(--primary) / 0.06)' }}>
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--gradient-brand)' }} />
            <p className="text-sm font-bold text-foreground">What would you like to do next?</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5">
            {onAskQuestions && (
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                onClick={onAskQuestions}
                className="group flex items-start gap-4 p-4 rounded-xl border-2 border-border bg-card hover:border-primary/40 hover:bg-primary/[0.03] transition-all text-left"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
                  style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--shadow-brand)' }}>
                  <MessageSquare className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">Ask Questions</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Chat with your lecture — get source-backed answers
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-1 shrink-0" />
              </motion.button>
            )}

            {onTakeQuiz && (
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                onClick={onTakeQuiz}
                className="group flex items-start gap-4 p-4 rounded-xl border-2 border-border bg-card hover:border-primary/40 hover:bg-primary/[0.03] transition-all text-left"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
                  style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--shadow-brand)' }}>
                  <Brain className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">Take a Quiz</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Test yourself with an auto-generated MCQ quiz
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-1 shrink-0" />
              </motion.button>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
