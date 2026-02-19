import { motion } from 'framer-motion';
import { Lightbulb, BookOpen, Target, FileText, BookMarked, Clock, Bot, ArrowLeft } from 'lucide-react';

interface SummaryData {
  title: string;
  keyPoints?: string[];
  definitions?: string[];
  examPoints?: string[];
  fileName?: string;
  provider?: string;
  generatedAt?: string;
  pageCount?: number;
}

interface SummaryViewProps {
  summary: SummaryData;
  onReset: () => void;
}

function SummaryView({ summary, onReset }: SummaryViewProps) {
  const { title, keyPoints = [], definitions = [], examPoints = [], fileName, provider, generatedAt, pageCount } = summary;

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return isoString; }
  };

  const cards = [
    { title: 'Key Concepts', icon: Lightbulb, items: keyPoints, color: 'text-primary', bg: 'bg-primary/10', bullet: 'bg-primary' },
    { title: 'Important Definitions', icon: BookOpen, items: definitions, color: 'text-warning', bg: 'bg-warning/10', bullet: 'bg-warning' },
    { title: 'Exam-Focused Takeaways', icon: Target, items: examPoints, color: 'text-success', bg: 'bg-success/10', bullet: 'bg-success' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-3">
          <h2 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
            <BookMarked className="w-6 h-6 text-primary" />
            {title}
          </h2>
          <div className="flex flex-wrap gap-2">
            {fileName && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                <FileText className="w-3 h-3" /> {fileName}
              </span>
            )}
            {pageCount && pageCount > 0 && (
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
        <button
          onClick={onReset}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> New Upload
        </button>
      </div>

      {/* Cards */}
      <div className="grid gap-5">
        {cards.map(({ title: cardTitle, icon: Icon, items, color, bg, bullet }, idx) => (
          <motion.div
            key={cardTitle}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.1 }}
            className="bg-card rounded-xl border border-border overflow-hidden"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <div className={`flex items-center gap-3 px-5 py-3.5 border-b border-border ${bg}`}>
              <Icon className={`w-5 h-5 ${color}`} />
              <span className={`font-semibold font-display ${color}`}>{cardTitle}</span>
              {items.length > 0 && (
                <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-foreground/10 text-foreground">
                  {items.length}
                </span>
              )}
            </div>
            <div className="p-5">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No items extracted.</p>
              ) : (
                <ul className="space-y-3">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className={`shrink-0 w-6 h-6 rounded-full ${bullet} text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5`}>
                        {i + 1}
                      </span>
                      <span className="text-sm text-card-foreground leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export default SummaryView;
