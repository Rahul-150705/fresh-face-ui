import { useState, useRef, useCallback, useEffect } from 'react';
import { Paperclip, ArrowUp, Square, Loader2 } from 'lucide-react';

interface ChatInputBarProps {
  onSendMessage: (text: string) => void;
  onFileSelect: (file: File) => void;
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  isAnswering?: boolean;
  hasLecture?: boolean;
}

const MAX_MB = 10;
const PLACEHOLDERS = [
  "Enter a prompt here",
  "Chat with your PDF",
  "Summarize this document"
];

export default function ChatInputBar({
  onSendMessage,
  onFileSelect,
  onStop,
  disabled,
  isStreaming,
  isAnswering,
}: ChatInputBarProps) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [displayPlaceholder, setDisplayPlaceholder] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (focused || text.length > 0 || isStreaming || isAnswering) {
      if (!isStreaming && !isAnswering) {
        setDisplayPlaceholder('');
      } else {
        setDisplayPlaceholder(isStreaming ? 'Generating…' : isAnswering ? 'Thinking…' : '');
      }
      return;
    }

    const currentText = PLACEHOLDERS[placeholderIndex];
    let timeout: NodeJS.Timeout;

    if (!isDeleting) {
      if (displayPlaceholder.length < currentText.length) {
        timeout = setTimeout(() => {
          setDisplayPlaceholder(currentText.slice(0, displayPlaceholder.length + 1));
        }, 70);
      } else {
        timeout = setTimeout(() => setIsDeleting(true), 1500);
      }
    } else {
      if (displayPlaceholder.length > 0) {
        timeout = setTimeout(() => {
          setDisplayPlaceholder(currentText.slice(0, displayPlaceholder.length - 1));
        }, 40);
      } else {
        setIsDeleting(false);
        setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayPlaceholder, isDeleting, placeholderIndex, focused, text, isStreaming, isAnswering]);

  const canSend = text.trim().length > 0 && !disabled && !isStreaming && !isAnswering;
  const showStop = isStreaming && !!onStop;

  const handleSubmit = useCallback(() => {
    if (!canSend) return;
    onSendMessage(text.trim());
    setText('');
  }, [canSend, text, onSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return;
    if (file.size > MAX_MB * 1024 * 1024) return;
    onFileSelect(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="shrink-0 pb-6 w-full">
      <div className="w-full relative">
        <div
           className={`relative flex items-end gap-2 rounded-3xl transition-all duration-200 bg-[#1e1f20] ${focused ? 'bg-[#282a2c]' : ''}`}
           style={{ minHeight: '56px' }}
        >
          {/* File upload */}
          <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleFileChange} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={isStreaming || isAnswering}
            className="p-[14px] ml-1 text-[#c4c7c5] hover:text-[#e3e3e3] transition-colors disabled:opacity-40 shrink-0"
            title="Upload PDF"
          >
            <Paperclip className="w-6 h-6" />
          </button>

          {/* Textarea */}
          <div className="flex-1 relative py-4">
             {text.length === 0 && !focused && (
               <div className="absolute left-0 top-4 pointer-events-none text-[#c4c7c5] text-[16px] whitespace-nowrap overflow-hidden">
                 {displayPlaceholder}
               </div>
             )}
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              disabled={disabled || isStreaming || isAnswering}
              rows={1}
              className="w-full resize-none bg-transparent text-[16px] text-[#e3e3e3] focus:outline-none disabled:cursor-auto max-h-[200px] custom-scrollbar block"
              style={{ minHeight: '24px', lineHeight: '24px' }}
              onInput={e => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = Math.min(el.scrollHeight, 200) + 'px';
              }}
            />
          </div>

          {/* Send / Stop */}
          <div className="p-2 shrink-0 mr-1 flex items-center justify-center">
            {showStop ? (
               <button
                 onClick={onStop!}
                 className="w-10 h-10 rounded-full bg-[#1e1f20] text-[#e3e3e3] hover:bg-[#333537] flex items-center justify-center transition-colors"
                 title="Stop"
               >
                 <Square className="w-[18px] h-[18px] fill-current" />
               </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canSend}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                  canSend 
                    ? 'bg-[#e3e3e3] text-[#131314] hover:bg-white' 
                    : 'bg-[#1e1f20] text-[#444746]'
                }`}
              >
                {isAnswering ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ArrowUp className="w-5 h-5" />
                )}
              </button>
            )}
          </div>
        </div>

        <p className="text-[12px] text-[#c4c7c5] text-center mt-3 font-normal">
          LearnAI may display inaccurate info, so double-check its responses.
        </p>
      </div>
    </div>
  );
}
