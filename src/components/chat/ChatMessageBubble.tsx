import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  FileText, ChevronDown, ChevronUp,
  Copy, Check, Loader2, Bot, Zap
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  type: 'text' | 'file_upload' | 'summary_stream' | 'error';
  content: string;
  isStreaming?: boolean;
  isCached?: boolean;
  isUploading?: boolean;
  fileName?: string;
  fileSize?: number;
  pageCount?: number;
  sourceChunks?: string[];
  chunksUsed?: number;
  timestamp: Date;
}

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

const formatSize = (bytes: number) => {
  const mb = bytes / (1024 * 1024);
  return mb < 1 ? '<1 MB' : `${mb.toFixed(1)} MB`;
};

export default function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const [showSources, setShowSources] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUser = message.role === 'user';

  // ----------------------------------------------------
  // USER: FILE UPLOAD
  // ----------------------------------------------------
  if (message.type === 'file_upload') {
    return (
      <div className="w-full flex justify-end mb-6">
        <div className="max-w-[85%] md:max-w-[70%]">
          <div className="bg-[#1e1f20] border border-[#333537] rounded-3xl p-4 flex gap-4 items-center">
            <div className="w-12 h-12 rounded-xl bg-[#282a2c] flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-[#a8c7fa]" />
            </div>
            <div className="min-w-0 pr-4">
              <p className="text-[15px] font-medium text-[#e3e3e3] truncate">
                {message.fileName}
              </p>
              <div className="flex items-center gap-2 mt-1 text-[13px] text-[#c4c7c5]">
                {message.isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing PDF...</span>
                  </>
                ) : (
                  <span>
                    {message.fileSize ? formatSize(message.fileSize) : 'PDF Document'}
                    {message.pageCount && ` • ${message.pageCount} pages`}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // AI: ERROR
  // ----------------------------------------------------
  if (message.type === 'error') {
    return (
      <div className="w-full flex justify-start mb-6">
        <div className="max-w-[85%] md:max-w-[75%] flex gap-4">
          <div className="w-8 h-8 rounded-full bg-[#1e1f20] flex items-center justify-center shrink-0 mt-1">
            <Bot className="w-5 h-5 text-[#ff8f8f]" />
          </div>
          <div className="bg-[#5a1e1e] text-[#ffb4b4] rounded-2xl px-5 py-3">
            <p className="text-[15px]">{message.content}</p>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // NORMAL MESSAGES
  // ----------------------------------------------------
  return (
    <div className={`w-full flex mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] md:max-w-[75%] flex ${isUser ? 'flex-row-reverse' : 'gap-4'}`}>
        
        {/* Gemini-style AI Avatar */}
        {!isUser && (
          <div className="w-8 h-8 flex-shrink-0 mt-1">
             <div className="w-full h-full rounded-full flex items-center justify-center border border-[#333537] bg-opacity-20">
               <Bot className="w-5 h-5 text-[#a8c7fa]" />
             </div>
          </div>
        )}

        {/* Bubble / Content Container */}
        <div className={`
          ${isUser 
            ? 'bg-[#1e1f20] text-[#e3e3e3] rounded-[24px] rounded-tr-sm px-5 py-3'
            : 'text-[#e3e3e3] py-1' // AI text has no background in Gemini style
          }
        `}>
          
          {/* Cache Badge */}
          {message.isCached && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-3 rounded-full border border-yellow-500/20 bg-yellow-500/10 text-yellow-500 text-[11px] font-semibold tracking-wide uppercase">
                 <Zap className="w-3.5 h-3.5" />
                 Instant Answer
              </div>
          )}

          <div className="prose-chat w-full break-words">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>

            {/* Blinking Cursor for Streaming */}
            {message.isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-[#c4c7c5] max-h-full -mb-0.5 ml-1 animate-[pulse_1s_ease-in-out_infinite]" />
            )}
          </div>

          {/* AI Message Footer Tools (Sources, Copy) */}
          {!isUser && !message.isStreaming && (
             <div className="flex items-center gap-3 mt-4 text-[#c4c7c5]">
               <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-[13px] hover:text-[#e3e3e3] transition-colors"
                  title="Copy to clipboard"
               >
                 {copied ? <Check className="w-4 h-4 text-[#a8c7fa]" /> : <Copy className="w-4 h-4" />}
               </button>

               {/* Source chunks dropdown */}
               {message.sourceChunks && message.sourceChunks.length > 0 && (
                 <button
                   onClick={() => setShowSources(!showSources)}
                   className="flex items-center gap-1.5 text-[13px] hover:text-[#e3e3e3] transition-colors ml-2"
                 >
                   <span>{message.sourceChunks.length} sources</span>
                   {showSources ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                 </button>
               )}
             </div>
          )}

          {/* Source Chunks Expansion */}
          {!isUser && showSources && message.sourceChunks && message.sourceChunks.length > 0 && (
            <div className="mt-3 pt-3 space-y-3">
              <p className="text-[12px] font-medium text-[#c4c7c5] uppercase tracking-wide">
                Grounding Sources
              </p>
              {message.sourceChunks.map((chunk, i) => (
                <div key={i} className="bg-[#1e1f20] rounded-xl p-3 text-[13px] border border-[#333537] text-[#e3e3e3]">
                   <p className="leading-relaxed break-words">{chunk}</p>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
