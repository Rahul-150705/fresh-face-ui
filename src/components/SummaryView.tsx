import { useState } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  Lightbulb, BookOpen, Target, FileText, BookMarked, Clock, Bot,
  ArrowLeft, Copy, Download, Check, ChevronDown, ChevronUp,
  ScrollText, BookA, GraduationCap, ExternalLink
} from 'lucide-react';

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
}

function SummaryView({ summary, onReset, onTakeQuiz }: SummaryViewProps) {
  const {
    title, overview, keyPoints = [], definitions = [], examPoints = [],
    detailedExplanation, furtherReading = [], markdownSummary,
    fileName, provider, generatedAt, pageCount
  } = summary;

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'cards' | 'markdown'>('cards');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true, keyPoints: true, definitions: true,
    detailed: false, examPoints: true, furtherReading: true
  });

  const toggleSection = (key: string) =>
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return isoString; }
  };

  const handleCopy = async () => {
    if (!markdownSummary) return;
    await navigator.clipboard.writeText(markdownSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!markdownSummary) return;
    const blob = new Blob([markdownSummary], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(title || 'summary').replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SectionCard = ({ sectionKey, icon: Icon, label, colorClass, bgClass, bulletClass, colorStyle, bgStyle, bulletStyle, children }: {
    sectionKey: string; icon: any; label: string;
    colorClass?: string; bgClass?: string; bulletClass?: string;
    colorStyle?: string; bgStyle?: string; bulletStyle?: string;
    children: React.ReactNode;
  }) => {
    const isOpen = expandedSections[sectionKey];
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border border-border overflow-hidden"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <button
          onClick={() => toggleSection(sectionKey)}
          className={`w-full flex items-center gap-3 px-5 py-3.5 border-b border-border text-left transition-colors hover:bg-muted/30 ${bgClass || ''}`}
          style={bgStyle ? { background: bgStyle } : undefined}
        >
          <Icon className={`w-5 h-5 shrink-0 ${colorClass || ''}`} style={colorStyle ? { color: colorStyle } : undefined} />
          <span className={`font-semibold font-display flex-1 ${colorClass || ''}`} style={colorStyle ? { color: colorStyle } : undefined}>{label}</span>
          {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {isOpen && <div className="p-5">{children}</div>}
      </motion.div>
    );
  };

  const BulletList = ({ items, bulletClass, bulletStyle }: { items: string[]; bulletClass?: string; bulletStyle?: string }) => (
    items.length === 0
      ? <p className="text-sm text-muted-foreground italic">No items extracted.</p>
      : <ul className="space-y-3">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className={`shrink-0 w-6 h-6 rounded-full text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5 ${bulletClass || ''}`}
                style={bulletStyle ? { background: bulletStyle } : undefined}
              >
                {i + 1}
              </span>
              <span className="text-sm text-card-foreground leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-3 min-w-0 flex-1">
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
          {markdownSummary && (
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
            <ArrowLeft className="w-4 h-4" /> New Upload
          </button>
          {onTakeQuiz && (
            <button
              onClick={onTakeQuiz}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground transition-opacity"
              style={{ background: 'var(--gradient-brand)' }}
            >
              <Target className="w-4 h-4" /> Take Quiz
            </button>
          )}
        </div>
      </div>

      {/* Tab switcher */}
      {markdownSummary && (
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('cards')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'cards' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Cards View
          </button>
          <button
            onClick={() => setActiveTab('markdown')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'markdown' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Markdown
          </button>
        </div>
      )}

      {activeTab === 'markdown' && markdownSummary ? (
        <div className="bg-card rounded-xl border border-border p-6 max-h-[70vh] overflow-y-auto prose prose-sm prose-headings:font-display prose-headings:text-foreground prose-p:text-card-foreground prose-li:text-card-foreground prose-strong:text-foreground prose-a:text-primary max-w-none">
          <ReactMarkdown>{markdownSummary}</ReactMarkdown>
        </div>
      ) : (
        <div className="grid gap-5 max-h-[70vh] overflow-y-auto pr-1">
          {/* Overview */}
          {overview && (
            <SectionCard sectionKey="overview" icon={ScrollText} label="Overview" colorClass="text-primary" bgClass="bg-primary/10">
              <p className="text-sm text-card-foreground leading-relaxed">{overview}</p>
            </SectionCard>
          )}

          {/* Key Concepts */}
          <SectionCard sectionKey="keyPoints" icon={Lightbulb} label="Key Concepts" colorClass="text-primary" bgClass="bg-primary/10" bulletClass="bg-primary">
            <BulletList items={keyPoints} bulletClass="bg-primary" />
          </SectionCard>

          {/* Definitions */}
          <SectionCard sectionKey="definitions" icon={BookA} label="Definitions" colorClass="text-accent" bgClass="bg-accent/10" bulletClass="bg-accent">
            <BulletList items={definitions} bulletClass="bg-accent" />
          </SectionCard>

          {/* Detailed Explanation */}
          {detailedExplanation && (
            <SectionCard sectionKey="detailed" icon={BookOpen} label="Detailed Explanation" colorClass="text-primary" bgClass="bg-primary/5">
              <div className="text-sm text-card-foreground leading-relaxed whitespace-pre-line">{detailedExplanation}</div>
            </SectionCard>
          )}

          {/* Exam Takeaways */}
          <SectionCard
            sectionKey="examPoints" icon={Target} label="Exam-Focused Takeaways"
            colorStyle="hsl(36 90% 45%)" bgStyle="hsla(36, 90%, 45%, 0.1)" bulletStyle="hsl(36 90% 45%)"
          >
            <BulletList items={examPoints} bulletStyle="hsl(36 90% 45%)" />
          </SectionCard>

          {/* Further Reading */}
          {furtherReading.length > 0 && (
            <SectionCard sectionKey="furtherReading" icon={ExternalLink} label="Further Reading" colorClass="text-muted-foreground" bgClass="bg-muted/50">
              <ul className="space-y-2">
                {furtherReading.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-card-foreground">
                    <GraduationCap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default SummaryView;
