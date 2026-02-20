import { useState, useRef, useCallback } from 'react';
import { uploadLectureForSummary } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, AlertCircle, Rocket, X, CheckCircle2, Sparkles } from 'lucide-react';

const MAX_FILE_SIZE_MB = 10;
const ACCEPTED_TYPE = 'application/pdf';

interface UploadLectureProps {
  onSummaryReady: (data: any) => void;
  onLoading: (v: boolean) => void;
  accessToken: string;
}

function UploadLecture({ onSummaryReady, onLoading, accessToken }: UploadLectureProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File) => {
    if (!file) return 'No file selected.';
    if (file.type !== ACCEPTED_TYPE && !file.name.toLowerCase().endsWith('.pdf')) {
      return 'Only PDF files are supported.';
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `File size must not exceed ${MAX_FILE_SIZE_MB}MB. Your file: ${(file.size / 1024 / 1024).toFixed(1)}MB`;
    }
    return null;
  };

  const handleFileChange = useCallback((file: File) => {
    setError('');
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  }, []);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileChange(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setError('Please select a PDF file before submitting.');
      return;
    }

    setLoading(true);
    setError('');
    onLoading(true);

    try {
      const summary = await uploadLectureForSummary(selectedFile, accessToken);
      onSummaryReady(summary);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
      onLoading(false);
    }
  };

  const steps = [
    { num: 1, label: 'Upload PDF', done: !!selectedFile },
    { num: 2, label: 'Generate', done: false },
    { num: 3, label: 'Review', done: false },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((step, i) => (
          <div key={step.num} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              step.done
                ? 'bg-primary text-primary-foreground'
                : step.num === 1
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'bg-muted text-muted-foreground'
            }`}>
              {step.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>{step.num}</span>}
              <span>{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 h-0.5 rounded-full transition-colors ${step.done ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Upload zone */}
      <div
        className={`relative border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden ${
          dragOver
            ? 'border-primary bg-primary/5 scale-[1.01] shadow-lg'
            : selectedFile
            ? 'border-primary/40 bg-primary/[0.03]'
            : 'border-border hover:border-primary/40 hover:bg-muted/40'
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
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-14 px-6"
            >
              <motion.div
                animate={{ y: dragOver ? -4 : 0 }}
                className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center"
              >
                <Upload className="w-8 h-8 text-primary" />
              </motion.div>
              <div className="text-center">
                <h3 className="text-lg font-semibold font-display text-foreground">
                  {dragOver ? 'Drop it right here!' : 'Drop your lecture PDF'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1.5">
                  or <span className="text-primary font-medium underline underline-offset-2">browse files</span> from your computer
                </p>
              </div>
              <div className="flex items-center gap-4 mt-1">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                  <FileText className="w-3 h-3" /> PDF only
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                  Max 10 MB
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="selected"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-4 p-5"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {(selectedFile.size / 1024).toFixed(0)} KB · Ready to process
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                  className="text-xs font-medium text-primary hover:text-accent transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/10"
                >
                  Change
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2.5 p-3.5 rounded-xl bg-destructive/10 text-destructive text-sm"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit button */}
      <motion.button
        onClick={handleSubmit}
        disabled={loading || !selectedFile}
        whileHover={!loading && selectedFile ? { scale: 1.01 } : {}}
        whileTap={!loading && selectedFile ? { scale: 0.98 } : {}}
        className="w-full py-4 rounded-xl font-semibold text-primary-foreground transition-all disabled:opacity-40 flex items-center justify-center gap-2.5 text-base"
        style={{ background: loading ? 'hsl(var(--primary) / 0.7)' : 'var(--gradient-brand)', boxShadow: selectedFile && !loading ? 'var(--shadow-brand)' : 'none' }}
      >
        {loading ? (
          <><span className="btn-spinner" /> Processing your lecture…</>
        ) : (
          <><Sparkles className="w-5 h-5" /> Generate AI Summary</>
        )}
      </motion.button>

      {/* Helpful tips */}
      {!selectedFile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          {[
            { icon: '📄', title: 'Any lecture PDF', desc: 'Slides, notes, or textbook chapters' },
            { icon: '⚡', title: 'Instant results', desc: 'AI processes in under a minute' },
            { icon: '🎯', title: 'Exam-ready', desc: 'Key concepts & definitions extracted' },
          ].map((tip) => (
            <div key={tip.title} className="flex items-start gap-3 p-3.5 rounded-xl bg-card border border-border">
              <span className="text-lg">{tip.icon}</span>
              <div>
                <p className="text-sm font-semibold text-foreground">{tip.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{tip.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

export default UploadLecture;
