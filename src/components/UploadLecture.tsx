import { useState, useRef } from 'react';
import { uploadLectureForSummary } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, AlertCircle, Rocket, X } from 'lucide-react';

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

  const handleFileChange = (file: File) => {
    setError('');
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-5"
    >
      <div
        className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
          dragOver
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : selectedFile
            ? 'border-success/50 bg-success/5'
            : 'border-border hover:border-primary/40 hover:bg-muted/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
          onClick={(e) => e.stopPropagation()}
        />

        <div className="flex flex-col items-center gap-3">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
            selectedFile ? 'bg-success/10' : 'bg-primary/10'
          }`}>
            {selectedFile ? (
              <FileText className="w-7 h-7 text-success" />
            ) : (
              <Upload className="w-7 h-7 text-primary" />
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold font-display text-foreground">
              {dragOver ? 'Drop your PDF here!' : selectedFile ? selectedFile.name : 'Drag & drop your lecture PDF'}
            </h3>
            {selectedFile ? (
              <p className="text-sm text-muted-foreground mt-1">
                {(selectedFile.size / 1024).toFixed(0)} KB · Ready to process
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mt-1">or click anywhere in this box to browse files</p>
                <p className="text-xs text-muted-foreground mt-1">PDF only · Maximum 10 MB</p>
              </>
            )}
          </div>

          {selectedFile && (
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors mt-1"
            >
              <X className="w-3 h-3" /> Remove file
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2.5 p-3.5 rounded-lg bg-destructive/10 text-destructive text-sm"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={handleSubmit}
        disabled={loading || !selectedFile}
        className="w-full py-3.5 rounded-lg font-semibold text-primary-foreground transition-all disabled:opacity-40 hover:shadow-lg flex items-center justify-center gap-2"
        style={{ background: loading ? 'hsl(var(--primary) / 0.7)' : 'var(--gradient-brand)' }}
      >
        {loading ? (
          <><span className="btn-spinner" /> Processing…</>
        ) : (
          <><Rocket className="w-4 h-4" /> Generate Summary</>
        )}
      </button>
    </motion.div>
  );
}

export default UploadLecture;
