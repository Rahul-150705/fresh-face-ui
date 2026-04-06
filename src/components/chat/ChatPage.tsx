import { useState, useRef, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Menu } from 'lucide-react';
import { ACTIVE_MODEL } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { useSummaryStream } from '../../hooks/useSummaryStream';
import { useQaStream } from '../../hooks/useQaStream';
import {
  processLectureByMode, getLectureHistory, getLecture,
  type LectureHistoryItem,
} from '../../services/api';
import type { ChatMessage } from './ChatMessageBubble';
import ChatSidebar, { type Conversation } from './ChatSidebar';
import ChatMessages from './ChatMessages';
import ChatInputBar from './ChatInputBar';
import ChatEmptyState from './ChatEmptyState';

let msgCounter = 0;
const nextId = () => `msg-${++msgCounter}-${Date.now()}`;

export default function ChatPage() {
  const { user, accessToken } = useAuth();

  // Sidebar
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);

  // Messages for current conversation (summary/upload messages only)
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Current lecture context
  const [currentLectureId, setCurrentLectureId] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState('');

  // Summary streaming hook
  const summaryStream = useSummaryStream(currentLectureId, accessToken);

  // Q&A streaming hook — replaces the old blocking askQuestion call
  const qaStream = useQaStream(currentLectureId, accessToken);

  // Track current streaming AI summary message
  const aiMsgIdRef = useRef<string | null>(null);
  const hasAutoTriggeredRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentConvIdRef = useRef<string | null>(null);
  const pendingUploadMode = useRef<'chat' | 'summary'>('chat');

  // Keep ref in sync
  useEffect(() => { currentConvIdRef.current = activeConvId; }, [activeConvId]);

  // Load lecture history as initial conversations
  useEffect(() => {
    if (!accessToken) return;
    getLectureHistory(accessToken).then(items => {
      const convs: Conversation[] = items.map(item => ({
        id: `lecture-${item.id}`,
        title: item.fileName,
        lectureId: item.id,
        type: 'lecture' as const,
        createdAt: new Date(item.processedAt),
      }));
      setConversations(prev => {
        const chatConvs = prev.filter(c => c.type === 'chat');
        return [...chatConvs, ...convs].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      });
    }).catch(() => { });
  }, [accessToken]);

  // Reset auto-trigger guard when lecture changes
  useEffect(() => { hasAutoTriggeredRef.current = false; }, [currentLectureId]);

  // Auto-trigger summary stream once WebSocket connects
  useEffect(() => {
    if (currentLectureId && summaryStream.isConnected && !hasAutoTriggeredRef.current && aiMsgIdRef.current) {
      hasAutoTriggeredRef.current = true;
      summaryStream.triggerStream();
    }
  }, [currentLectureId, summaryStream.isConnected, summaryStream.triggerStream]);

  // Update AI summary message as chunks arrive
  useEffect(() => {
    if (!aiMsgIdRef.current) return;
    setMessages(prev =>
      prev.map(m =>
        m.id === aiMsgIdRef.current
          ? { ...m, content: summaryStream.summary, isStreaming: summaryStream.isStreaming }
          : m
      )
    );
  }, [summaryStream.summary, summaryStream.isStreaming]);

  // Handle summary completion
  useEffect(() => {
    if (summaryStream.isComplete && aiMsgIdRef.current) {
      setMessages(prev =>
        prev.map(m =>
          m.id === aiMsgIdRef.current
            ? { ...m, isStreaming: false }
            : m
        )
      );
    }
  }, [summaryStream.isComplete]);

  // Handle summary error
  useEffect(() => {
    if (summaryStream.error && aiMsgIdRef.current) {
      setMessages(prev =>
        prev.map(m =>
          m.id === aiMsgIdRef.current
            ? { ...m, content: summaryStream.error!, type: 'error' as const, isStreaming: false }
            : m
        )
      );
    }
  }, [summaryStream.error]);

  // ── New Chat ──
  const handleNewChat = useCallback(() => {
    setActiveConvId(null);
    setMessages([]);
    setCurrentLectureId(null);
    setCurrentFileName('');
    aiMsgIdRef.current = null;
    qaStream.clearMessages();
  }, [qaStream]);

  // ── Select Conversation ──
  const handleSelectConversation = useCallback(async (conv: Conversation) => {
    setActiveConvId(conv.id);
    qaStream.clearMessages();

    if (conv.lectureId && accessToken) {
      try {
        const lecture = await getLecture(conv.lectureId, accessToken);
        setCurrentLectureId(conv.lectureId);
        setCurrentFileName(lecture.fileName || conv.title);

        const chatMsgs: ChatMessage[] = [];

        chatMsgs.push({
          id: nextId(),
          role: 'user',
          type: 'file_upload',
          content: '',
          fileName: lecture.fileName || conv.title,
          fileSize: 0,
          pageCount: lecture.pageCount,
          timestamp: new Date(lecture.processedAt || Date.now()),
        });

        const summaryText = lecture.summary
          ? (typeof lecture.summary === 'string'
            ? lecture.summary
            : JSON.stringify(lecture.summary, null, 2))
          : 'Summary not available for this lecture.';

        chatMsgs.push({
          id: nextId(),
          role: 'assistant',
          type: 'summary_stream',
          content: summaryText,
          isStreaming: false,
          timestamp: new Date(lecture.processedAt || Date.now()),
        });

        setMessages(chatMsgs);
      } catch {
        setMessages([{
          id: nextId(),
          role: 'assistant',
          type: 'error',
          content: 'Failed to load lecture summary. Please try again.',
          isStreaming: false,
          timestamp: new Date(),
        }]);
      }
    } else {
      setCurrentLectureId(null);
      setCurrentFileName('');
    }
  }, [accessToken, qaStream]);

  // ── Delete Conversation ──
  const handleDeleteConversation = useCallback((id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConvId === id) handleNewChat();
  }, [activeConvId, handleNewChat]);

  // ── Send Text Message — uses streaming Q&A hook ──
  const handleSendMessage = useCallback((text: string) => {
    if (!accessToken || !currentLectureId) return;
    qaStream.askQuestion(text);
  }, [accessToken, currentLectureId, qaStream]);

  // ── File Upload ──
  const handleFileSelect = useCallback(async (file: File) => {
    if (!accessToken) return;

    const mode = pendingUploadMode.current;

    const userMsg: ChatMessage = {
      id: nextId(), role: 'user', type: 'file_upload', content: '',
      fileName: file.name, fileSize: file.size, timestamp: new Date(),
    };

    const aiId = nextId();
    aiMsgIdRef.current = mode === 'summary' ? aiId : null;

    const aiMsg: ChatMessage = {
      id: aiId,
      role: 'assistant',
      type: mode === 'summary' ? 'summary_stream' : 'text',
      content: mode === 'summary' ? '' : "I've successfully processed your PDF! Feel free to ask me any questions about it.",
      isStreaming: mode === 'summary',
      timestamp: new Date(),
    };

    // Clear previous Q&A messages when a new file is uploaded
    qaStream.clearMessages();
    setMessages([userMsg, aiMsg]);

    const convId = `lecture-upload-${Date.now()}`;
    const conv: Conversation = {
      id: convId,
      title: file.name,
      type: 'lecture',
      createdAt: new Date(),
    };
    setConversations(prev => [conv, ...prev]);
    setActiveConvId(convId);

    try {
      const data = await processLectureByMode(file, 'chat', accessToken);
      setCurrentLectureId(data.lectureId);
      setCurrentFileName(data.fileName || file.name);

      setConversations(prev =>
        prev.map(c => c.id === convId ? { ...c, lectureId: data.lectureId } : c)
      );

      setMessages(prev =>
        prev.map(m =>
          m.id === userMsg.id
            ? { ...m, pageCount: data.pageCount }
            : m
        )
      );
    } catch (err: any) {
      setMessages(prev =>
        prev.map(m =>
          m.id === aiId
            ? { ...m, content: err.message || 'Upload failed.', type: 'error' as const, isStreaming: false }
            : m
        )
      );
      aiMsgIdRef.current = null;
    }
  }, [accessToken, qaStream]);

  // Merge summary messages + Q&A streaming messages for display
  const qaMessages: ChatMessage[] = qaStream.messages.map(m => ({
    id: m.id,
    role: m.role,
    type: 'text' as const,
    content: m.content,
    isStreaming: m.isStreaming,
    sourceChunks: m.sourceChunks,
    chunksUsed: m.chunksUsed,
    timestamp: m.timestamp,
  }));

  const allMessages = [...messages, ...qaMessages];

  const isCurrentlyStreaming = summaryStream.isStreaming;
  const isAnswering = qaStream.isStreaming;

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
      />

      {/* Sidebar */}
      <ChatSidebar
        conversations={conversations}
        activeConversationId={activeConvId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(v => !v)}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-border/50 shrink-0 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {sidebarCollapsed && (
              <button onClick={() => setSidebarCollapsed(false)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors lg:hidden">
                <Menu className="w-4 h-4" />
              </button>
            )}
            <span className="text-sm font-semibold text-foreground">
              {currentFileName || 'New Chat'}
            </span>
          </div>
          <span className="text-[11px] font-medium text-muted-foreground px-2.5 py-1 rounded-full bg-muted">
            {ACTIVE_MODEL}
          </span>
        </div>

        {/* Messages or empty state */}
        {allMessages.length === 0 ? (
          <ChatEmptyState
            onUploadClick={(mode) => {
              pendingUploadMode.current = mode;
              fileInputRef.current?.click();
            }}
            userName={user?.fullName}
          />
        ) : (
          <ChatMessages
            messages={allMessages}
            isStreaming={isCurrentlyStreaming}
            isAnswering={isAnswering}
            streamingContent={summaryStream.summary}
          />
        )}

        {/* Input bar */}
        <ChatInputBar
          onSendMessage={handleSendMessage}
          onFileSelect={(file) => {
            pendingUploadMode.current = 'chat';
            handleFileSelect(file);
          }}
          disabled={!currentLectureId || (pendingUploadMode.current === 'summary' && !summaryStream.isComplete && !summaryStream.summary)}
          isStreaming={isCurrentlyStreaming}
          isAnswering={isAnswering}
          hasLecture={!!currentLectureId && (pendingUploadMode.current === 'chat' || summaryStream.isComplete || !!summaryStream.summary)}
        />
      </div>
    </div>
  );
}